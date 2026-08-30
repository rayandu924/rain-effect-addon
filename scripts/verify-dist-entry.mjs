import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const html = await readFile(resolve('dist/index.html'), 'utf8')
const entryPath = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/u)?.[1]
assert.equal(entryPath, './assets/addon.js', 'dist/index.html must reference the canonical module entry')
const entry = await readFile(resolve('dist/assets/addon.js'), 'utf8')
assert.match(entry, /\bmount\b/u, 'the production entry must contain the mount export')
