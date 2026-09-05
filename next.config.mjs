/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The worker shares `src/lib` with the web app; keep those imports server-only.
  serverExternalPackages: ['bullmq', 'ioredis'],
  experimental: {
    // Reconstruct jobs accept direct file uploads through a route handler.
    serverActions: { bodySizeLimit: '2gb' },
  },
};

export default nextConfig;
