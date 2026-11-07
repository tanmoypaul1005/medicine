import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Root layout is app/[lang]/layout.tsx (dynamic segment) → normal not-found can't render the document.
    // app/global-not-found.tsx handles unmatched URLs and notFound() at the routing level.
    globalNotFound: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
