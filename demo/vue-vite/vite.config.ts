import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
const EMPTY_PATH = require.resolve(
  'rollup-plugin-node-polyfills/polyfills/empty.js',
)

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  define: {global: 'globalThis'},
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      plugins: [
        NodeGlobalsPolyfillPlugin({
            process: true,
            buffer: true,
        }),
      ]
    },
  },
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      child_process: EMPTY_PATH,
    },
  },
})
