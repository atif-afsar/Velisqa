import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from '../Components/Admin/AdminShell'
import { useCatalog } from '../context/CatalogContext'
import { api } from '../lib/apiClient'
import { uploadImageToCloudinary } from '../lib/cloudinaryUpload'
import { normalizeProductCategory, PRODUCT_CATEGORIES } from '../lib/productCategories'

const METALS = ['Gold plated', 'Rose gold plated', 'Silver plated', '925 silver', 'Stainless steel', 'Brass', 'Alloy']
const COLOURS = ['Gold', 'Rose gold', 'Silver', 'Oxidised', 'Multicolour']
const STYLES = ['Everyday', 'Office', 'Party', 'Wedding', 'Minimal', 'Statement', 'Traditional', 'Contemporary']
const CSV_COLUMNS = ['name', 'price', 'mrp', 'category', 'metal', 'colour', 'styles', 'search_keywords', 'stock', 'badge', 'description', 'image_urls']
const TEMPLATE = `${CSV_COLUMNS.join(',')}
"Sculpted Gold Dome Hoops",799,1299,Earrings,Gold plated,Gold,Everyday|Party,hoops|gold earrings,10,new,"Polished dome hoops with a lightweight hollow build.",https://example.com/hoop-front.jpg|https://example.com/hoop-side.jpg
`

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  row.push(field)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

const list = (value) => String(value || '').split('|').map((part) => part.trim()).filter(Boolean)

function csvRowToProduct(header, cells) {
  const get = (key) => (cells[header.indexOf(key)] ?? '').trim()
  const images = list(get('image_urls'))
  const badge = get('badge').toLowerCase()
  const mrp = get('mrp')
  return {
    name: get('name'),
    price: Number(get('price')),
    mrp: mrp ? Number(mrp) : null,
    category: normalizeProductCategory(get('category')) || get('category') || null,
    metal: get('metal') || null,
    colour: get('colour') || null,
    styles: list(get('styles')),
    search_keywords: list(get('search_keywords')).map((word) => word.toLowerCase()),
    stock: Number.parseInt(get('stock') || '1', 10) || 0,
    badge: badge === 'new' || badge === 'bestseller' ? badge : null,
    description: get('description') || null,
    image_url: images[0] || null,
    gallery_urls: images.slice(0, 10),
    out_of_stock: false,
  }
}

