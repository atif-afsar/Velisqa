/**
 * One-off catalogue clean-up from the Nov 2026 audit (VELISQA_WEBSITE_FIXES section 8).
 * Only fixes that need no owner decision:
 *   - "Star Charm Necklace" listed under Bracelets → Necklace
 *   - "Classic Kada Bracelet" listed under Bracelets → Bangles
 *   - banned styles (Emerald Drop Earrings VLQ-209, Crystal Flower Drops VLQ-210,
 *     Silver-Plated Necklace VLQ-101) → hidden, if they exist
 * Duplicates, renames and MRPs are owner decisions and are only REPORTED.
 *
 *   node scripts/catalog-fixes.mjs            # dry run: prints what would change
 *   node scripts/catalog-fixes.mjs --apply    # applies the fixes
 */
import { C, closeDb, connectDb, getDb } from '../src/config/db.js'

const apply = process.argv.includes('--apply')

const CATEGORY_FIXES = [
  { match: /^\s*(velisqa\s+)?star charm necklace\s*$/i, from: 'Bracelet', to: 'Necklace' },
  { match: /^\s*(velisqa\s+)?classic kada bracelet\s*$/i, from: 'Bracelet', to: 'Bangles' },
]
const BANNED = [/emerald drop earrings/i, /crystal flower drops/i, /silver[-\s]plated necklace/i, /\bVLQ-?(209|210|101)\b/i]

await connectDb()
const products = getDb().collection(C.products)
const all = await products.find({}).toArray()

const changes = []
for (const fix of CATEGORY_FIXES) {
  for (const p of all.filter((x) => fix.match.test(x.name) && x.category === fix.from)) {
    changes.push({ id: p._id, name: p.name, set: { category: fix.to }, why: `category ${fix.from} → ${fix.to}` })
  }
}
for (const p of all) {
  const text = `${p.name} ${p.sku || ''} ${(p.search_keywords || []).join(' ')}`
  if (BANNED.some((re) => re.test(text)) && !p.hidden) changes.push({ id: p._id, name: p.name, set: { hidden: true }, why: 'banned style → hidden' })
}

console.log(apply ? 'APPLYING:' : 'DRY RUN (use --apply):')
for (const c of changes) console.log(` - ${c.name} [${c.id}]: ${c.why}`)
if (!changes.length) console.log(' - nothing to change')

if (apply) {
  for (const c of changes) await products.updateOne({ _id: c.id }, { $set: { ...c.set, updated_at: new Date() } })
}

// Report-only: owner decisions.
const published = all.filter((p) => !p.hidden)
const byName = new Map()
for (const p of published) {
  const key = p.name.trim().toLowerCase()
  byName.set(key, [...(byName.get(key) || []), p])
}
const dupes = [...byName.values()].filter((list) => list.length > 1)
console.log(`\nOWNER: ${dupes.length} duplicate names (merge into variants or rename):`)
for (const list of dupes) console.log(` - "${list[0].name}" ×${list.length}: ${list.map((p) => `₹${p.price}${p.mrp ? `/MRP ₹${p.mrp}` : ''}`).join(', ')}`)
const noMrp = published.filter((p) => p.mrp == null)
console.log(`OWNER: ${noMrp.length} published products without an MRP.`)

await closeDb()
