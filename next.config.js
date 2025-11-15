/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/assets/:path*",
        destination: "/WWIII/assets/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
