/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver… — Bing also feeds ChatGPT and
 * Copilot search) that the site's URLs changed, so they recrawl in minutes.
 *
 * Run AFTER a production deploy:   npm run indexnow
 * Submits every URL in the deployed sitemap. The key file public/aaa3772dfab943cc40a770bcf8c03001.txt must be live.
 */
const SITE = 'https://www.velisqa.com'
const KEY = 'aaa3772dfab943cc40a770bcf8c03001'

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text()
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (!urls.length) throw new Error('No URLs found in the live sitemap')

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
})
console.log(`IndexNow: submitted ${urls.length} URLs → HTTP ${res.status}`)
if (res.status >= 400) process.exitCode = 1
