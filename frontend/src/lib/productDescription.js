/**
 * Product descriptions are stored as free text written by different people/tools: some use
 * markdown bullets ("* ", "- "), some emoji bullets ("✨ "), some **bold**. This turns them into
 * safe, uniform blocks: paragraphs and real lists. No HTML is ever injected.
 */

// Leading bullet markers: markdown, unicode bullets, and any emoji/pictograph used as a bullet.
const BULLET_RE = /^\s*(?:[*\-•·▪◦●‣]|\d+[.)]|[\p{Extended_Pictographic}☀-➿][️‍\p{Extended_Pictographic}]*)\s+/u
const EMOJI_RE = /[\p{Extended_Pictographic}️‍]/gu

function cleanInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\s)\*(\S.*?\S|\S)\*(?=\s|$|[.,;:!?])/g, '$1$2') // *italic*
    .replace(/^#{1,6}\s+/, '') // headings
    .replace(EMOJI_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** @returns {Array<{ type: 'p', text: string } | { type: 'ul', items: string[] }>} */
export function parseDescription(raw) {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let para = []
  let list = null

  const flushPara = () => {
    const text = cleanInline(para.join(' '))
    if (text) blocks.push({ type: 'p', text })
    para = []
  }
  const flushList = () => {
    if (list?.items.length) blocks.push(list)
    list = null
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }
    if (BULLET_RE.test(line)) {
      flushPara()
      const item = cleanInline(line.replace(BULLET_RE, ''))
      if (!item) continue
      if (!list) list = { type: 'ul', items: [] }
      list.items.push(item)
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return blocks
}

/** Plain text (meta descriptions, JSON-LD): bullets joined into sentences, no markdown or emoji. */
export function plainDescription(raw) {
  return parseDescription(raw)
    .map((b) => (b.type === 'p' ? b.text : b.items.map((i) => (/[.!?]$/.test(i) ? i : `${i}.`)).join(' ')))
    .join(' ')
    .trim()
}

/** Colour as a tone, never implying precious metal: "Gold" → "Gold-tone". */
export function toneLabel(colour) {
  const c = String(colour || '').trim()
  if (!c) return ''
  if (/^(gold|silver|rose gold|rose)$/i.test(c)) return `${c.charAt(0).toUpperCase()}${c.slice(1).toLowerCase()}-tone`
  return c
}

/**
 * Specification rows from structured fields. `metal` holds either a base material
 * ("Stainless steel", "Alloy") or a finish ("Gold plated"), so it goes in the right row.
 */
export function productSpecRows(product) {
  const metal = String(product?.metal || '').trim()
  const isFinish = /plat|pvd|coat|polish/i.test(metal)
  const rows = [
    metal && !isFinish && ['Material', metal],
    metal && isFinish && ['Finish / plating', metal],
    product?.colour && ['Colour', toneLabel(product.colour)],
    product?.size && ['Size', product.size],
    product?.weight && ['Weight', product.weight],
    product?.closure && ['Closure', product.closure],
  ]
  const occasions = (Array.isArray(product?.styles) ? product.styles : []).filter((s) => /everyday|office|party|wedding|festive|gift/i.test(s))
  if (occasions.length) rows.push(['Occasion', occasions.join(' · ')])
  return rows.filter(Boolean)
}
