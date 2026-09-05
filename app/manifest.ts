import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

// ponytail: no `screenshots` — that needs real captures kept in sync with the UI; add when
// the richer install dialog is worth the upkeep.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ونس — ألعاب للزوجين",
    short_name: "ونس",
    description: SITE_DESCRIPTION,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3eef7",
    theme_color: "#f3eef7",
    categories: ["entertainment", "lifestyle", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "الألعاب", url: "/games" },
      { name: "المفضّلة", url: "/favorites" },
    ],
  };
}
