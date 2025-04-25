/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude binary files from onnxruntime-node and other problematic packages
    config.module.noParse = [
      /onnxruntime-node/,
      /onnxruntime-web/,
      /onnxruntime-common/
    ];

    // Add node-loader for .node files that we do want to process
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    // Properly handle binary modules
    if (!isServer) {
      // Don't attempt to bundle native modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        onnxruntime: false,
        'onnxruntime-node': false
      };
    }

    return config;
  },
  // Disable image optimization to avoid sharp issues
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
