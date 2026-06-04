import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import {
  deleteProductImage,
  deleteProductImages,
  uploadProductImages,
} from '../lib/productStorage'
import { getProductImageUrls } from '../lib/productImages'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { normalizeProductCategory, PRODUCT_CATEGORIES } from '../lib/productCategories'
import { isProductSoldOut } from '../lib/cartStock'
import {
  buildAvailabilityPatch,
  hasOutOfStockColumn,
  readOutOfStockFromProduct,
} from '../lib/productOutOfStock'

const BADGE_OPTIONS = [
  { value: '', label: 'Auto (new / bestseller rules)' },
  { value: 'bestseller', label: 'Bestseller' },
  { value: 'new', label: 'New' },
]

const emptyForm = {
  name: '',
  price: '',
  description: '',
  category: PRODUCT_CATEGORIES[0],
  stock: '1',
  out_of_stock: false,
  rating: '',
  review_count: '',
  badge: '',
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGES_PER_PRODUCT = 10
const MAX_ORIGINAL_FILE_BYTES = 15 * 1024 * 1024

async function fetchProductsFromDb() {
  return supabase.from('products').select('*').order('created_at', { ascending: false })
}

function makeGalleryItemFromUrl(url) {
  return { id: `url-${url}`, kind: 'existing', url }
}

function makeGalleryItemFromFile(file) {
  return {
    id: `file-${file.name}-${file.size}-${file.lastModified}`,
    kind: 'new',
    file,
    preview: URL.createObjectURL(file),
  }
}

function revokeNewItemPreview(item) {
  if (item.kind === 'new' && item.preview?.startsWith('blob:')) {
    URL.revokeObjectURL(item.preview)
  }
}

function formatProductSaveError(message) {
  if (message.includes('gallery_urls')) {
    return `${message}\n\nRun supabase/add-product-gallery.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('rating') || message.includes('review_count') || message.includes('badge')) {
    return `${message}\n\nRun supabase/add-product-display-fields.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('out_of_stock')) {
    return `${message}\n\nRun supabase/add-product-out-of-stock.sql in the Supabase SQL Editor, then try again.`
  }
  return message
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { notifyCatalogChange } = useCatalog()
  const fileInputId = useId()

  const [products, setProducts] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [galleryItems, setGalleryItems] = useState([])
  const [originalImageUrls, setOriginalImageUrls] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [useOosColumn, setUseOosColumn] = useState(false)
  const [oosColumnChecked, setOosColumnChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    hasOutOfStockColumn(supabase).then((exists) => {
      if (!cancelled) {
        setUseOosColumn(exists)
        setOosColumnChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProductsFromDb().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setFetchError(error.message)
      } else {
        setFetchError(null)
        setProducts(data ?? [])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      galleryItems.forEach(revokeNewItemPreview)
    }
  }, [galleryItems])

  async function refreshProducts() {
    setFetchError(null)
    const { data, error } = await fetchProductsFromDb()
    if (error) {
      setFetchError(error.message)
      return
    }
    setProducts(data ?? [])
  }

  function clearGalleryItems() {
    setGalleryItems((items) => {
      items.forEach(revokeNewItemPreview)
      return []
    })
    setOriginalImageUrls([])
  }

  function resetForm() {
    setForm(emptyForm)
    clearGalleryItems()
    setEditingId(null)
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name ?? '',
      price: String(product.price ?? ''),
      description: product.description ?? '',
      category: normalizeProductCategory(product.category) ?? PRODUCT_CATEGORIES[0],
      stock: String(product.stock ?? 1),
      out_of_stock: readOutOfStockFromProduct(product, useOosColumn),
      rating: product.rating != null ? String(product.rating) : '',
      review_count: product.review_count != null ? String(product.review_count) : '',
      badge: product.badge ?? '',
    })
    const urls = getProductImageUrls(product)
    setOriginalImageUrls(urls)
    setGalleryItems(urls.map(makeGalleryItemFromUrl))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleImagesChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const validFiles = []
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        alert(`${file.name}: use JPG, PNG, WebP, or GIF.`)
        continue
      }
      if (file.size > MAX_ORIGINAL_FILE_BYTES) {
        alert(`${file.name} is too large (max 15 MB before compression).`)
        continue
      }
      validFiles.push(file)
    }

    if (!validFiles.length) return

    const slotsLeft = MAX_IMAGES_PER_PRODUCT - galleryItems.length
    if (slotsLeft <= 0) {
      alert(`You can add up to ${MAX_IMAGES_PER_PRODUCT} images per product.`)
      return
    }

    const toAdd = validFiles.slice(0, slotsLeft)
    if (toAdd.length < validFiles.length) {
      alert(`Only ${toAdd.length} more image(s) added (max ${MAX_IMAGES_PER_PRODUCT} per product).`)
    }

    setGalleryItems((items) => [...items, ...toAdd.map(makeGalleryItemFromFile)])
  }

  function removeGalleryItem(id) {
    setGalleryItems((items) => {
      const removed = items.find((item) => item.id === id)
      if (removed) revokeNewItemPreview(removed)
      return items.filter((item) => item.id !== id)
    })
  }

  function moveGalleryItem(id, direction) {
    setGalleryItems((items) => {
      const idx = items.findIndex((item) => item.id === id)
      if (idx === -1) return items
      const next = idx + direction
      if (next < 0 || next >= items.length) return items
      const copy = [...items]
      ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
      return copy
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (galleryItems.length === 0) {
      alert('Please add at least one product image.')
      return
    }

    if (!form.category) {
      alert('Please choose a category.')
      return
    }

    setBusy(true)

    try {
      const keptUrls = galleryItems.filter((item) => item.kind === 'existing').map((item) => item.url)
      const newFiles = galleryItems.filter((item) => item.kind === 'new').map((item) => item.file)

      const uploadedUrls = newFiles.length ? await uploadProductImages(newFiles, user?.id) : []
      const allUrls = [...keptUrls, ...uploadedUrls]

      const ratingRaw = form.rating.trim()
      const reviewRaw = form.review_count.trim()
      const badgeRaw = form.badge.trim()

      const availability = buildAvailabilityPatch({
        outOfStock: form.out_of_stock,
        stock: form.stock,
        useColumn: useOosColumn,
      })

      const row = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        category: normalizeProductCategory(form.category),
        image_url: allUrls[0] ?? null,
        gallery_urls: allUrls,
        ...availability,
        rating: ratingRaw ? Number(ratingRaw) : null,
        review_count: reviewRaw ? Math.max(0, Math.floor(Number(reviewRaw))) : null,
        badge: badgeRaw === 'bestseller' || badgeRaw === 'new' ? badgeRaw : null,
      }

      const removedUrls = originalImageUrls.filter((url) => !allUrls.includes(url))

      if (editingId) {
        const { error } = await supabase.from('products').update(row).eq('id', editingId)

        if (error) {
          if (uploadedUrls.length) await deleteProductImages(uploadedUrls)
          alert(formatProductSaveError(error.message))
          return
        }

        if (removedUrls.length) await deleteProductImages(removedUrls)
      } else {
        const { error } = await supabase.from('products').insert({
          ...row,
          created_by: user?.id ?? null,
        })

        if (error) {
          if (uploadedUrls.length) await deleteProductImages(uploadedUrls)
          alert(formatProductSaveError(error.message))
          return
        }
      }

      resetForm()
      await refreshProducts()
      notifyCatalogChange()
    } catch (err) {
      alert(err.message ?? 'Could not upload images. Check Supabase storage and env vars.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product? It will be removed from the website immediately.')) return

    const product = products.find((item) => item.id === id)

    const { data: deletedRows, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      alert(error.message)
      return
    }

    if (!deletedRows?.length) {
      alert(
        'Product was not removed from the database. Sign in as an admin account, then try again.',
      )
      return
    }

    const urls = getProductImageUrls(product)
    if (urls.length) {
      await deleteProductImages(urls)
    } else if (product?.image_url) {
      await deleteProductImage(product.image_url)
    }

    if (editingId === id) {
      resetForm()
    }
    await refreshProducts()
    notifyCatalogChange()
  }

  async function toggleOutOfStock(product) {
    const currentlyOut = readOutOfStockFromProduct(product, useOosColumn)
    const patch = buildAvailabilityPatch({
      outOfStock: !currentlyOut,
      stock: product.stock,
      useColumn: useOosColumn,
    })

    const { error } = await supabase.from('products').update(patch).eq('id', product.id)

    if (error) {
      alert(formatProductSaveError(error.message))
      return
    }

    if (editingId === product.id) {
      setForm((f) => ({
        ...f,
        out_of_stock: !currentlyOut,
        stock: String(patch.stock ?? f.stock),
      }))
    }
    await refreshProducts()
    notifyCatalogChange()
  }

  const inputClass =
    'w-full rounded-xl border border-[#847377]/25 bg-white px-4 py-2.5 text-sm text-[#130006] outline-none transition focus:border-[#3d0a21]/35 focus:ring-2 focus:ring-[#d4af37]/20'

  return (
    <main className="min-h-screen bg-[#f9f5f0] text-[#130006]">
      <div className="page-offset-nav">
        <div className="container-stitch px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8 flex flex-col gap-4 border-b border-[#d4af37]/15 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#847377]">Velisqa</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">Admin — Products</h1>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-[#514347]">
                Add, edit, or delete shop items. Upload several photos per product — they are compressed
                automatically and shown as a swipe gallery on the product page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/collections"
                className="rounded-full border border-[#847377]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#514347] transition hover:border-[#3d0a21]/40 hover:text-[#130006]"
              >
                View collections
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full bg-[#3d0a21] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#fdf9f4] transition hover:bg-[#2a0718]"
              >
                Sign out
              </button>
            </div>
          </div>

          {oosColumnChecked && !useOosColumn && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <strong>Out-of-stock flag not in database yet.</strong> Marking out of stock sets inventory to 0
              until you run{' '}
              <code className="rounded bg-white/80 px-1 text-xs">supabase/add-product-out-of-stock.sql</code> in
              the Supabase SQL Editor (then refresh this page).
            </div>
          )}

          {fetchError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              Could not load products: {fetchError}. Confirm Supabase tables and env vars match the setup guide.
            </div>
          )}

          <section className="mb-10 rounded-2xl border border-[#d4af37]/15 bg-white/80 p-5 shadow-[0_16px_48px_rgba(19,0,6,0.05)] sm:p-6">
            <h2 className="font-serif text-lg font-semibold">
              {editingId ? 'Edit product' : 'Add a new product'}
            </h2>
            <p className="mt-1 text-sm text-[#847377]">
              {editingId
                ? 'Update fields and images, then save. First image is the shop thumbnail.'
                : 'Add up to 10 images. They are resized to WebP before upload.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Name
                </span>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Price (₹)
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Stock
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  required
                />
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-[#847377]/20 bg-[#fdf9f4] px-4 py-3 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[#3d0a21]"
                  checked={form.out_of_stock}
                  onChange={(e) => setForm((f) => ({ ...f, out_of_stock: e.target.checked }))}
                />
                <span className="text-sm leading-relaxed text-[#514347]">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                    Out of stock
                  </span>
                  Shoppers see “Out of stock” and “Enquire this product” on the website. Stock count
                  above is kept for your records.
                </span>
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Rating (0–5)
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Auto"
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </label>

              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Review count
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Auto"
                  value={form.review_count}
                  onChange={(e) => setForm((f) => ({ ...f, review_count: e.target.value }))}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Badge
                </span>
                <select
                  className={inputClass}
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                >
                  {BADGE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'auto'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#847377]">
                  Leave rating/reviews empty for stable auto values. Auto badge: New (30 days) or
                  Bestseller (80+ reviews).
                </p>
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Category
                </span>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#847377]">
                  Shown on Collections under this category (e.g. Necklace, Rings).
                </p>
              </label>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Product images ({galleryItems.length}/{MAX_IMAGES_PER_PRODUCT})
                </span>
                <label
                  htmlFor={fileInputId}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#847377]/35 bg-[#fdf9f4] px-4 py-8 text-center transition hover:border-[#3d0a21]/35 hover:bg-white ${
                    galleryItems.length >= MAX_IMAGES_PER_PRODUCT ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    disabled={galleryItems.length >= MAX_IMAGES_PER_PRODUCT}
                    onChange={handleImagesChange}
                  />
                  <span className="text-sm font-medium text-[#130006]">Click to add images</span>
                  <span className="mt-1 text-xs text-[#847377]">
                    JPG, PNG, WebP or GIF · up to 15 MB each · auto-compressed to WebP
                  </span>
                </label>

                {galleryItems.length > 0 && (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {galleryItems.map((item, idx) => (
                      <li
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-[#847377]/15 bg-[#f1ede8]"
                      >
                        <div className="relative">
                          <img
                            src={item.kind === 'existing' ? item.url : item.preview}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute left-2 top-2 rounded-full bg-[#3d0a21] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#e9c349]">
                              Cover
                            </span>
                          )}
                        </div>
                        <div className="flex border-t border-[#847377]/15">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveGalleryItem(item.id, -1)}
                            className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#514347] hover:bg-white disabled:opacity-30"
                            aria-label="Move image earlier"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={idx === galleryItems.length - 1}
                            onClick={() => moveGalleryItem(item.id, 1)}
                            className="flex-1 border-x border-[#847377]/15 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#514347] hover:bg-white disabled:opacity-30"
                            aria-label="Move image later"
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGalleryItem(item.id)}
                            className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-800 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Description
                </span>
                <textarea
                  className={`${inputClass} min-h-[100px] resize-y`}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Materials, finish, occasion, sizing… Shown on the product page."
                />
              </label>

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-[#3d0a21] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#fdf9f4] disabled:opacity-60"
                >
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-[#847377]/35 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#514347]"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold">Your products</h2>
            <p className="mt-1 text-sm text-[#514347]">
              {products.length === 0
                ? 'No products yet — use the form above to add your first piece.'
                : `${products.length} product${products.length === 1 ? '' : 's'} on the website.`}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const thumb = getProductImageUrls(product)[0]
                const imageCount = getProductImageUrls(product).length
                const soldOut = isProductSoldOut(product)
                return (
                  <article
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[#847377]/15 bg-white shadow-[0_12px_36px_rgba(19,0,6,0.04)]"
                  >
                    {thumb ? (
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f1ede8]">
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                        {imageCount > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-[#130006]/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#fdf9f4]">
                            {imageCount} photos
                          </span>
                        )}
                        {soldOut && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#c9a75a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#130006]">
                            Out of stock
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-[#f1ede8] text-xs text-[#847377]">
                        No image
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-serif text-base font-semibold">{product.name}</h3>
                      {product.category && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#847377]">
                          {product.category}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-[#514347]">
                        ₹{Number(product.price).toLocaleString('en-IN')}
                        <span className="text-[#847377]">
                          {' '}
                          · Stock {product.stock}
                          {readOutOfStockFromProduct(product, useOosColumn) && useOosColumn
                            ? ' · Marked out of stock'
                            : ''}
                        </span>
                      </p>
                      {product.description && (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#514347]/90">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/product/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full rounded-full border border-[#847377]/25 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#514347] transition hover:bg-[#f9f5f0]"
                        >
                          View on site
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleOutOfStock(product)}
                          className={`w-full rounded-full border py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                            readOutOfStockFromProduct(product, useOosColumn)
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                              : 'border-[#c9a75a]/40 bg-[#c9a75a]/10 text-[#8a6b1f] hover:bg-[#c9a75a]/20'
                          }`}
                        >
                          {readOutOfStockFromProduct(product, useOosColumn)
                            ? 'Mark in stock'
                            : 'Mark out of stock'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="flex-1 rounded-full border border-[#3d0a21]/25 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3d0a21] transition hover:bg-[#3d0a21]/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          className="flex-1 rounded-full border border-red-200 bg-red-50 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-800 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {products.length === 0 && !fetchError && (
              <p className="mt-8 text-center text-sm text-[#847377]">No products yet. Add one above.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
