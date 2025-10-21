/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    // Stub out the native canvas addon for all builds.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };

    // Additionally, mark canvas as an external module on the server.
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        { canvas: "commonjs canvas" },
      ];
    }

    return config;
  },
};

export default nextConfig;