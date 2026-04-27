/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@lexscribe/shared-types', '@lexscribe/shared-validation'],
};

export default nextConfig;
