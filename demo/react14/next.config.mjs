import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const plugins = [];

// const withPWA = require("next-pwa")({
//   dest: "public",
//   disable: process.env.NODE_ENV === "development",
// });

//plugins.push(withPWA)

const nextConfig = {
//   experimental: {
//     serverActions: true,
//   },
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.resolve.alias = {
      ...config.resolve.alias,
      ...{
        bufferutil: false,
        child_process: false,
        crypto: false,
        dns: false,
        events: require.resolve("events"),
        eventsource: false,
        fs: false,
        http: false,
        https: false,
        libpq: false,
        module: false,
        net: false,
        os: false,
        "parse-database-url": false,
        path: false,
        pg: false,
        "pg-format": false,
        "pg-native": false,
        solc: false,
        tls: false,
        url: false,
        "utf-8-validate": false,
        zlib: false,
      },
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      ...{
        stream: require.resolve("stream-browserify"),
      },
    };
    return config;
  },
};

export default nextConfig;



