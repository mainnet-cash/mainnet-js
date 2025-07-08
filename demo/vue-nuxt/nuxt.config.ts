// https://nuxt.com/docs/api/configuration/nuxt-config

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
const EMPTY_PATH = require.resolve(
  'rollup-plugin-node-polyfills/polyfills/empty.js',
)

export default defineNuxtConfig({
  vite: {
    build: {
      target: 'esnext',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {global: 'globalThis'},
        target: 'esnext',
        plugins: [
          NodeGlobalsPolyfillPlugin({
              process: true,
              buffer: true,
          }),
        ]
      },
    },
    resolve: {
      alias: {
        child_process: EMPTY_PATH,
      },
    },
  }
})
