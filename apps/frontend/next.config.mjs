/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  webpack: (config) => {
    // pnpm crea symlinks workspace → packages/*. Sin esto webpack los resuelve
    // a su ruta real (fuera de node_modules) y los trata como código local,
    // inyectando HMR (import.meta.webpackHot.accept) en archivos CJS y rompiendo
    // el parse. Con symlinks:false los trata como dependencia normal.
    config.resolve.symlinks = false;
    return config;
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';
    return [
      { source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` },
    ];
  },
};
export default nextConfig;
