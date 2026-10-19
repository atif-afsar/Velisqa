import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "src", "assets");
const imageExt = /\.(webp|avif|png|jpe?g)$/i;

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
        if (entry.name === "node_modules" || entry.name === "assets" || entry.name === "dist") return [];
        return collectSourceFiles(resolved);
      }

      return /\.(jsx?|tsx?|html|css|mjs)$/.test(entry.name) ? [resolved] : [];
    })
  );

  return files.flat();
}

const allAssets = (await walk(assetsDir)).filter((file) => imageExt.test(file));
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
    // Ignore missing optional files.
  }
}

const used = new Set();

function toAssetRel(file) {
  return path.relative(assetsDir, file).replace(/\\/g, "/");
}

function markUsed(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  for (const asset of allAssets) {
    if (toAssetRel(asset) === normalized) used.add(asset);
  }
}

function markGlobUsed(globPattern) {
  const normalized = globPattern.replace(/\\/g, "/");
  const assetsIndex = normalized.indexOf("assets/");
  if (assetsIndex === -1 || !normalized.includes("*")) return;

  const pattern = normalized.slice(assetsIndex + "assets/".length);
  const slash = pattern.lastIndexOf("/");
  if (slash === -1) return;

  const dir = pattern.slice(0, slash);
  const filePattern = pattern.slice(slash + 1);
  const extensionMatch = filePattern.match(/\.([a-z0-9]+)$/i);
  if (!extensionMatch) return;

  const extension = `.${extensionMatch[1].toLowerCase()}`;
  for (const asset of allAssets) {
    const rel = toAssetRel(asset);
    const assetDir = path.posix.dirname(rel);
    if (assetDir === dir && path.posix.extname(rel).toLowerCase() === extension) {
      used.add(asset);
    }
  }
}

for (const match of content.matchAll(/["'][^"']*assets\/([^"']+)["']/g)) {
  const assetPath = match[1];
  if (assetPath.includes("*")) {
    markGlobUsed(match[0].slice(1, -1));
  } else {
    markUsed(assetPath);
  }
}

const unused = allAssets.filter((asset) => !used.has(asset)).sort();

console.log(`Total: ${allAssets.length}, Used: ${used.size}, Unused: ${unused.length}\n`);
for (const file of unused) {
  console.log(toAssetRel(file));
}
