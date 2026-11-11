import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'path'

const require = createRequire(import.meta.url)
const dracoFiles = new Map([
  ['draco_decoder.js', 'text/javascript'],
  ['draco_wasm_wrapper.js', 'text/javascript'],
  ['draco_decoder.wasm', 'application/wasm']
])
const readDracoFile = name => readFileSync(require.resolve(`three/examples/jsm/libs/draco/gltf/${name}`))

const localDraco = {
  name: 'local-draco',
  configureServer(server) {
    server.middlewares.use('/draco', (req, res, next) => {
      const name = req.url?.split('?')[0].slice(1)
      const contentType = dracoFiles.get(name)
      if (!contentType) return next()
      res.setHeader('Content-Type', contentType)
      res.end(readDracoFile(name))
    })
  },
  generateBundle() {
    for (const name of dracoFiles.keys()) {
      this.emitFile({ type: 'asset', fileName: `draco/${name}`, source: readDracoFile(name) })
    }
    for (const family of ['orbitron', 'rajdhani']) {
      const source = readFileSync(require.resolve(`@fontsource/${family}/LICENSE`))
      this.emitFile({ type: 'asset', fileName: `licenses/${family}.txt`, source })
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localDraco],

  esbuild: mode === 'production' ? { pure: ['console.log', 'console.debug'] } : {},

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Player-Ip'],
      credentials: true
    },
    proxy: {

      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: process.env.NODE_ENV === 'production',
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);

            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ 
                error: 'Proxy Error', 
                message: err.message 
              }));
            }
          });

          if (process.env.NODE_ENV !== 'production') {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response:', proxyRes.statusCode, req.url);
            });
          }
        }
      },

      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _socket) => {
            console.error('WebSocket proxy error:', err);
          });
        }
      }
    }
  },

  preview: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Player-Ip'],
      credentials: true
    }
  },

  publicDir: 'public',

  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: [],
      input: {
        main: path.resolve(process.cwd(), 'index.html')
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'three': ['three', '@react-three/fiber', '@react-three/drei']
        }
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      'buffer': 'node_modules/buffer/index.js'
    }
  },

  optimizeDeps: {
    include: ['buffer', 'three'],
    exclude: ['three-mesh-bvh'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },

  envPrefix: 'VITE_',

  define: {
    global: 'globalThis'
  }
}))
