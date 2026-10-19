/**
 * Backend static checks without extra tooling:
 *  1. `node --check` every source/script/test file (syntax),
 *  2. import the app module graph (missing exports / bad paths fail here),
 *  3. forbid runtime Supabase usage and leftover TODO/stub markers in src/.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const walk = (dir) =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (name === 'node_modules') return []
    return statSync(full).isDirectory() ? walk(full) : /\.(m?js|cjs)$/.test(name) ? [full] : []
  })

const files = ['src', 'scripts', 'tests'].flatMap((dir) => walk(path.join(root, dir)))
let failures = 0
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (error) {
    failures += 1
    console.error(`syntax: ${path.relative(root, file)}\n${error.stderr?.toString()}`)
  }
}

for (const file of walk(path.join(root, 'src'))) {
  const text = readFileSync(file, 'utf8')
  if (/@supabase\/|supabase\.(from|rpc|auth|storage|channel)/.test(text)) {
    failures += 1
    console.error(`supabase runtime reference: ${path.relative(root, file)}`)
  }
  if (/\b(TODO|FIXME|NOT_IMPLEMENTED|fakeSuccess)\b/.test(text)) {
    failures += 1
    console.error(`stub marker: ${path.relative(root, file)}`)
  }
}

process.env.NODE_ENV ||= 'test'
try {
  const { createApp } = await import(pathToFileURL(path.join(root, 'src/app.js')).href)
  createApp()
} catch (error) {
  failures += 1
  console.error('module graph failed to load:', error)
}

if (failures) {
  console.error(`lint: ${failures} problem(s)`)
  process.exit(1)
}
console.log(`lint: ${files.length} files OK`)
