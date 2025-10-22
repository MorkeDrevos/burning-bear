/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don’t fail the Vercel build on ESLint warnings
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
