// Local-only API and production asset server. These tests never contact Supabase.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'
import { setTimeout } from 'node:timers/promises'

const dist = fileURLToPath(new URL('../../dist', import.meta.url))
let writes = []
let workerVersion = 1
let notificationsEnabled = false
export const sampleText = {
  id: 'public-text',
  title: 'Offline reading sample',
  content:
    'A small local reading sample remains available without a network. '.repeat(
      30
    ),
  owner_id: null,
  fiction: false,
  complexity: 10,
  uploaded_at: '2026-09-16T08:00:00Z',
  processing_status: 'completed',
  quiz: null,
  quiz_valid: true,
  sectional: false,
  section_content: null,
  summary: null,
}
const privateText = {
  ...sampleText,
  id: 'private-a',
  owner_id: 'reader-a',
  title: 'Reader A confidential draft',
  content: 'Confidential owner-specific reading content. '.repeat(30),
  preview: 'Confidential owner-specific reading content.',
  has_summary: false,
}

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'OPTIONS') return res.writeHead(204).end()
    const url = new URL(req.url, 'http://localhost:54323')
    let raw = ''
    for await (const chunk of req) raw += chunk
    const send = (value) => res.end(JSON.stringify(value))
    if (url.pathname === '/__test/reset') {
      writes = []
      workerVersion = 1
      notificationsEnabled = false
      return send({})
    }
    if (url.pathname === '/__test/state') return send({ writes })
    if (url.pathname === '/__test/notifications') {
      notificationsEnabled = true
      return send({})
    }
    if (url.pathname === '/__test/update-worker') {
      workerVersion += 1
      return send({ workerVersion })
    }
    let id
    try {
      id = JSON.parse(
        Buffer.from(
          (req.headers.authorization ?? '').split('.')[1],
          'base64url'
        )
      ).sub
    } catch {
      id = undefined
    }
    if (url.pathname === '/auth/v1/user') {
      return send({
        id,
        aud: 'authenticated',
        role: 'authenticated',
        email: `${id}@example.test`,
        user_metadata: { username: id },
      })
    }
    if (url.pathname === '/auth/v1/logout') return res.writeHead(204).end()
    if (url.pathname === '/rest/v1/users')
      return send({ id, username: id, role: 'user' })
    if (url.pathname === '/rest/v1/notifications' && req.method === 'GET') {
      return send(
        notificationsEnabled && id === 'reader-a'
          ? [
              {
                id: 'private-toast',
                user_id: id,
                message: 'Reader A private notification',
                type: 'info',
                seen: false,
                toast_shown: false,
                created_at: new Date().toISOString(),
                link: null,
              },
            ]
          : []
      )
    }
    if (url.pathname === '/rest/v1/rpc/get_random_text')
      return send([sampleText])
    if (url.pathname === '/rest/v1/texts') {
      if (
        url.searchParams.get('owner_id') === 'eq.reader-a' &&
        id === 'reader-a'
      )
        return send([privateText])
      if (url.searchParams.get('id') === 'eq.private-a' && id === 'reader-a')
        return send(privateText)
      return send([])
    }
    if (url.pathname === '/rest/v1/user_activity' && req.method === 'POST') {
      // Leave enough time for two tabs to race for the same queued operation.
      await setTimeout(150)
      const body = JSON.parse(raw)
      writes.push({ authenticatedUser: id, body })
      return send({ id: 'saved', ...body })
    }
    return send([])
  })
  .listen(54323, '127.0.0.1')

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}
http
  .createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname
    let file = path.join(dist, pathname)
    if (
      !file.startsWith(dist) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    )
      file = path.join(dist, 'index.html')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader(
      'Content-Type',
      mime[path.extname(file)] ?? 'application/octet-stream'
    )
    const body = fs.readFileSync(file)
    if (pathname === '/sw.js') {
      // Instrument only the test server's response to identify active/waiting workers.
      return res.end(
        body +
          `\nself.addEventListener('message', e => { if (e.data === 'test-version') e.ports[0].postMessage(${workerVersion}); });`
      )
    }
    res.end(body)
  })
  .listen(5184, '127.0.0.1')
