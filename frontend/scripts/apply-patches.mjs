import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
const patchDirectory = join(frontend, 'patches')
const patches = readdirSync(patchDirectory)
  .filter((name) => name.endsWith('.patch'))
  .sort()
  .map((name) => join(patchDirectory, name))

// Prevent Git from finding the parent checkout and silently skipping paths
// relative to frontend. The patches also work in a source archive without .git.
const env = { ...process.env, GIT_CEILING_DIRECTORIES: dirname(frontend) }
for (const name of [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
]) {
  delete env[name]
}

function gitApply(args, input) {
  const result = spawnSync('git', ['apply', ...args], {
    cwd: frontend,
    env,
    encoding: 'utf8',
    input,
  })
  if (result.error) throw result.error
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || `git apply exited with ${result.status}`)
  }
  return result
}

try {
  const pending = []
  for (const patch of patches) {
    const forward = gitApply(['--check', patch])
    if (forward.status === 0) {
      pending.push(patch)
    } else if (gitApply(['--reverse', '--check', patch]).status !== 0) {
      throw new Error(`Cannot apply ${patch}:\n${forward.stderr}`)
    }
  }

  // One patch stream is atomic on conflicts; separate file arguments are not.
  // Do not use --reject, which would allow partially applied hunks.
  if (pending.length > 0) {
    const applied = gitApply(
      ['-'],
      pending.map((patch) => readFileSync(patch, 'utf8')).join('\n')
    )
    if (applied.status !== 0) throw new Error(applied.stderr)
  }
  console.log(
    `Dependency patches: ${pending.length} applied, ${patches.length - pending.length} already applied`
  )
} catch (error) {
  console.error('Dependency patch installation failed:', error.message)
  process.exitCode = 1
}
