import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const roots = ["src/assets", "public/images"];

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
  await sharp(file).webp({ quality: 82, effort: 5 }).toFile(path.join(parsed.dir, `${parsed.name}.webp`));
}

const files = (await Promise.all(roots.map(walk)))
  .flat()
  .filter((file) => /\.(png|jpe?g)$/i.test(file))
  .filter((file) => file.replace(/\\/g, "/") !== "public/images/logo.png");

await Promise.all(files.map(optimizeImage));
console.log(`Optimized ${files.length} image assets to WebP.`);
