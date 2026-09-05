import type { MetadataRoute } from "next";

// ponytail: single SVG icon (sizes "any") — Chrome/Edge accept it for install.
// Add 192/512 PNGs only if you need older-Android or richer store listings.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wens — Couples Games",
    short_name: "Wens",
    description: "Games for couples.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
