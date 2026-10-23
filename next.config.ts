import type { NextConfig } from "next";

// The app is fully client-rendered (data lives in the browser), so the
// scaffold's Cache Components / partial prefetching flags are left off.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
