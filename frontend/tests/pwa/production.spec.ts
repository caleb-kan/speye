import { test, expect, type Page } from '@playwright/test'
import { Buffer } from 'node:buffer'

const api = 'http://127.0.0.1:54323'
const authKey = 'sb-localhost-auth-token'

function session(id: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const expires = Math.floor(Date.now() / 1000) + 3600
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${id}@example.test`,
    user_metadata: { username: id },
  }
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...user, sub: id, exp: expires })}.ZmFrZQ`,
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_at: expires,
    expires_in: 3600,
    user,
  }
}

function operation(userId: string | undefined, textId = 'public-text') {
  return {
    id: `${userId}-${textId}`,
    userId,
    type: 'logUserActivity',
    payload: {
      textId,
      wpm: 250,
      startTime: '2026-09-16T08:00:00Z',
      mode: 'standard',
      progressIndex: 25,
    },
    timestamp: Date.now(),
    retryCount: 0,
  }
}

async function signIn(page: Page, userId = 'reader-a') {
  await page.goto('/terms')
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: authKey, value: session(userId) }
  )
  await page.reload()
}

async function workerReady(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
}

async function activeWorkerVersion(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return new Promise<number>((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => resolve(event.data)
      registration.active!.postMessage('test-version', [channel.port2])
    })
  })
}

async function forceOffline(page: Page) {
  await page.goto('/settings')
  const toggle = page.locator('#offline-cache button[aria-checked]')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
}

test.beforeEach(async ({ request }) => {
  await request.post(`${api}/__test/reset`)
})

test('live account changes immediately clear another account notification toast', async ({
  page,
  context,
  request,
}) => {
  await request.post(`${api}/__test/notifications`)
  await signIn(page)
  await expect(
    page.getByTestId('notification-toast-private-toast')
  ).toBeVisible()
  const other = await context.newPage()
  await other.goto('/terms')
  await other.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
      const channel = new BroadcastChannel(key)
      channel.postMessage({ event: 'SIGNED_IN', session: value })
      channel.close()
    },
    { key: authKey, value: session('reader-b') }
  )
  await expect(
    page.getByRole('img', { name: 'Avatar for reader-b' })
  ).toBeVisible()
  // Assert before the ordinary five-second toast auto-dismiss could hide a leak.
  await expect(
    page.getByTestId('notification-toast-private-toast')
  ).not.toBeVisible({ timeout: 1000 })
})

test('production shell, new tabs, reading content and dynamic assets survive real network loss', async ({
  page,
  context,
}) => {
  await signIn(page)
  await page.goto('/home')
  await expect(
    page.getByText('Offline reading sample', { exact: true })
  ).toBeVisible()
  await workerReady(page)
  await context.setOffline(true)
  await page.reload()
  await expect(
    page.getByText('Offline reading sample', { exact: true })
  ).toBeVisible()
  await page.goto('/privacy')
  await expect(
    page.getByRole('heading', { name: 'Privacy Policy' })
  ).toBeVisible()
  const tab = await context.newPage()
  await tab.goto('/settings')
  await expect(tab.locator('#offline-cache')).toBeVisible()
  expect(await tab.evaluate(() => navigator.onLine)).toBe(false)
  const loadedAssets = await page.evaluate(async () => {
    const names = await caches.keys()
    const precache = await caches.open(
      names.find((name) => name.includes('precache'))!
    )
    const scripts = (await precache.keys()).filter((request) =>
      /\/assets\/.*\.js/.test(request.url)
    )
    const statuses = await Promise.all(
      scripts.map(async (request) => (await fetch(request.url)).status)
    )
    const dynamic = scripts.find((request) =>
      /\/assets\/src-/.test(request.url)
    )!
    await import(/* @vite-ignore */ dynamic.url)
    return { statuses, dynamic: dynamic.url }
  })
  expect(loadedAssets.statuses.length).toBeGreaterThan(1)
  expect(loadedAssets.statuses.every((status) => status === 200)).toBe(true)
})

test('service worker never caches private REST responses', async ({
  page,
  context,
}) => {
  await page.goto('/terms')
  await workerReady(page)
  await page.evaluate(() =>
    fetch('http://localhost:54323/rest/v1/users').then((response) =>
      response.json()
    )
  )
  await context.setOffline(true)
  expect(
    await page.evaluate(() =>
      fetch('http://localhost:54323/rest/v1/users').then(
        () => true,
        () => false
      )
    )
  ).toBe(false)
})

test('model runtime cache serves previously fetched model bytes offline without using a camera', async ({
  page,
  context,
}) => {
  const model =
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/regression-model.bin'
  await context.route(model, (route) =>
    route.fulfill({
      body: 'local-model-fixture',
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  )
  await page.goto('/terms')
  await workerReady(page)
  expect(
    await page.evaluate(
      (url) => fetch(url).then((response) => response.text()),
      model
    )
  ).toBe('local-model-fixture')
  await expect
    .poll(() =>
      page.evaluate(
        async (url) => !!(await (await caches.open('tf-models')).match(url)),
        model
      )
    )
    .toBe(true)
  await context.unroute(model)
  await context.setOffline(true)
  expect(
    await page.evaluate(
      (url) => fetch(url).then((response) => response.text()),
      model
    )
  ).toBe('local-model-fixture')
})

test('updates wait for existing tabs and activate after all old clients close', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/terms')
  await workerReady(page)
  expect(await activeWorkerVersion(page)).toBe(1)
  const nextWorkerStarted = context.waitForEvent('serviceworker')
  await request.post(`${api}/__test/update-worker`)
  await page.evaluate(async () =>
    (await navigator.serviceWorker.ready).update()
  )
  const nextWorker = await nextWorkerStarted
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.ready).waiting?.state
      )
    )
    .toBe('installed')
  expect(await activeWorkerVersion(page)).toBe(1)
  await page.reload()
  expect(await activeWorkerVersion(page)).toBe(1)
  await page.close()
  // Closing a page and removing its service worker client are asynchronous.
  // Keep zero page clients until activation completes, as a real app shutdown does.
  await expect
    .poll(() =>
      nextWorker.evaluate(() => {
        const { registration } = globalThis as typeof globalThis & {
          registration: ServiceWorkerRegistration
        }
        return (
          registration.waiting === null &&
          registration.active?.state === 'activated'
        )
      })
    )
    .toBe(true)
  const replacement = await context.newPage()
  await replacement.goto('/terms')
  await expect.poll(() => activeWorkerVersion(replacement)).toBe(2)
  await expect(
    replacement.getByRole('heading', { name: 'Terms of Service' })
  ).toBeVisible()
})

