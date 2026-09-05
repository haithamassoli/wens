import type { MetadataRoute } from "next";

// ponytail: single SVG icon (sizes "any") — Chrome/Edge accept it for install.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ونس — ألعاب للزوجين",
    short_name: "ونس",
    description: "ألعاب وأنشطة قصيرة للزوجين، على هاتف واحد وبلا تسجيل.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eef7",
    theme_color: "#f3eef7",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