function rowProblems(product) {
  const problems = []
  if (!product.name) problems.push('name missing')
  if (!(product.price > 0)) problems.push('price must be > 0')
  if (product.mrp != null && !(product.mrp >= product.price)) problems.push('MRP below price')
  if (!product.image_url) problems.push('no image')
  if (product.image_url && !/^https?:\/\//.test(product.image_url)) problems.push('image must be a URL')
  return problems
}

function ResultSummary({ result }) {
  if (!result) return null
  return (
    <div className="admin-card mt-6">
      <p className="font-serif text-xl">{result.created} product{result.created === 1 ? '' : 's'} published{result.failed ? `, ${result.failed} skipped` : ''}</p>
      {result.results.some((row) => !row.ok) && (
        <ul className="mt-3 space-y-1 text-sm text-red-800">
          {result.results.filter((row) => !row.ok).map((row) => <li key={row.row}>Row {row.row}: {row.error}</li>)}
        </ul>
      )}
      <Link to="/admin/panel" className="admin-btn-ghost mt-4">Review in Products</Link>
    </div>
  )
}

// ── CSV import ──────────────────────────────────────────────────────────

function CsvImport({ onPublished }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  function load(text) {
    setResult(null)
    setError('')
    const parsed = parseCsv(text)
    if (parsed.length < 2) {
      setError('The file needs a header row and at least one product row.')
      setRows([])
      return
    }
    const header = parsed[0].map((cell) => cell.trim().toLowerCase())
    const missing = ['name', 'price', 'image_urls'].filter((key) => !header.includes(key))
    if (missing.length) {
      setError(`Missing column(s): ${missing.join(', ')}. Download the template to see the format.`)
      setRows([])
      return
    }
    setRows(parsed.slice(1, 201).map((cells) => csvRowToProduct(header, cells)))
  }

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) load(await file.text())
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'velisqa-products-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const valid = rows.filter((product) => rowProblems(product).length === 0)

  async function publish() {
    setBusy(true)
    setError('')
    try {
      const response = await api.post('/admin/products/bulk', { products: valid })
      setResult(response)
      setRows([])
      onPublished()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="admin-card">
        <p className="text-sm leading-relaxed text-[var(--a-text-2)]">
          One product per row. Separate several styles, keywords or image links with <code>|</code>. Images must be public links (Cloudinary, Google Drive direct links, your site). Up to 200 rows per file.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={downloadTemplate} className="admin-btn-ghost">Download template</button>
          <label className="admin-btn cursor-pointer">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void onFile(event)} />
          </label>
        </div>
      </div>

      {error && <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--a-text-2)]">{valid.length} of {rows.length} rows ready</p>
            <button type="button" className="admin-btn" disabled={!valid.length || busy} onClick={() => void publish()}>
              {busy ? 'Publishing…' : `Publish ${valid.length} product${valid.length === 1 ? '' : 's'}`}
            </button>
          </div>
          <div className="overflow-x-auto border border-[var(--a-line)] bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--a-canvas)] text-[11px] uppercase tracking-[0.12em] text-[var(--a-text-2)]">
                <tr><th className="p-3">Image</th><th className="p-3">Name</th><th className="p-3">Price</th><th className="p-3">Category</th><th className="p-3">Stock</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((product, index) => {
                  const problems = rowProblems(product)
                  return (
                    <tr key={index} className="border-t border-[var(--a-line)]">
                      <td className="p-3">{product.image_url ? <img src={product.image_url} alt="" className="h-12 w-10 object-cover" loading="lazy" /> : '—'}</td>
                      <td className="p-3">{product.name || '—'}</td>
                      <td className="p-3">₹{product.price || 0}{product.mrp ? <s className="ml-1 text-[var(--a-muted)]">₹{product.mrp}</s> : null}</td>
                      <td className="p-3">{product.category || '—'}</td>
                      <td className="p-3">{product.stock}</td>
                      <td className={`p-3 ${problems.length ? 'text-red-700' : 'text-[var(--a-good)]'}`}>{problems.length ? problems.join(', ') : 'Ready'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ResultSummary result={result} />
    </div>
  )
}

// ── Photos → AI drafts ──────────────────────────────────────────────────

const draftFromFilename = (file) => ({
  name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80),
  description: '',
  category: PRODUCT_CATEGORIES[0],
  metal: '',
  colour: '',
  styles: [],
  search_keywords: [],
  suggested_price: 0,
})

function PhotoDraftCard({ item, onChange, onRemove }) {
  const set = (patch) => onChange({ ...item, ...patch })
  const toggleStyle = (style) => set({ styles: item.styles.includes(style) ? item.styles.filter((s) => s !== style) : [...item.styles, style] })
  return (
    <article className="admin-card grid gap-5 md:grid-cols-[140px_minmax(0,1fr)]">
      <div>
        <div className="aspect-[4/5] overflow-hidden bg-[var(--a-canvas)]">
          {item.preview && <img src={item.preview} alt="" className="h-full w-full object-cover" />}
        </div>
        <p className={`mt-2 text-xs ${item.status === 'error' ? 'text-red-700' : 'text-[var(--a-muted)]'}`}>
          {item.status === 'uploading' && 'Uploading…'}
          {item.status === 'drafting' && 'AI is writing…'}
          {item.status === 'ready' && (item.aiUsed ? 'AI draft — please review' : 'Fill in the details')}
          {item.status === 'error' && item.error}
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={item.selected} onChange={(e) => set({ selected: e.target.checked })} disabled={item.status !== 'ready'} /> Publish
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="admin-label">Name</span><input className="admin-input" value={item.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label><span className="admin-label">Price (₹)</span><input className="admin-input" type="number" min="1" value={item.price} onChange={(e) => set({ price: e.target.value })} /></label>
        <label><span className="admin-label">MRP (₹, optional)</span><input className="admin-input" type="number" min="1" value={item.mrp} onChange={(e) => set({ mrp: e.target.value })} /></label>
        <label><span className="admin-label">Category</span>
          <select className="admin-input" value={item.category} onChange={(e) => set({ category: e.target.value })}>{PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label><span className="admin-label">Stock</span><input className="admin-input" type="number" min="0" value={item.stock} onChange={(e) => set({ stock: e.target.value })} /></label>
        <label><span className="admin-label">Metal</span>
          <select className="admin-input" value={item.metal} onChange={(e) => set({ metal: e.target.value })}><option value="">—</option>{METALS.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        <label><span className="admin-label">Colour</span>
          <select className="admin-input" value={item.colour} onChange={(e) => set({ colour: e.target.value })}><option value="">—</option>{COLOURS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <div className="sm:col-span-2">
          <span className="admin-label">Styles</span>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((style) => (
              <button key={style} type="button" onClick={() => toggleStyle(style)} className={`border px-2.5 py-1 text-xs ${item.styles.includes(style) ? 'border-ink bg-ink text-white' : 'border-[var(--a-line-strong)] text-[var(--a-text)]'}`}>{style}</button>
            ))}
          </div>
        </div>
        <label className="sm:col-span-2"><span className="admin-label">Description</span><textarea className="admin-input min-h-20" value={item.description} onChange={(e) => set({ description: e.target.value })} /></label>
        <label className="sm:col-span-2"><span className="admin-label">Search keywords (comma separated)</span><input className="admin-input" value={item.keywords} onChange={(e) => set({ keywords: e.target.value })} /></label>
        <div className="sm:col-span-2"><button type="button" onClick={onRemove} className="admin-btn-ghost">Remove</button></div>
      </div>
    </article>
  )
}

function PhotoDrafts({ onPublished }) {
  const [aiReady, setAiReady] = useState(null)
  const [items, setItems] = useState([])
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.get('/admin/ai/status').then((data) => setAiReady(Boolean(data.configured))).catch(() => setAiReady(false))
  }, [])

  const patchItem = (id, patch) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  async function processFile(id, file) {
    try {
      const uploaded = await uploadImageToCloudinary(file, { purpose: 'product' })
      patchItem(id, { imageUrl: uploaded.secure_url, publicId: uploaded.public_id, status: aiReady ? 'drafting' : 'ready' })
      let draft = draftFromFilename(file)
      let aiUsed = false
      if (aiReady) {
        try {
          draft = (await api.post('/admin/ai/product-draft', { imageUrl: uploaded.secure_url, hint: hint || undefined })).draft
          aiUsed = true
        } catch (err) {
          patchItem(id, { aiError: err.message })
        }
      }
      patchItem(id, {
        status: 'ready',
        aiUsed,
        selected: true,
        name: draft.name,
        description: draft.description || '',
        category: normalizeProductCategory(draft.category) || PRODUCT_CATEGORIES[0],
        metal: draft.metal || '',
        colour: draft.colour || '',
        styles: draft.styles || [],
        keywords: (draft.search_keywords || []).join(', '),
        price: draft.suggested_price ? String(draft.suggested_price) : '',
      })
    } catch (err) {
      patchItem(id, { status: 'error', error: err.message || 'Upload failed.' })
    }
  }

  async function onFiles(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/')).slice(0, 30)
    event.target.value = ''
    setResult(null)
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading',
      selected: false,
      name: '', description: '', category: PRODUCT_CATEGORIES[0], metal: '', colour: '', styles: [], keywords: '', price: '', mrp: '', stock: '5',
    }))
    setItems((list) => [...list, ...added])
    // Two at a time keeps uploads fast without flooding the API.
    const queue = [...added]
    await Promise.all([0, 1].map(async () => {
      while (queue.length) {
        const next = queue.shift()
        await processFile(next.id, next.file)
      }
    }))
  }

  const ready = items.filter((item) => item.status === 'ready' && item.selected)

  async function publish() {
    setBusy(true)
    setError('')
    try {
      const products = ready.map((item) => ({
        name: item.name.trim(),
        price: Number(item.price),
        mrp: item.mrp ? Number(item.mrp) : null,
        category: item.category,
        metal: item.metal || null,
        colour: item.colour || null,
        styles: item.styles,
        search_keywords: item.keywords.split(',').map((word) => word.trim().toLowerCase()).filter(Boolean),
        description: item.description.trim() || null,
        stock: Number.parseInt(item.stock, 10) || 0,
        image_url: item.imageUrl,
        gallery_urls: [item.imageUrl],
        cloudinary_public_id: item.publicId?.startsWith('local/') ? null : item.publicId || null,
        gallery_cloudinary_ids: item.publicId?.startsWith('local/') ? [] : [item.publicId],
      }))
      const response = await api.post('/admin/products/bulk', { products })
      setResult(response)
      const createdRows = new Set(response.results.filter((row) => row.ok).map((row) => row.row - 1))
      const publishedIds = new Set(ready.filter((_, index) => createdRows.has(index)).map((item) => item.id))
      setItems((list) => list.filter((item) => !publishedIds.has(item.id)))
      onPublished()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="admin-card">
        <p className="text-sm leading-relaxed text-[var(--a-text-2)]">
          Select up to 30 product photos. Each photo becomes a draft product
          {aiReady ? ' — Claude writes the name, description, category, finish, styles and keywords from the photo.' : '.'} Check every draft, set the price, then publish.
        </p>
        {aiReady === false && (
          <p className="mt-3 text-xs text-[var(--a-accent-dark)]">AI drafting is off: add <code>ANTHROPIC_API_KEY</code> to the API server <code>.env</code> to turn it on. Bulk photo upload still works.</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label>
            <span className="admin-label">Note for the AI (optional)</span>
            <input className="admin-input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. Festive collection, anti-tarnish, all gold plated" disabled={!aiReady} />
          </label>
          <label className="admin-btn cursor-pointer">
            Choose photos
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void onFiles(event)} />
          </label>
        </div>
      </div>

      {error && <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--a-text-2)]">{ready.length} selected of {items.length}</p>
            <button type="button" className="admin-btn" disabled={!ready.length || busy} onClick={() => void publish()}>
              {busy ? 'Publishing…' : `Publish ${ready.length} product${ready.length === 1 ? '' : 's'}`}
            </button>
          </div>
          {items.map((item) => (
            <PhotoDraftCard
              key={item.id}
              item={item}
              onChange={(next) => patchItem(item.id, next)}
              onRemove={() => setItems((list) => list.filter((entry) => entry.id !== item.id))}
            />
          ))}
        </div>
      )}
      <ResultSummary result={result} />
    </div>
  )
}

export default function AdminBulkProducts() {
  const [tab, setTab] = useState('photos')
  const { notifyCatalogChange } = useCatalog()
  return (
    <AdminShell title="Bulk & AI upload" subtitle="Add many products at once — from product photos (with AI-written listings) or from a spreadsheet.">
      <div className="mb-6 flex gap-6 border-b border-[var(--a-line)]">
        {[
          ['photos', 'From photos (AI)'],
          ['csv', 'From spreadsheet (CSV)'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-3 text-[12px] font-semibold uppercase tracking-[0.14em] ${tab === id ? 'border-[var(--a-accent)] text-ink' : 'border-transparent text-[var(--a-muted)] hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'photos' ? <PhotoDrafts onPublished={notifyCatalogChange} /> : <CsvImport onPublished={notifyCatalogChange} />}
    </AdminShell>
  )
}
