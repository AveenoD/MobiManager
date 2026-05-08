/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/icon.svg', permanent: false },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const otelExternals = [
        '@opentelemetry/sdk-node',
        '@opentelemetry/auto-instrumentations-node',
        '@opentelemetry/exporter-logs-otlp-grpc',
        '@opentelemetry/otlp-grpc-exporter-base',
        '@grpc/grpc-js',
      ];
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev != null ? [prev] : []),
        ({ request }, callback) => {
          if (request && otelExternals.some((p) => request === p || request.startsWith(`${p}/`))) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
