import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // ponytail: dev SW churn is noise; test PWA via `next build && next start`
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
