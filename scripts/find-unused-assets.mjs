import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "src", "assets");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(resolved) : resolved;
    })
  );
  return files.flat();
}

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "assets") return [];
        return collectSourceFiles(resolved);
      }
      if (/\.(jsx?|tsx?|html|css|mjs)$/.test(entry.name)) return [resolved];
      return [];
    })
  );
  return files.flat();
}

const imageExt = /\.(webp|avif|png|jpe?g)$/i;
const allAssets = (await walk(assetsDir)).filter((f) => imageExt.test(f));

const srcFiles = [
  ...(await collectSourceFiles(path.join(root, "src"))),
  path.join(root, "index.html"),
  path.join(root, "scripts", "optimize-images.mjs"),
];

let content = "";
for (const file of srcFiles) {
  try {
    content += `${await readFile(file, "utf8")}\n`;
  } catch {
    /* ignore */
  }
}

const used = new Set();

function markUsed(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const asset of allAssets) {
    const rel = path.relative(assetsDir, asset).replace(/\\/g, "/");
    if (rel === normalized || rel.endsWith(`/${normalized}`) || asset.replace(/\\/g, "/").endsWith(normalized)) {
      used.add(asset);
    }
  }
}

// Explicit imports gathered from the codebase
const knownImports = [
  "image2.webp",
  "image4.webp",
  "velisqa-silk.webp",
  "collection-ruby-sovereign.webp",
  "collection-azure-tiara.webp",
  "collection-celestial-pearls.webp",
  "collection-hero.webp",
  "contact-velvet-service.webp",
  "contact-boutique.webp",
  "velisqa-craftsmanship.webp",
  "collection-aethelgard-earrings.webp",
  "collection-solitaire-pendant.webp",
  "collection-obsidian-bangle.webp",
  "collection-lumina-brooch.webp",
  "velisqa-solaris-necklace.webp",
  "velisqa-solaris-ring.webp",
  "velisqa-solaris-earrings.webp",
  "velisqa-stationery.webp",
  "Bracelet/IMG_3442.PNG",
  "Bracelet/IMG_3443.PNG",
  "Bracelet/IMG_3445.PNG",
  "Bracelet/image1.png",
  "Bracelet/image2.png",
  "Bracelet/image3.png",
  "Bracelet/image4.png",
  "Necklace/IMG_3430.PNG",
  "Necklace/IMG_3440.PNG",
  "Necklace/IMG_3465.PNG",
  "Necklace/Screenshot 2026-05-18 142215.png",
  "Necklace/image1.png",
  "Earrings/image.png",
  "Earrings/image1.png",
  "Earrings/image2.png",
  "Earrings/image3.png",
  "Earrings/IMG_3463.PNG",
  "Earrings/IMG_3464.PNG",
  "Earrings/WhatsApp Image 2026-05-18 at 1.48.23 PM.jpeg",
  "Rings/image.png",
  "Rings/IMG_3468.PNG",
  "Rings/IMG_3469.PNG",
  "Rings/image1.png",
  "Rings/image2.png",
  "Rings/image3.png",
];

for (const rel of knownImports) markUsed(rel);

// Hero glob: hero/*.webp at root only
const heroDir = path.join(assetsDir, "hero");
for (const asset of allAssets) {
  const rel = path.relative(assetsDir, asset).replace(/\\/g, "/");
  if (rel.startsWith("hero/") && rel.endsWith(".webp") && !rel.includes("/responsive/")) {
    used.add(asset);
  }
}

// Match any assets/ path in source
const importMatches = content.matchAll(/assets\/[^'"\s)]+/g);
for (const match of importMatches) {
  const fragment = match[0].replace(/assets\//, "");
  markUsed(fragment);
}

const unused = allAssets.filter((a) => !used.has(a)).sort();

console.log(`Total: ${allAssets.length}, Used: ${used.size}, Unused: ${unused.length}\n`);
for (const file of unused) {
  console.log(path.relative(assetsDir, file).replace(/\\/g, "/"));
}
