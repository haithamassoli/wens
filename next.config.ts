import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // ponytail: dev SW churn is noise; test PWA via `next build && next start`
  // The precache manifest only covers static assets, so the offline fallback document is added
  // by hand. ponytail: revision is the build time — it re-fetches one small HTML doc per deploy.
  additionalPrecacheEntries: [{ url: "/offline", revision: Date.now().toString() }],
});

const nextConfig: NextConfig = {
  turbopack: {}, // dev runs on Turbopack (SW disabled); build uses --webpack for Serwist
};

export default withSerwist(nextConfig);
