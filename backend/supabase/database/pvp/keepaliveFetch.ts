/**
 * Fire-and-forget keepalive fetch for use during page unload / unmount.
 * The keepalive flag allows the request to survive page navigation.
 * Errors are intentionally caught and logged: the page is unloading so
 * there is no user to notify.
 */
export function keepaliveFetch(opts: {
  url: string
  method: 'POST' | 'DELETE'
  accessToken: string
  supabaseKey: string
  body?: Record<string, unknown>
  label: string
}): void {
  const headers: Record<string, string> = {
    apikey: opts.supabaseKey,
    Authorization: `Bearer ${opts.accessToken}`,
    Prefer: 'return=minimal',
  }
  if (opts.body) headers['Content-Type'] = 'application/json'

  fetch(opts.url, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) {
        let detail = ''
        try {
          detail = await res.text()
        } catch (bodyErr) {
          // Body may be unavailable during page unload
          console.error(`${opts.label} response body unreadable:`, bodyErr)
        }
        console.error(
          `${opts.label} HTTP ${res.status}: ${res.statusText}`,
          detail
        )
      }
    })
    .catch((err) => {
      console.error(`${opts.label} failed:`, err)
    })
}
