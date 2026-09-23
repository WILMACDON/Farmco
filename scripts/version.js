#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
/**
 * Pre-push version bump: prompts to bump version (patch/minor/major), runs
 * commit-and-tag-version to update package.json + CHANGELOG, commits, tags,
 * then pushes. If you choose "skip", the normal git push continues.
 * Reads prompt from /dev/tty so git's stdin (ref list) is not consumed as the answer.
 */
import { createReadStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function question(query) {
  return new Promise((resolve) => {
    let input = process.stdin
    try {
      input = createReadStream('/dev/tty')
    } catch {
      // Windows: no /dev/tty; stdin may have git refs - drain then use stdin
    }
    const rl = createInterface({ input, output: process.stdout })
    rl.question(query, (answer) => {
      rl.close()
      if (input !== process.stdin) input.destroy()
      resolve(answer?.trim().toLowerCase())
    })
  })
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  })
  return r.status === 0
}

async function main() {
  console.log('\n📦 Version bump (before push)\n')
  console.log('  1) patch')
  console.log('  2) minor')
  console.log('  3) major')
  console.log('  s) skip (default)\n')
  const answer = await question('Bump version?: ')
  const raw = answer.trim()
  const choice = (raw === '' ? 's' : raw)[0]

  if (choice === 's' || choice === 'S') {
    process.exit(0)
  }

  const releaseAs =
    choice === '3' || choice === 'M'
      ? 'major'
      : choice === '2' || choice === 'm'
        ? 'minor'
        : 'patch'

  console.log(`\nBumping ${releaseAs} and updating CHANGELOG...\n`)
  const ok = run('npx', ['commit-and-tag-version', '--release-as', releaseAs])
  if (!ok) {
    console.error('Version bump failed.')
    process.exit(1)
  }

  console.log('\nPushing branch and tags...\n')
  const pushed = run('git', ['push', 'origin', 'HEAD', '--follow-tags', '--no-verify'])
  if (!pushed) {
    process.exit(1)
  }
  console.log('\n✔ Version pushed. (Hook exits so git does not push again.)\n')
  // Exit non-zero so git skips its own push (we already pushed). Prevents "remote rejected" duplicate push.
  process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
