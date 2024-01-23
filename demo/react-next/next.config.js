/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.resolve.alias = {
      ...config.resolve.alias, ...{
        events: require.resolve("events/"),
        fs: EMPTY_PATH,
        http: EMPTY_PATH,
        https: EMPTY_PATH,
        net: EMPTY_PATH,
        stream: require.resolve('stream-browserify'),
        tls: EMPTY_PATH,
        url: EMPTY_PATH
      }
    };
    return config
  },

}

module.exports = nextConfig
