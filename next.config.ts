import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite loads its own WebAssembly files, so it runs from node_modules
  // instead of being bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The in-memory demo database starts from the build's snapshot and checks
  // the SQL migrations, so both have to ship with the deployed functions.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./.demo-db/**/*"],
  },
  // Browsers should check for a new service worker on every visit, or phones
  // could keep running an old one.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
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
