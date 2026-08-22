import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from '../Components/Admin/AdminShell'
import { useConfirm } from '../hooks/useConfirm'
import { supabase } from '../lib/supabaseClient'
import { isCloudinaryUploadConfigured } from '../lib/cloudinaryUpload'
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

const METAL_OPTIONS = [
  'Gold plated',
  'Rose gold plated',
  'Silver plated',
  '925 silver',
  'Stainless steel',
  'Brass',
  'Alloy',
]

const COLOUR_OPTIONS = ['Gold', 'Rose gold', 'Silver', 'Oxidised', 'Multicolour']

const STYLE_OPTIONS = [
  'Everyday',
  'Office',
  'Party',
  'Wedding',
  'Minimal',
  'Statement',
  'Traditional',
  'Contemporary',
]

const emptyForm = {
  name: '',
  price: '',
  mrp: '',
  description: '',
  category: PRODUCT_CATEGORIES[0],
  metal: '',
  colour: '',
  styles: [],
  search_keywords: '',
  stock: '1',
  out_of_stock: false,
  badge: '',
  mock_review_count: '0',
  mock_rating: '',
  is_combo: false,
  combo_product_ids: [],
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGES_PER_PRODUCT = 10
const MAX_ORIGINAL_FILE_BYTES = 15 * 1024 * 1024

async function fetchProductsFromDb() {
  return supabase.from('products').select('*').order('created_at', { ascending: false })
}

function makeGalleryItemFromUrl(url, publicId = null) {
  return { id: `url-${url}`, kind: 'existing', url, publicId }
}

function getGalleryCloudinaryIds(product) {
  const raw = product?.gallery_cloudinary_ids
  if (Array.isArray(raw)) return raw
  return []
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
  if (message.includes('hover_image_url')) {
    return `${message}\n\nRun supabase/add-hover-image.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('gallery_urls')) {
    return `${message}\n\nRun supabase/add-product-gallery.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('badge')) {
    return `${message}\n\nRun supabase/add-product-display-fields.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('out_of_stock')) {
    return `${message}\n\nRun supabase/add-product-out-of-stock.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('is_combo') || message.includes('combo_product_ids')) {
    return `${message}\n\nRun supabase/add-combo-fields.sql in the Supabase SQL Editor, then try again.`
  }
  if (message.includes('cloudinary_public_id') || message.includes('gallery_cloudinary_ids')) {
    return `${message}\n\nRun supabase/add-cloudinary-fields.sql in the Supabase SQL Editor, then try again.`
  }
  if (
    message.includes('mrp')
    || message.includes('metal')
    || message.includes('colour')
    || message.includes('styles')
    || message.includes('search_keywords')
  ) {
    return `${message}\n\nRun supabase/add-product-commerce-fields.sql in the Supabase SQL Editor, then try again.`
  }
  return message
}

function normalizeTextList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',')
  return [...new Set(source.map((item) => String(item).trim()).filter(Boolean))]
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const { notifyCatalogChange } = useCatalog()
  const fileInputId = useId()
  const hoverFileInputId = useId()

  const [products, setProducts] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [galleryItems, setGalleryItems] = useState([])
  const [hoverItemId, setHoverItemId] = useState(null)
  const [originalImageUrls, setOriginalImageUrls] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [useOosColumn, setUseOosColumn] = useState(false)
  const [oosColumnChecked, setOosColumnChecked] = useState(false)
  const [comboSearch, setComboSearch] = useState('')
  const [comboTab, setComboTab] = useState('all')
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all')
  const [adminSearchQuery, setAdminSearchQuery] = useState('')

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
    setHoverItemId(null)
    setOriginalImageUrls([])
  }

  function resetForm() {
    setForm(emptyForm)
    clearGalleryItems()
    setHoverItemId(null)
    setEditingId(null)
  }

  function setAsCoverItem(id) {
    setGalleryItems((items) => {
      const idx = items.findIndex((item) => item.id === id)
      if (idx <= 0) return items
      const target = items[idx]
      const rest = items.filter((item) => item.id !== id)
      return [target, ...rest]
    })
  }

  function handleHoverImageUpload(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const file = files[0]
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showFormError(`${file.name}: use JPG, PNG, WebP, or GIF.`)
      return
    }
    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      showFormError(`${file.name} is too large (max 15 MB before compression).`)
      return
    }
    const newItem = makeGalleryItemFromFile(file)
    setGalleryItems((items) => [...items, newItem])
    setHoverItemId(newItem.id)
    showFormNotice(`Uploaded ${file.name} and set it as the Hover Image.`)
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name ?? '',
      price: String(product.price ?? ''),
      mrp: product.mrp != null ? String(product.mrp) : '',
      description: product.description ?? '',
      category: normalizeProductCategory(product.category) ?? PRODUCT_CATEGORIES[0],
      metal: product.metal ?? '',
      colour: product.colour ?? '',
      styles: normalizeTextList(product.styles),
      search_keywords: normalizeTextList(product.search_keywords).join(', '),
      stock: String(product.stock ?? 1),
      out_of_stock: readOutOfStockFromProduct(product, useOosColumn),
      badge: product.badge ?? '',
      mock_review_count: String(product.mock_review_count ?? 0),
      mock_rating: product.mock_rating != null ? String(product.mock_rating) : '',
      is_combo: !!product.is_combo,
      combo_product_ids: product.combo_product_ids || [],
    })
    const urls = getProductImageUrls(product)
    const publicIds = getGalleryCloudinaryIds(product)
    setOriginalImageUrls(urls)
    const items = urls.map((url, index) => makeGalleryItemFromUrl(url, publicIds[index] ?? null))
    setGalleryItems(items)

    if (product.hover_image_url) {
      const match = items.find((item) => item.url === product.hover_image_url)
      if (match) {
        setHoverItemId(match.id)
      } else {
        const hoverItem = makeGalleryItemFromUrl(product.hover_image_url, product.hover_cloudinary_public_id ?? null)
        setGalleryItems((current) => [...current, hoverItem])
        setHoverItemId(hoverItem.id)
      }
    } else {
      setHoverItemId(null)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showFormError(message) {
    setFormNotice('')
    setFormError(message)
  }

  function showFormNotice(message) {
    setFormError('')
    setFormNotice(message)
  }

  function handleImagesChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const validFiles = []
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        showFormError(`${file.name}: use JPG, PNG, WebP, or GIF.`)
        continue
      }
      if (file.size > MAX_ORIGINAL_FILE_BYTES) {
        showFormError(`${file.name} is too large (max 15 MB before compression).`)
        continue
      }
      validFiles.push(file)
    }

    if (!validFiles.length) return

    const slotsLeft = MAX_IMAGES_PER_PRODUCT - galleryItems.length
    if (slotsLeft <= 0) {
      showFormError(`You can add up to ${MAX_IMAGES_PER_PRODUCT} images per product.`)
      return
    }

    const toAdd = validFiles.slice(0, slotsLeft)
    if (toAdd.length < validFiles.length) {
      showFormNotice(`Only ${toAdd.length} more image(s) added (max ${MAX_IMAGES_PER_PRODUCT} per product).`)
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
      showFormError('Please add at least one product image.')
      return
    }

    if (!form.category) {
      showFormError('Please choose a category.')
      return
    }

    const price = Number(form.price)
    const mrp = form.mrp.trim() ? Number(form.mrp) : null
    if (!Number.isFinite(price) || price <= 0) {
      showFormError('Selling price must be greater than ₹0.')
      return
    }
    if (mrp != null && (!Number.isFinite(mrp) || mrp < price)) {
      showFormError('MRP must be equal to or greater than the selling price.')
      return
    }
    if (!form.metal || !form.colour || form.styles.length === 0) {
      showFormError('Choose a metal, colour, and at least one style.')
      return
    }

    const mock_review_count = Number(form.mock_review_count || 0)
    const mock_rating = form.mock_rating ? Number(form.mock_rating) : null

    if (isNaN(mock_review_count) || mock_review_count < 0) {
      showFormError('Mock review count must be a non-negative number.')
      return
    }
    if (mock_rating != null && (isNaN(mock_rating) || mock_rating < 1 || mock_rating > 5)) {
      showFormError('Mock rating must be between 1.0 and 5.0.')
      return
    }

    setBusy(true)
    setFormError('')
    setFormNotice('')

    try {
      const keptItems = galleryItems.filter((item) => item.kind === 'existing')
      const newFiles = galleryItems.filter((item) => item.kind === 'new').map((item) => item.file)

      const uploadedAssets = newFiles.length ? await uploadProductImages(newFiles, user?.id) : []

      let uploadIndex = 0
      const itemAssetMap = new Map()

      galleryItems.forEach((item) => {
        if (item.kind === 'existing') {
          itemAssetMap.set(item.id, { url: item.url, publicId: item.publicId ?? null })
        } else {
          const asset = uploadedAssets[uploadIndex++]
          itemAssetMap.set(item.id, { url: asset.url, publicId: asset.publicId ?? null })
        }
      })

      const finalAssets = galleryItems.map((item) => itemAssetMap.get(item.id)).filter(Boolean)
      const allUrls = finalAssets.map((a) => a.url)
      const allPublicIds = finalAssets.map((a) => a.publicId)

      const primaryAsset = finalAssets[0] ?? { url: null, publicId: null }
      let hoverAsset = { url: null, publicId: null }

      if (hoverItemId && itemAssetMap.has(hoverItemId)) {
        hoverAsset = itemAssetMap.get(hoverItemId)
      }

      const badgeRaw = form.badge.trim()

      const availability = buildAvailabilityPatch({
        outOfStock: form.out_of_stock,
        stock: form.stock,
        useColumn: useOosColumn,
      })

      const row = {
        name: form.name.trim(),
        price,
        mrp,
        description: form.description.trim() || null,
        category: normalizeProductCategory(form.category),
        metal: form.metal,
        colour: form.colour,
        styles: normalizeTextList(form.styles),
        search_keywords: normalizeTextList(form.search_keywords),
        image_url: primaryAsset.url,
        hover_image_url: hoverAsset.url,
        gallery_urls: allUrls,
        cloudinary_public_id: primaryAsset.publicId,
        hover_cloudinary_public_id: hoverAsset.publicId,
        gallery_cloudinary_ids: allPublicIds,
        ...availability,
        badge: badgeRaw === 'bestseller' || badgeRaw === 'new' ? badgeRaw : null,
        mock_review_count,
        mock_rating,
        is_combo: form.is_combo,
        combo_product_ids: form.is_combo ? form.combo_product_ids : [],
      }

      const removedUrls = originalImageUrls.filter((url) => !allUrls.includes(url))

      async function persistProduct(payload) {
        if (editingId) {
          return supabase.from('products').update(payload).eq('id', editingId)
        }
        return supabase.from('products').insert({
          ...payload,
          created_by: user?.id ?? null,
        })
      }

      let { error } = await persistProduct(row)

      if (error?.message?.includes('hover_image_url') || error?.message?.includes('hover_cloudinary_public_id')) {
        const legacyRow = { ...row }
        delete legacyRow.hover_image_url
        delete legacyRow.hover_cloudinary_public_id
        ;({ error } = await persistProduct(legacyRow))
      }

      if (error?.message?.includes('cloudinary')) {
        const legacyRow = { ...row }
        delete legacyRow.cloudinary_public_id
        delete legacyRow.gallery_cloudinary_ids
        delete legacyRow.hover_cloudinary_public_id
        ;({ error } = await persistProduct(legacyRow))
      }

      if (error) {
        if (uploadedAssets.length) await deleteProductImages(uploadedAssets.map((a) => a.url))
        showFormError(formatProductSaveError(error.message))
        return
      }

      if (removedUrls.length) await deleteProductImages(removedUrls)

      resetForm()
      await refreshProducts()
      notifyCatalogChange()
    } catch (err) {
      showFormError(
        err.message ??
          (isCloudinaryUploadConfigured()
            ? 'Could not upload images to Cloudinary.'
            : 'Could not upload images. Check Cloudinary or Supabase storage settings.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct(id) {
    const ok = await confirm({
      title: 'Delete this product?',
      message: 'It will be removed from the website immediately.',
      confirmLabel: 'Delete product',
      variant: 'danger',
    })
    if (!ok) return

    const product = products.find((item) => item.id === id)

    const { data: deletedRows, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      showFormError(error.message)
      return
    }

    if (!deletedRows?.length) {
      showFormError(
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
      showFormError(formatProductSaveError(error.message))
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
    'w-full max-w-full min-w-0 box-border rounded-xl border border-[#847377]/25 bg-white px-3.5 sm:px-4 py-2.5 text-sm text-[#130006] outline-none transition focus:border-[#3d0a21]/35 focus:ring-2 focus:ring-[#d4af37]/20'

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategoryTab === 'all'
      || normalizeProductCategory(p.category) === normalizeProductCategory(selectedCategoryTab)
    const matchesSearch = !adminSearchQuery.trim()
      || p.name.toLowerCase().includes(adminSearchQuery.toLowerCase())
      || (p.search_keywords && p.search_keywords.toLowerCase().includes(adminSearchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <AdminShell
      title="Products"
      subtitle="Add, edit, or remove shop items. New customer orders are handled under Overview, UPI reviews, and Ship orders."
    >
      {ConfirmDialog}
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

          <section className="mb-10 w-full max-w-full min-w-0 box-border overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-white/80 p-3.5 sm:p-6 shadow-[0_16px_48px_rgba(19,0,6,0.05)]">
            <h2 className="font-serif text-lg font-semibold">
              {editingId ? 'Edit product' : 'Add a new product'}
            </h2>
            <p className="mt-1 text-sm text-[#847377]">
              {editingId
                ? 'Update fields and images, then save. First image is the shop thumbnail.'
                : 'Add up to 10 images. They are resized to WebP before upload.'}
            </p>

            {formError ? (
              <p className="mt-4 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError}
              </p>
            ) : null}

            {formNotice ? (
              <p className="mt-4 rounded-xl border border-[#2d6a4f]/25 bg-[#edf7f1] px-4 py-3 text-sm text-[#1f4334]">
                {formNotice}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 grid gap-4 w-full max-w-full min-w-0 box-border sm:grid-cols-2">
              <label className="sm:col-span-2 block w-full max-w-full min-w-0">
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

              {/* Combo Toggle & Configuration */}
              <div className="sm:col-span-2 rounded-xl border border-[#d4af37]/20 bg-[#fdf9f4] p-4 shadow-[0_4px_12px_rgba(19,0,6,0.02)]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded accent-[#3d0a21] cursor-pointer"
                    checked={form.is_combo}
                    onChange={(e) => setForm((f) => ({ ...f, is_combo: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-[#130006] leading-none">
                    Is this a Combo / Bundle Product?
                  </span>
                </label>
                <p className="mt-1 text-xs text-[#847377] ml-8">
                  Check this box if this product is a package bundle containing multiple individual items.
                </p>

                {form.is_combo && (
                  <div className="mt-4 border-t border-[#847377]/10 pt-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#3d0a21]">
                      Configure Combo Products
                    </h3>

                    {/* Selected products list & Merged Price */}
                    <div className="rounded-xl bg-[#3d0a21]/5 p-4 border border-[#3d0a21]/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#514347]">
                          Selected Products ({form.combo_product_ids.length})
                        </span>
                        {form.combo_product_ids.length > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#130006]">
                              Merged Price: ₹{
                                products
                                  .filter((p) => form.combo_product_ids.includes(p.id))
                                  .reduce((sum, p) => sum + (Number(p.price) || 0), 0)
                                  .toLocaleString('en-IN')
                              }
                              {products.filter((p) => form.combo_product_ids.includes(p.id)).some(p => p.mrp) && (
                                <span className="text-xs font-normal text-[#847377] line-through ml-1.5">
                                  ₹{
                                    products
                                      .filter((p) => form.combo_product_ids.includes(p.id))
                                      .reduce((sum, p) => sum + (Number(p.mrp) || Number(p.price) || 0), 0)
                                      .toLocaleString('en-IN')
                                  }
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const sel = products.filter((p) => form.combo_product_ids.includes(p.id));
                                const sumPrice = sel.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
                                const sumMrp = sel.reduce((sum, p) => sum + (Number(p.mrp) || Number(p.price) || 0), 0);
                                setForm((f) => ({
                                  ...f,
                                  price: String(sumPrice),
                                  mrp: sumMrp > sumPrice ? String(sumMrp) : '',
                                }));
                              }}
                              className="rounded bg-[#3d0a21] hover:bg-[#3d0a21]/90 text-[10px] font-bold text-[#fdf9f4] px-2.5 py-1 uppercase tracking-wider transition"
                            >
                              Apply Price
                            </button>
                          </div>
                        )}
                      </div>

                      {form.combo_product_ids.length === 0 ? (
                        <p className="mt-2 text-xs italic text-[#847377]">
                          No products selected. Search and select products below.
                        </p>
                      ) : (
                        <div className="mt-2.5 flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                          {products
                            .filter((p) => form.combo_product_ids.includes(p.id))
                            .map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 rounded-lg bg-white border border-[#847377]/15 p-1.5 pr-2.5 shadow-sm"
                              >
                                <img
                                  src={getProductImageUrls(p)[0] || ''}
                                  alt=""
                                  className="h-7 w-7 rounded object-cover"
                                />
                                <div className="text-[11px] leading-tight">
                                  <div className="font-semibold text-[#130006] line-clamp-1 max-w-[120px]">
                                    {p.name}
                                  </div>
                                  <div className="text-[#847377]">
                                    ₹{Number(p.price).toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      combo_product_ids: f.combo_product_ids.filter((id) => id !== p.id),
                                    }))
                                  }
                                  className="text-red-700 hover:text-red-950 text-xs font-bold pl-1"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Filter and Search */}
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          placeholder="Search products to add..."
                          value={comboSearch}
                          onChange={(e) => setComboSearch(e.target.value)}
                          className="w-full sm:w-64 rounded-lg border border-[#847377]/25 bg-white px-3 py-1.5 text-xs text-[#130006] outline-none focus:border-[#3d0a21]/35"
                        />
                        {/* Tabs / Category filter pills */}
                        <div className="flex flex-wrap gap-1 items-center max-h-24 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => setComboTab('all')}
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                              comboTab === 'all'
                                ? 'bg-[#3d0a21] text-[#fdf9f4]'
                                : 'bg-[#847377]/10 text-[#514347] hover:bg-[#847377]/15'
                            }`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setComboTab('new')}
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                              comboTab === 'new'
                                ? 'bg-[#3d0a21] text-[#fdf9f4]'
                                : 'bg-[#847377]/10 text-[#514347] hover:bg-[#847377]/15'
                            }`}
                          >
                            New Arrivals
                          </button>
                          {PRODUCT_CATEGORIES.map((cat) => {
                            const hasProducts = products.some((p) => normalizeProductCategory(p.category) === cat && p.id !== editingId);
                            if (!hasProducts) return null;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setComboTab(cat)}
                                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                                  comboTab === cat
                                    ? 'bg-[#3d0a21] text-[#fdf9f4]'
                                    : 'bg-[#847377]/10 text-[#514347] hover:bg-[#847377]/15'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scrollable grid of products to select */}
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 max-h-60 overflow-y-auto border border-[#847377]/15 rounded-xl bg-white p-2.5">
                        {products
                          .filter((p) => p.id !== editingId)
                          .filter((p) => {
                            // Apply Tab Filter
                            if (comboTab === 'new') {
                              const isNew = p.badge === 'new' || (p.created_at && (new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
                              if (!isNew) return false;
                            } else if (comboTab !== 'all') {
                              if (normalizeProductCategory(p.category) !== comboTab) return false;
                            }
                            // Apply Search Filter
                            if (comboSearch.trim()) {
                              const q = comboSearch.toLowerCase();
                              const nameMatch = p.name?.toLowerCase().includes(q);
                              const catMatch = p.category?.toLowerCase().includes(q);
                              const descMatch = p.description?.toLowerCase().includes(q);
                              if (!nameMatch && !catMatch && !descMatch) return false;
                            }
                            return true;
                          })
                          .map((p) => {
                            const isSelected = form.combo_product_ids.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setForm((f) => {
                                    const exists = f.combo_product_ids.includes(p.id);
                                    const nextIds = exists
                                      ? f.combo_product_ids.filter((id) => id !== p.id)
                                      : [...f.combo_product_ids, p.id];
                                    
                                    let extra = {};
                                    if (!exists && f.combo_product_ids.length === 0) {
                                      extra = {
                                        price: String(p.price || ''),
                                        mrp: String(p.mrp || p.price || ''),
                                      };
                                    } else {
                                      const prevSel = products.filter((prevP) => f.combo_product_ids.includes(prevP.id));
                                      const prevSum = prevSel.reduce((sum, prevP) => sum + (Number(prevP.price) || 0), 0);
                                      if (f.price === '' || Number(f.price) === prevSum) {
                                        const nextSel = products.filter((nextP) => nextIds.includes(nextP.id));
                                        const nextSum = nextSel.reduce((sum, nextP) => sum + (Number(nextP.price) || 0), 0);
                                        const nextMrp = nextSel.reduce((sum, nextP) => sum + (Number(nextP.mrp) || Number(nextP.price) || 0), 0);
                                        extra = {
                                          price: nextSum > 0 ? String(nextSum) : '',
                                          mrp: nextMrp > nextSum ? String(nextMrp) : '',
                                        };
                                      }
                                    }
                                    
                                    return {
                                      ...f,
                                      combo_product_ids: nextIds,
                                      ...extra,
                                    };
                                  });
                                }}
                                className={`flex items-start gap-2.5 rounded-lg border p-2 cursor-pointer transition select-none ${
                                  isSelected
                                    ? 'border-[#3d0a21] bg-[#3d0a21]/5 ring-1 ring-[#3d0a21]'
                                    : 'border-[#847377]/15 bg-[#fdf9f4]/20 hover:border-[#847377]/35'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="mt-1 h-3.5 w-3.5 accent-[#3d0a21] pointer-events-none"
                                />
                                <div className="min-w-0 flex-1">
                                  <img
                                    src={getProductImageUrls(p)[0] || ''}
                                    alt=""
                                    className="aspect-square w-full rounded object-cover bg-gray-100 max-h-16"
                                  />
                                  <div className="mt-1.5 font-semibold text-[11px] text-[#130006] truncate">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-[#847377]">
                                    {normalizeProductCategory(p.category)}
                                  </div>
                                  <div className="mt-0.5 text-xs font-bold text-[#130006]">
                                    ₹{Number(p.price).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Selling price (₹)
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </label>

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  MRP (₹)
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
                  placeholder="Leave empty when not discounted"
                />
                <p className="mt-1 text-xs text-[#847377]">Must not be lower than the selling price.</p>
              </label>

              <label className="block w-full max-w-full min-w-0 box-border">
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

              <label className="flex items-start gap-3 rounded-xl border border-[#847377]/20 bg-[#fdf9f4] p-3 sm:px-4 sm:py-3 sm:col-span-2 w-full max-w-full min-w-0 box-border overflow-hidden">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[#3d0a21]"
                  checked={form.out_of_stock}
                  onChange={(e) => setForm((f) => ({ ...f, out_of_stock: e.target.checked }))}
                />
                <span className="text-xs sm:text-sm leading-relaxed text-[#514347] min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                    Out of stock
                  </span>
                  Shoppers see “Out of stock” and “Enquire this product” on the website. Stock count
                  above is kept for your records.
                </span>
              </label>

              <label className="sm:col-span-2 block w-full max-w-full min-w-0 box-border">
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
                  Ratings and review counts come only from approved customer reviews. Auto badge:
                  New (30 days) or Bestseller (80+ approved reviews).
                </p>
              </label>

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Mock Review Count (Admin)
                </span>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="e.g. 150"
                  value={form.mock_review_count}
                  onChange={(e) => setForm((f) => ({ ...f, mock_review_count: e.target.value }))}
                />
              </label>

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Mock Average Rating (1.0 - 5.0)
                </span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  className={inputClass}
                  placeholder="e.g. 4.8"
                  value={form.mock_rating}
                  onChange={(e) => setForm((f) => ({ ...f, mock_rating: e.target.value }))}
                />
              </label>

              <label className="sm:col-span-2 block w-full max-w-full min-w-0 box-border">
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

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Metal / material
                </span>
                <select
                  className={inputClass}
                  value={form.metal}
                  onChange={(e) => setForm((f) => ({ ...f, metal: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select metal</option>
                  {METAL_OPTIONS.map((metal) => (
                    <option key={metal} value={metal}>{metal}</option>
                  ))}
                </select>
              </label>

              <label className="block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Colour
                </span>
                <select
                  className={inputClass}
                  value={form.colour}
                  onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select colour</option>
                  {COLOUR_OPTIONS.map((colour) => (
                    <option key={colour} value={colour}>{colour}</option>
                  ))}
                </select>
              </label>

              <fieldset className="rounded-xl border border-[#847377]/20 bg-[#fdf9f4] p-3.5 sm:p-4 sm:col-span-2 w-full max-w-full min-w-0 box-border overflow-hidden">
                <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Styles / occasions
                </legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
                  {STYLE_OPTIONS.map((style) => (
                    <label key={style} className="flex items-center gap-2 text-sm text-[#514347] min-w-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#3d0a21] shrink-0"
                        checked={form.styles.includes(style)}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          styles: event.target.checked
                            ? [...current.styles, style]
                            : current.styles.filter((item) => item !== style),
                        }))}
                      />
                      <span className="truncate">{style}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="sm:col-span-2 block w-full max-w-full min-w-0 box-border">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                  Search keywords
                </span>
                <input
                  className={inputClass}
                  value={form.search_keywords}
                  onChange={(e) => setForm((f) => ({ ...f, search_keywords: e.target.value }))}
                  placeholder="gift for her, dainty jewellery, floral pendant"
                />
                <p className="mt-1 text-xs text-[#847377]">
                  Optional comma-separated phrases customers may type.
                </p>
              </label>

              <div className="sm:col-span-2 space-y-4 rounded-xl border border-[#d4af37]/20 bg-[#fdf9f4] p-3.5 sm:p-4 shadow-sm min-w-0 max-w-full overflow-hidden box-border">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#847377]/15 pb-3 min-w-0">
                  <div className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wide text-[#3d0a21] break-words whitespace-normal leading-snug">
                      Product Images & Cover/Hover Roles ({galleryItems.length}/{MAX_IMAGES_PER_PRODUCT})
                    </span>
                    <p className="text-xs text-[#847377] mt-1 leading-relaxed break-words whitespace-normal">
                      First image is Cover (Primary). Select any image below to set it as the Hover/Touch Image.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                    <label
                      htmlFor={fileInputId}
                      className={`cursor-pointer rounded-lg bg-[#3d0a21] px-3 py-2 text-xs font-semibold text-white text-center hover:bg-[#3d0a21]/90 transition ${
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
                      + Add Gallery Images
                    </label>
                    <label
                      htmlFor={hoverFileInputId}
                      className={`cursor-pointer rounded-lg border border-[#3d0a21] bg-white px-3 py-2 text-xs font-semibold text-[#3d0a21] text-center hover:bg-[#f9f5f0] transition ${
                        galleryItems.length >= MAX_IMAGES_PER_PRODUCT ? 'pointer-events-none opacity-50' : ''
                      }`}
                    >
                      <input
                        id={hoverFileInputId}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={galleryItems.length >= MAX_IMAGES_PER_PRODUCT}
                        onChange={handleHoverImageUpload}
                      />
                      + Upload Dedicated Hover Image
                    </label>
                  </div>
                </div>

                {/* Role Summary Grid */}
                <div className="grid gap-3 sm:grid-cols-2 min-w-0">
                  {/* Cover Image Preview */}
                  <div className="flex items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50/60 p-2.5 min-w-0 overflow-hidden">
                    {galleryItems[0] ? (
                      <img
                        src={galleryItems[0].kind === 'existing' ? galleryItems[0].url : galleryItems[0].preview}
                        alt="Cover preview"
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover border border-amber-400/50 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-amber-100/70 flex items-center justify-center text-[10px] text-amber-900 font-bold shrink-0">
                        No Cover
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white mb-1">
                        COVER IMAGE (PRIMARY)
                      </span>
                      <p className="text-xs font-medium text-amber-950 leading-snug break-words whitespace-normal">
                        {galleryItems[0] ? 'Image #1 (Shop thumbnail)' : 'Add image to set cover'}
                      </p>
                    </div>
                  </div>

                  {/* Hover Image Preview */}
                  {(() => {
                    const hoverItem = galleryItems.find((item) => item.id === hoverItemId)
                    return (
                      <div className="flex items-center gap-3 rounded-lg border border-indigo-300/60 bg-indigo-50/60 p-2.5 min-w-0 overflow-hidden">
                        {hoverItem ? (
                          <img
                            src={hoverItem.kind === 'existing' ? hoverItem.url : hoverItem.preview}
                            alt="Hover preview"
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg object-cover border border-indigo-400/50 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-indigo-100/70 flex items-center justify-center text-[10px] text-indigo-900 font-bold shrink-0">
                            None
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="inline-block rounded-full bg-indigo-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              HOVER IMAGE (SECONDARY)
                            </span>
                            {hoverItem && (
                              <button
                                type="button"
                                onClick={() => setHoverItemId(null)}
                                className="text-[10px] font-bold text-red-700 hover:text-red-900 underline shrink-0"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-xs font-medium text-indigo-950 leading-snug break-words whitespace-normal">
                            {hoverItem ? 'Active on desktop hover & mobile touch' : 'No hover image set (uses primary image only)'}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {galleryItems.length > 0 && (
                  <ul className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                    {galleryItems.map((item, idx) => {
                      const isCover = idx === 0
                      const isHover = item.id === hoverItemId

                      return (
                        <li
                          key={item.id}
                          className={`overflow-hidden rounded-xl border bg-white shadow-sm transition min-w-0 ${
                            isCover
                              ? 'border-amber-400 ring-2 ring-amber-400/40'
                              : isHover
                              ? 'border-indigo-400 ring-2 ring-indigo-400/40'
                              : 'border-[#847377]/15'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={item.kind === 'existing' ? item.url : item.preview}
                              alt=""
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                              {isCover && (
                                <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                                  COVER
                                </span>
                              )}
                              {isHover && (
                                <span className="rounded-full bg-indigo-700 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                                  HOVER
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Role Actions */}
                          <div className="p-2 border-t border-[#847377]/15 flex flex-wrap gap-1.5 bg-[#fdf9f4]">
                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => setAsCoverItem(item.id)}
                                className="rounded bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider transition"
                              >
                                Set Cover
                              </button>
                            )}

                            {isHover ? (
                              <button
                                type="button"
                                onClick={() => setHoverItemId(null)}
                                className="rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-950 text-[10px] font-bold px-2 py-1 uppercase tracking-wider transition border border-indigo-300"
                              >
                                Remove Hover
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setHoverItemId(item.id)}
                                className="rounded bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider transition"
                              >
                                Set Hover
                              </button>
                            )}
                          </div>

                          {/* Position Shift & Delete Controls */}
                          <div className="flex border-t border-[#847377]/15 bg-[#f1ede8]">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveGalleryItem(item.id, -1)}
                              className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#514347] hover:bg-white disabled:opacity-30"
                              aria-label="Move image earlier"
                            >
                              ← Move
                            </button>
                            <button
                              type="button"
                              disabled={idx === galleryItems.length - 1}
                              onClick={() => moveGalleryItem(item.id, 1)}
                              className="flex-1 border-x border-[#847377]/15 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#514347] hover:bg-white disabled:opacity-30"
                              aria-label="Move image later"
                            >
                              Move →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isHover) setHoverItemId(null)
                                removeGalleryItem(item.id)
                              }}
                              className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-800 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      )
                    })}
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
                : selectedCategoryTab !== 'all' || adminSearchQuery.trim() !== ''
                ? `Found ${filteredProducts.length} of ${products.length} products.`
                : `${products.length} product${products.length === 1 ? '' : 's'} on the website.`}
            </p>

            {/* Category tabs & Search box */}
            <div className="mt-4 flex flex-col gap-4 border-b border-[#847377]/15 pb-5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('all')}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                    selectedCategoryTab === 'all'
                      ? 'bg-[#3d0a21] text-white shadow-sm'
                      : 'bg-[#847377]/10 text-[#514347] hover:bg-[#847377]/15'
                  }`}
                >
                  All ({products.length})
                </button>
                {PRODUCT_CATEGORIES.map((cat) => {
                  const count = products.filter(
                    (p) => normalizeProductCategory(p.category) === normalizeProductCategory(cat)
                  ).length
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryTab(cat)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                        selectedCategoryTab === cat
                          ? 'bg-[#3d0a21] text-white shadow-sm'
                          : 'bg-[#847377]/10 text-[#514347] hover:bg-[#847377]/15'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>

              <div className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full rounded-full border border-[#847377]/25 bg-white px-4 py-1.5 pl-9 text-xs text-[#130006] outline-none transition placeholder:text-[#847377]/55 focus:border-[#6f334a] focus:ring-1 focus:ring-[#6f334a]/20"
                />
                <svg
                  className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#847377]/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-base font-semibold">{product.name}</h3>
                        {product.is_combo && (
                          <span className="rounded bg-[#d4af37]/20 border border-[#d4af37]/45 text-[9px] font-bold uppercase tracking-wider text-[#8a6b1f] px-1.5 py-0.5">
                            Combo
                          </span>
                        )}
                      </div>
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
    </AdminShell>
  )
}
