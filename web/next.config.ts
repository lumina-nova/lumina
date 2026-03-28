import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const internalAPIBaseURL =
      process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:9099";

    return [
      {
        source: "/api/topics/:name/tail",
        destination: `${internalAPIBaseURL}/api/topics/:name/tail`,
      },
    ];
  },
};

export default nextConfig;
