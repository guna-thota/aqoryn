/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — enables GitHub Pages deployment
  output: "export",

  // Required for GitHub Pages (repo name as base path)
  // Change "aqoryn" to your actual repo name
  basePath: process.env.GITHUB_PAGES ? "/aqoryn" : "",
  assetPrefix: process.env.GITHUB_PAGES ? "/aqoryn/" : "",

  // Disable image optimization for static export
  images: { unoptimized: true },

  // Needed for Solana wallet adapter
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs:     false,
      net:    false,
      tls:    false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      url:    require.resolve("url"),
      zlib:   require.resolve("browserify-zlib"),
      http:   require.resolve("stream-http"),
      https:  require.resolve("https-browserify"),
      assert: require.resolve("assert"),
      os:     require.resolve("os-browserify"),
      path:   require.resolve("path-browserify"),
      buffer: require.resolve("buffer"),
    };
    return config;
  },

  // Suppress build warnings for known peer dep issues
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
