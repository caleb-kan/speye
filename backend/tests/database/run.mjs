import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
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
  sql(readFileSync(`${here}text-processing-schema.sql`, 'utf8'))
  const migrations = `${here}../../supabase/migrations/`
  for (const filename of readdirSync(migrations)
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    sql(readFileSync(`${migrations}${filename}`, 'utf8'))
  }
  sql(readFileSync(`${here}text-processing-checks.sql`, 'utf8'))
  console.log(
    'PASS: text processing ownership, admin editing, source invalidation, queueing, and retry authorization'
  )
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

  async function waitForActivity(applicationName, event) {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (
        sql(
          `SELECT count(*) FROM pg_stat_activity WHERE application_name='${applicationName}' AND wait_event='${event}';`
        ) === '1'
      )
        return
      await setTimeout(20)
    }
    throw new Error(`Expected ${applicationName} to wait for ${event}`)
  }
  const textId = sql("SELECT id FROM public.texts WHERE title='eligible';")
  sql(
    "DELETE FROM public.pvp_match_notifications; DELETE FROM public.pvp_games; DELETE FROM public.matchmaking_queue; INSERT INTO public.matchmaking_queue(user_id,player_elo) VALUES ('00000000-0000-0000-0000-000000000002',1000);"
  )
  const matchingText = asyncSql(
    `SET application_name='match-before-edit'; ${request}`
  )
  await waitForActivity('match-before-edit', 'PgSleep')
  const blockedEdit = asyncSql(
    `UPDATE public.texts SET content='changed during match' WHERE id='${textId}';`
  ).then(
    () => ({ accepted: true, message: '' }),
    (error) => ({ accepted: false, message: error.message })
  )
  const [matchedText, editResult] = await Promise.all([
    matchingText,
    blockedEdit,
  ])
  assert.equal(JSON.parse(matchedText.split('\n').at(-1)).status, 'matched')
  assert.equal(editResult.accepted, false)
  assert.match(
    editResult.message,
    /Cannot modify text used in an active PvP game/
  )
  assert.equal(
    sql(`SELECT content FROM public.texts WHERE id='${textId}';`),
    'one two three four five'
  )
  console.log('PASS: matchmaking holds a passage stable until its game commits')

  sql(
    "DELETE FROM public.pvp_match_notifications; DELETE FROM public.pvp_games; DELETE FROM public.matchmaking_queue; INSERT INTO public.matchmaking_queue(user_id,player_elo) VALUES ('00000000-0000-0000-0000-000000000002',1000);"
  )
  const editingText = asyncSql(
    `SET application_name='edit-before-match'; BEGIN; UPDATE public.texts SET content='revised source' WHERE id='${textId}'; SELECT pg_sleep(3); COMMIT;`
  )
  await waitForActivity('edit-before-match', 'PgSleep')
  const waitingMatch = asyncSql(
    `SET application_name='match-after-edit'; ${request}`
  )
  await waitForActivity('match-after-edit', 'transactionid')
  const [, afterEdit] = await Promise.all([editingText, waitingMatch])
  assert.equal(JSON.parse(afterEdit.split('\n').at(-1)).status, 'error')
  assert.equal(sql('SELECT count(*) FROM public.pvp_games;'), '0')
  assert.equal(
    sql(`SELECT processing_status FROM public.texts WHERE id='${textId}';`),
    'pending'
  )
  assert.equal(sql('SELECT count(*) FROM pgmq.sent_messages;'), '1')
  console.log(
    'PASS: matchmaking rechecks edited passages and cannot publish a stale version'
  )

  for (const [suffix, status, stage, violation] of [
    ['20', 'completed', null, null],
    ['21', 'failed', 'process_text', 'policy'],
  ]) {
    const approvalTextId = `10000000-0000-0000-0000-0000000000${suffix}`
    sql(
      `INSERT INTO public.texts(id,content,owner_id,processing_status,quiz,quiz_valid,llm_decision,admin_decision,rejection_stage,llm_violation_type) VALUES ('${approvalTextId}','Original owner source','00000000-0000-0000-0000-000000000001','${status}','{"questionSets":[]}',true,'approved','pending',${stage ? `'${stage}'` : 'NULL'},${violation ? `'${violation}'` : 'NULL'});`
    )
    const ownerEdit = asyncSql(
      `SET application_name='owner-edit-before-approval-${suffix}'; SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'; SET ROLE authenticated; BEGIN; UPDATE public.texts SET content='Revised owner source' WHERE id='${approvalTextId}'; SELECT pg_sleep(3); COMMIT;`
    )
    await waitForActivity(`owner-edit-before-approval-${suffix}`, 'PgSleep')
    const approval = asyncSql(
      `SET application_name='approval-after-owner-edit-${suffix}'; SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000003'; SET request.jwt.claims='{"app_metadata":{"role":"admin"}}'; SET ROLE authenticated; SELECT public.admin_approve_text('${approvalTextId}','00000000-0000-0000-0000-000000000003');`
    ).then(
      () => ({ accepted: true, message: '' }),
      (error) => ({ accepted: false, message: error.message })
    )
    await waitForActivity(
      `approval-after-owner-edit-${suffix}`,
      'transactionid'
    )
    const [, approvalResult] = await Promise.all([ownerEdit, approval])
    assert.equal(approvalResult.accepted, false)
    assert.match(
      approvalResult.message,
      /Text must finish processing before approval/
    )
    assert.deepEqual(
      JSON.parse(
        sql(
          `SELECT json_build_object('content',content,'processing_status',processing_status,'admin_decision',admin_decision,'llm_decision',llm_decision,'quiz',quiz) FROM public.texts WHERE id='${approvalTextId}';`
        )
      ),
      {
        content: 'Revised owner source',
        processing_status: 'pending',
        admin_decision: 'pending',
        llm_decision: null,
        quiz: null,
      }
    )
    assert.equal(
      sql(
        `SELECT count(*) FROM pgmq.sent_messages WHERE message->>'text_id'='${approvalTextId}';`
      ),
      '1'
    )
  }
  console.log(
    'PASS: approval rereads owner-edited sources and cannot approve an unprocessed revision'
  )
} finally {
  execFileSync('docker', ['rm', '-f', name], { stdio: 'pipe' })
}
