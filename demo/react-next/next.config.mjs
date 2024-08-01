/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.resolve.alias = {
      ...config.resolve.alias, ...{
        // events: "events/",
        child_process: false,
        fs: false,
        http: false,
        https: false,
        net: false,
        stream: 'stream-browserify',
        tls: false,
        url: false
      }
    };
    return config
  },
}
export default nextConfig;
