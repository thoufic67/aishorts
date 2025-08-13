/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle Remotion's ESM dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    // Add support for Remotion's video processing
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-native-sqlite-storage": false,
        "react-native": false,
      };
    }

    return config;
  },
  transpilePackages: ["@remotion/player"],
  experimental: {
    esmExternals: "loose",
  },
};

export default nextConfig;
