// Rasterises assets/*.svg into the icons and social image. Outputs are committed,
// so this only runs when the artwork changes: `node scripts/gen-assets.mjs`.
// ponytail: uses sharp (already present via next's image optimiser) instead of adding a build dep.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#2a1a33"; // icon background, also the maskable bleed

const icon = await readFile("assets/icon.svg");
const favicon = await readFile("assets/favicon.svg");
const og = await readFile("assets/og.svg");

const png = (svg, size) => sharp(svg).resize(size, size).png({ compressionLevel: 9 });

/** Multi-size .ico wrapping PNGs — 6-byte ICONDIR + 16-byte entry each, then the payloads. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

await mkdir("public/icons", { recursive: true });

const icoSizes = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size).toBuffer() })),
);

await Promise.all([
  // Browser tab: crisp SVG for modern browsers, .ico for everything else.
  writeFile("app/icon.svg", favicon),
  writeFile("app/favicon.ico", ico(icoSizes)),

  // iOS home screen — needs an opaque PNG, no transparency.
  png(icon, 180).toFile("app/apple-icon.png"),

  // Manifest icons.
  png(icon, 192).toFile("public/icons/icon-192.png"),
  png(icon, 512).toFile("public/icons/icon-512.png"),
  // Maskable: same art at 80% inside a full-bleed field, so Android's mask can't clip it.
  png(icon, 410)
    .toBuffer()
    .then((b) =>
      sharp(b)
        .extend({ top: 51, bottom: 51, left: 51, right: 51, background: BRAND })
        .png({ compressionLevel: 9 })
        .toFile("public/icons/icon-maskable.png"),
    ),

  // Open Graph / Twitter card.
  sharp(og).png({ compressionLevel: 9 }).toFile("public/og.png"),
]);

console.log("assets written");
