import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import type { Plugin } from 'vite'

const root = path.resolve(__dirname, '..')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.klang': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

function sendFile(res: import('http').ServerResponse, filePath: string) {
  const ext = path.extname(filePath)
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'no-store')
  fs.createReadStream(filePath).pipe(res)
}

function safeRootFile(urlPath: string): string | null {
  const candidate = path.resolve(root, `.${decodeURIComponent(urlPath)}`)
  const relative = path.relative(root, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  if (relative.startsWith('landing')) return null
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return null
  return candidate
}

/** Serve vanilla demo + compiler from the repo root during `vite dev`. */
function serveDemoAssets(): Plugin {
  return {
    name: 'serve-demo-assets',
    configureServer(server) {
      // Registered during configureServer (not in a returned fn) so it runs
      // before Vite's internal /src handling — critical for root src/pipeline.js.
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url || url === '/') {
          next()
          return
        }

        if (url === '/play' || url === '/play/') {
          sendFile(res, path.join(root, 'play.html'))
          return
        }
        if (url === '/about' || url === '/about/') {
          req.url = '/about.html'
          next()
          return
        }

        // Compiler modules live at repo-root /src/*.js — serve those first.
        if (url.startsWith('/src/') && url.endsWith('.js')) {
          const file = safeRootFile(url)
          if (file) {
            sendFile(res, file)
            return
          }
        }

        // Demo shell assets at repo root
        const demoPaths = ['/app.js', '/sound.js', '/styles.css', '/play.html']
        if (demoPaths.includes(url) || url.startsWith('/examples/') || url.startsWith('/docs/')) {
          const file = safeRootFile(url)
          if (file) {
            sendFile(res, file)
            return
          }
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveDemoAssets()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        about: path.resolve(__dirname, 'about.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
