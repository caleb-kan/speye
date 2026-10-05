import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

function patchFor(name) {
  return `diff --git a/node_modules/example/${name}.txt b/node_modules/example/${name}.txt
--- a/node_modules/example/${name}.txt
+++ b/node_modules/example/${name}.txt
@@ -1 +1 @@
-original
+patched
`
}

function fixture(t, repository = false) {
  const root = mkdtempSync(join(tmpdir(), 'speye-patches-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const frontend = join(root, 'frontend')
  const patches = join(frontend, 'patches')
  const target = join(frontend, 'node_modules', 'example')
  mkdirSync(join(frontend, 'scripts'), { recursive: true })
  mkdirSync(patches)
  mkdirSync(target, { recursive: true })
  const script = join(frontend, 'scripts', 'apply-patches.mjs')
  cpSync(fileURLToPath(new URL('./apply-patches.mjs', import.meta.url)), script)
  writeFileSync(
    join(patches, 'example.patch'),
    patchFor('first') + patchFor('second')
  )
  for (const name of ['first', 'second'])
    writeFileSync(join(target, `${name}.txt`), 'original\n')
  if (repository) {
    assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0)
    writeFileSync(join(root, '.gitignore'), 'node_modules/\n')
    assert.equal(
      spawnSync('git', ['check-ignore', join(target, 'first.txt')], {
        cwd: root,
      }).status,
      0
    )
  }
  return {
    root,
    frontend,
    patches,
    target,
    run: (cwd = root, env = process.env) =>
      spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8' }),
    read: (name) => readFileSync(join(target, `${name}.txt`), 'utf8'),
  }
}

for (const repository of [false, true]) {
  test(`applies and repeats safely in ${repository ? 'ignored node_modules in a checkout' : 'a source archive'}`, (t) => {
    const f = fixture(t, repository)
    const first = f.run()
    assert.equal(first.status, 0, first.stderr)
    assert.equal(f.read('first'), 'patched\n')
    assert.equal(f.read('second'), 'patched\n')
    const repeat = f.run(f.frontend)
    assert.equal(repeat.status, 0, repeat.stderr)
    assert.match(repeat.stdout, /0 applied, 1 already applied/)
    assert.equal(f.read('first'), 'patched\n')
    assert.equal(f.read('second'), 'patched\n')
  })
}

test('rejects a partially applied patch without changing either target', (t) => {
  const f = fixture(t)
  writeFileSync(join(f.target, 'first.txt'), 'patched\n')
  assert.equal(f.run().status, 1)
  assert.equal(f.read('first'), 'patched\n')
  assert.equal(f.read('second'), 'original\n')
})

test('rejects a stale target before applying other hunks', (t) => {
  const f = fixture(t)
  writeFileSync(join(f.target, 'second.txt'), 'upstream changed\n')
  assert.equal(f.run().status, 1)
  assert.equal(f.read('first'), 'original\n')
  assert.equal(f.read('second'), 'upstream changed\n')
})

test('preflights every patch before writing any target', (t) => {
  const f = fixture(t)
  writeFileSync(join(f.patches, 'later.patch'), patchFor('missing'))
  assert.equal(f.run().status, 1)
  assert.equal(f.read('first'), 'original\n')
  assert.equal(f.read('second'), 'original\n')
})

test('leaves all targets unchanged when pending patches conflict with each other', (t) => {
  const f = fixture(t)
  writeFileSync(
    join(f.patches, 'overlap.patch'),
    patchFor('first').replace('+patched', '+different')
  )
  assert.equal(f.run().status, 1)
  assert.equal(f.read('first'), 'original\n')
  assert.equal(f.read('second'), 'original\n')
})

test('fails closed on malformed patches and missing Git', (t) => {
  const f = fixture(t)
  writeFileSync(join(f.patches, 'example.patch'), 'not a patch\n')
  assert.equal(f.run().status, 1)
  const missingGit = f.run(f.root, { ...process.env, PATH: f.target })
  assert.equal(missingGit.status, 1)
  assert.match(missingGit.stderr, /ENOENT/)
  assert.equal(f.read('first'), 'original\n')
  assert.equal(f.read('second'), 'original\n')
})

test('ignores inherited repository paths when patching installed files', (t) => {
  const f = fixture(t, true)
  const result = f.run(f.root, {
    ...process.env,
    GIT_DIR: join(f.root, '.git'),
    GIT_WORK_TREE: f.root,
    GIT_COMMON_DIR: join(f.root, '.git'),
    GIT_INDEX_FILE: join(f.root, '.git', 'index'),
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(f.read('first'), 'patched\n')
  assert.equal(f.read('second'), 'patched\n')
})
