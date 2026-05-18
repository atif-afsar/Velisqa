import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const roots = ["src/assets", "public/images"];
const maxWidths = [480, 768, 1200, 1600];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const resolved = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(resolved) : resolved;
    })
  );

  return files.flat();
}

async function optimizeImage(file) {
  const parsed = path.parse(file);
  const image = sharp(file);
  const metadata = await image.metadata();
  const widths = maxWidths.filter((width) => width < metadata.width);
  const outputWidths = [...widths, metadata.width];

  await Promise.all([
    sharp(file).webp({ quality: 82, effort: 5 }).toFile(path.join(parsed.dir, `${parsed.name}.webp`)),
    sharp(file).avif({ quality: 58, effort: 5 }).toFile(path.join(parsed.dir, `${parsed.name}.avif`)),
    ...outputWidths.map(async (width) => {
      const responsiveDir = path.join(parsed.dir, "responsive");
      await mkdir(responsiveDir, { recursive: true });

      return sharp(file)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(path.join(responsiveDir, `${parsed.name}-${width}.webp`));
    }),
  ]);
}

const files = (await Promise.all(roots.map(walk))).flat().filter((file) => file.endsWith(".png"));

await Promise.all(files.map(optimizeImage));
console.log(`Optimized ${files.length} PNG assets to WebP/AVIF.`);
