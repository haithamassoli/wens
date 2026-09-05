/**
 * Absolute origin, needed by metadataBase, robots.txt and the sitemap.
 * Set NEXT_PUBLIC_SITE_URL in production; Vercel's own var covers preview/prod deploys.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "ونس";
export const SITE_DESCRIPTION = "ألعاب وأنشطة قصيرة للزوجين، على هاتف واحد وبلا تسجيل.";

/** App screens with no indexable content — kept out of the sitemap and out of crawlers' way. */
export const PRIVATE_PATHS = ["/play/", "/favorites", "/settings", "/offline"];
