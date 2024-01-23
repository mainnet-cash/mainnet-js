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
        events: require.resolve("events/"),
        fs: EMPTY_PATH,
        http: EMPTY_PATH,
        https: EMPTY_PATH,
        net: EMPTY_PATH,
        stream: require.resolve('stream-browserify'),
        tls: EMPTY_PATH,
        url: EMPTY_PATH
      },
    },
  }
})
