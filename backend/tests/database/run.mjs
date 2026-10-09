import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { setTimeout } from 'node:timers/promises'

const name = `speye-db-test-${randomUUID()}`
const image =
  'postgres:17.11-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
const here = fileURLToPath(new URL('./', import.meta.url))
const psql = [
  'exec',
  '-i',
  name,
  'psql',
  '-U',
  'postgres',
  '-d',
  'speye_test',
  '-At',
  '-v',
  'ON_ERROR_STOP=1',
]
const sql = (input) =>
  execFileSync('docker', psql, { input, encoding: 'utf8' }).trim()
function asyncSql(input) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', psql)
    let output = ''
    let error = ''
    child.stdout.on('data', (data) => {
      output += data
    })
    child.stderr.on('data', (data) => {
      error += data
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(error))
    )
    child.stdin.end(input)
  })
}

execFileSync(
  'docker',
  [
    'run',
    '-d',
    '--name',
    name,
    '--network',
    'none',
    '-e',
    'POSTGRES_PASSWORD=test-only',
    '-e',
    'POSTGRES_DB=speye_test',
    image,
  ],
  { stdio: 'pipe' }
)
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const command = execFileSync(
        'docker',
        ['exec', name, 'cat', '/proc/1/comm'],
        {
          encoding: 'utf8',
        }
      ).trim()
      if (command !== 'postgres') {
        await setTimeout(500)
        continue
      }
      execFileSync('docker', ['exec', name, 'pg_isready'], { stdio: 'pipe' })
      ready = true
      break
    } catch {
      await setTimeout(500)
    }
  }
  assert(ready, 'PostgreSQL did not become ready')
  sql(readFileSync(`${here}schema.sql`, 'utf8'))
  sql(readFileSync(`${here}hardening.sql`, 'utf8'))
  sql(readFileSync(`${here}realtime.sql`, 'utf8'))
  sql(readFileSync(`${here}checks.sql`, 'utf8'))
  sql(readFileSync(`${here}realtime-checks.sql`, 'utf8'))
  console.log(
    'PASS: private broadcasts allow both players and reject anonymous users, outsiders, and unknown topics'
  )
  console.log(
    'PASS: text visibility, owner deletion, queue authorization, and activity metric constraints'
  )
  sql(readFileSync(`${here}matchmaking.sql`, 'utf8'))
  const request = `SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; SET ROLE authenticated; SELECT public.matchmake('00000000-0000-0000-0000-000000000001',9000);`
  const results = await Promise.all([asyncSql(request), asyncSql(request)])
  const statuses = results
    .map((output) => JSON.parse(output.split('\n').at(-1)))
    .sort((a, b) => a.status.localeCompare(b.status))
  assert.deepEqual(
    statuses.map((result) => result.status),
    ['already_in_game', 'matched']
  )
  assert.equal(statuses[0].game_id, statuses[1].game_id)
  assert.equal(
    sql(
      "SELECT count(*) FROM public.pvp_games WHERE player1_id='00000000-0000-0000-0000-000000000001' OR player2_id='00000000-0000-0000-0000-000000000001';"
    ),
    '1'
  )
  console.log(
    'PASS: simultaneous requests create one game and both return its ID'
  )
  assert.equal(
    sql(
      "SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; SET ROLE authenticated; SELECT public.leave_matchmaking_queue('00000000-0000-0000-0000-000000000001');"
    )
      .split('\n')
      .at(-1),
    statuses[0].game_id
  )
  assert.equal(sql('SELECT count(*) FROM public.pvp_games;'), '1')
  console.log(
    'PASS: cancellation returns an existing game without abandoning it'
  )
  sql(
    'DELETE FROM public.pvp_match_notifications; DELETE FROM public.pvp_games; DELETE FROM public.matchmaking_queue;'
  )
  const lockHolder = spawn('docker', psql)
  const lockFinished = new Promise((resolve, reject) => {
    lockHolder.on('error', reject)
    lockHolder.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`Lock holder exited ${code}`))
    )
  })
  lockHolder.stdin.write(
    "BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('public.matchmake', 0));\n"
  )
  async function waitForLock(granted, count) {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (
        sql(
          `SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted=${granted};`
        ) === String(count)
      )
        return
      await setTimeout(100)
    }
    throw new Error(`Expected ${count} advisory locks with granted=${granted}`)
  }
  try {
    await waitForLock(true, 1)
    const pendingMatch = asyncSql(request)
    await waitForLock(false, 1)
    const pendingCancellation = asyncSql(
      "SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; SET ROLE authenticated; SELECT public.leave_matchmaking_queue('00000000-0000-0000-0000-000000000001');"
    )
    await waitForLock(false, 2)
    lockHolder.stdin.end('COMMIT;\n')
    await Promise.all([lockFinished, pendingMatch, pendingCancellation])
    assert.equal(sql('SELECT count(*) FROM public.matchmaking_queue;'), '0')
    console.log(
      'PASS: cancellation waits for an in-flight matchmaking write and removes it'
    )
  } finally {
    if (!lockHolder.stdin.writableEnded) lockHolder.stdin.end('ROLLBACK;\n')
  }
} finally {
  execFileSync('docker', ['rm', '-f', name], { stdio: 'pipe' })
}
