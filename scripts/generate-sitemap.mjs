import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SITE_URL = "https://www.velisqa.com";
const lastmod = new Date().toISOString().slice(0, 10);

const routes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/collections", priority: "0.95", changefreq: "weekly" },
  { path: "/collections?category=necklace", priority: "0.85", changefreq: "weekly" },
  { path: "/collections?category=bracelet", priority: "0.85", changefreq: "weekly" },
  { path: "/collections?category=rings", priority: "0.85", changefreq: "weekly" },
  { path: "/collections?category=earrings", priority: "0.85", changefreq: "weekly" },
  { path: "/order", priority: "0.9", changefreq: "monthly" },
  { path: "/about", priority: "0.85", changefreq: "monthly" },
  { path: "/contact", priority: "0.85", changefreq: "monthly" },
  { path: "/faq", priority: "0.8", changefreq: "monthly" },
  { path: "/shipping-returns", priority: "0.75", changefreq: "monthly" },
  { path: "/privacy", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.5", changefreq: "yearly" },
  { path: "/authenticity", priority: "0.7", changefreq: "monthly" },
  { path: "/models", priority: "0.65", changefreq: "monthly" },
  { path: "/best-jewellery-in-aligarh", priority: "0.9", changefreq: "monthly" },
  { path: "/luxury-jewellery-brand-india", priority: "0.9", changefreq: "monthly" },
  { path: "/bridal-artificial-jewellery", priority: "0.88", changefreq: "monthly" },
  { path: "/fashion-jewellery-india", priority: "0.88", changefreq: "monthly" },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ({ path, priority, changefreq }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${routes.length} URLs to public/sitemap.xml`);
