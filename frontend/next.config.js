/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables prefixed with NEXT_PUBLIC_ are available in the browser
  // Set NEXT_PUBLIC_API_URL in Vercel project settings to your Railway backend URL
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

module.exports = nextConfig;