test('recovery syncs only the current account and drops foreign or legacy unload work', async ({
  page,
  request,
}) => {
  await signIn(page)
  await forceOffline(page)
  const records = [
    operation('reader-a', 'private-a'),
    operation(undefined, 'legacy'),
    operation('reader-b'),
  ]
  await page.evaluate(
    (entries) =>
      localStorage.setItem('speye-unload-queue', JSON.stringify(entries)),
    records
  )
  // Model a persisted session replaced by a different authenticated account.
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: authKey, value: session('reader-b') }
  )
  await page.reload()
  await page.locator('#offline-cache button[aria-checked]').click()
  const getWrites = async () =>
    (await (await request.get(`${api}/__test/state`)).json()).writes
  await expect.poll(getWrites).toEqual([
    expect.objectContaining({
      authenticatedUser: 'reader-b',
      body: expect.objectContaining({
        user_id: 'reader-b',
        text_id: 'public-text',
      }),
    }),
  ])
  expect(
    await page.evaluate(() => localStorage.getItem('speye-unload-queue'))
  ).toBeNull()
})

test('logout removes pending unload work and persisted offline content', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/home')
  await expect(
    page.getByText('Offline reading sample', { exact: true })
  ).toBeVisible()
  await forceOffline(page)
  await page.evaluate(
    (entry) =>
      localStorage.setItem('speye-unload-queue', JSON.stringify([entry])),
    operation('reader-a')
  )
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), authKey))
    .toBeNull()
  expect(
    await page.evaluate(() => localStorage.getItem('speye-unload-queue'))
  ).toBeNull()
  await page.goto('/home')
  await expect(
    page.getByRole('heading', { name: 'No texts available' })
  ).toBeVisible()
})

test('two tabs reconnecting replay each saved activity only once', async ({
  page,
  context,
  request,
}) => {
  await signIn(page)
  await forceOffline(page)
  await page.evaluate(async (entry) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('speye-offline')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('operation-queue', 'readwrite')
      transaction.objectStore('operation-queue').put(entry, entry.id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  }, operation('reader-a'))
  const other = await context.newPage()
  await other.goto('/settings')
  await expect(
    other.locator('#offline-cache button[aria-checked]')
  ).toHaveAttribute('aria-checked', 'true')
  await Promise.all([
    page.locator('#offline-cache button[aria-checked]').click(),
    other.locator('#offline-cache button[aria-checked]').click(),
  ])
  const getWrites = async () =>
    (await (await request.get(`${api}/__test/state`)).json()).writes
  await expect.poll(getWrites).toHaveLength(1)
  await Promise.all([
    page
      .locator('#offline-cache')
      .getByRole('button', { name: /sync now/i })
      .click(),
    other
      .locator('#offline-cache')
      .getByRole('button', { name: /sync now/i })
      .click(),
  ])
  expect(await getWrites()).toHaveLength(1)
})

for (const change of ['reload', 'cross-tab event'] as const) {
  test(`private reading history state is hidden after an account change through ${change}`, async ({
    page,
    context,
  }) => {
    await signIn(page)
    await page.goto('/library')
    await expect(
      page.getByRole('heading', { name: 'Reader A confidential draft' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Read text', exact: true }).click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(
      page.getByText('Reader A confidential draft', { exact: true })
    ).toBeVisible()
    // History state survives both reload and external auth replacement, without
    // calling this app's explicit sign-out cleanup.
    if (change === 'reload') {
      await page.evaluate(
        ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: authKey, value: session('reader-b') }
      )
      await page.reload()
    } else {
      const other = await context.newPage()
      await other.goto('/terms')
      await other.evaluate(
        ({ key, value }) => {
          localStorage.setItem(key, JSON.stringify(value))
          // Supabase's cross-tab auth transport, with a mocked authenticated session.
          const channel = new BroadcastChannel(key)
          channel.postMessage({ event: 'SIGNED_IN', session: value })
          channel.close()
        },
        { key: authKey, value: session('reader-b') }
      )
      await expect(
        page.getByRole('img', { name: 'Avatar for reader-b' })
      ).toBeVisible()
    }
    await expect(
      page.getByText('Offline reading sample', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('Reader A confidential draft', { exact: true })
    ).not.toBeVisible()
    await page.reload()
    await expect(
      page.getByText('Offline reading sample', { exact: true })
    ).toBeVisible()
    await forceOffline(page)
    await page.goto('/library')
    await expect(
      page.getByText('Your uploaded texts will appear here.')
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Reader A confidential draft' })
    ).not.toBeVisible()
  })
}
