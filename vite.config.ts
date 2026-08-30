import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function distributionEntry(): Plugin {
  return {
    name: 'mywallpaper-distribution-entry',
    generateBundle(_options, bundle) {
      const entry = bundle['assets/addon.js']
      if (!entry || entry.type !== 'chunk' || !entry.exports.includes('mount')) {
        this.error('The production add-on entry must export mount.')
      }
      const styles = Object.values(bundle)
        .filter((output) => output.type === 'asset' && output.fileName.endsWith('.css'))
        .map((output) => `    <link rel="stylesheet" href="./${output.fileName}">\n`)
        .join('')
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: `<!doctype html>\n<html><head><meta charset="UTF-8">\n${styles}</head><body><script type="module" src="./assets/addon.js"></script></body></html>\n`,
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), distributionEntry()],
  build: {
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: 'src/index.tsx',
      output: {
        entryFileNames: 'assets/addon.js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
