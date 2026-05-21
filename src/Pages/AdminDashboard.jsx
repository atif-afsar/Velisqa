import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { deleteProductImage, uploadProductImage } from '../lib/productStorage'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { normalizeProductCategory, PRODUCT_CATEGORIES } from '../lib/productCategories'

const emptyForm = {
  name: '',
  price: '',
  description: '',
  category: PRODUCT_CATEGORIES[0],
  image_url: '',
  stock: '1',
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function fetchProductsFromDb() {
  return supabase.from('products').select('*').order('created_at', { ascending: false })
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { notifyCatalogChange } = useCatalog()

  const [products, setProducts] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)

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
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  async function refreshProducts() {
    setFetchError(null)
    const { data, error } = await fetchProductsFromDb()
    if (error) {
      setFetchError(error.message)
      return
    }
    setProducts(data ?? [])
  }

  function clearImageSelection() {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
  }

  function resetForm() {
    setForm(emptyForm)
    clearImageSelection()
    setEditingId(null)
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name ?? '',
      price: String(product.price ?? ''),
      description: product.description ?? '',
      category: normalizeProductCategory(product.category) ?? PRODUCT_CATEGORIES[0],
      image_url: product.image_url ?? '',
      stock: String(product.stock ?? 1),
    })
    clearImageSelection()
    setImagePreview(product.image_url ?? null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert('Please upload a JPG, PNG, WebP, or GIF image.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be 5 MB or smaller.')
      e.target.value = ''
      return
    }

    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const hasExistingImage = Boolean(form.image_url)
    if (!imageFile && !hasExistingImage) {
      alert('Please upload a product image.')
      return
    }

    if (!form.category) {
      alert('Please choose a category.')
      return
    }

    setBusy(true)

    let imageUrl = form.image_url.trim() || null
    let previousImageUrl = null

    try {
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile, user?.id)
        if (editingId && form.image_url) {
          previousImageUrl = form.image_url
        }
      }

      const row = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || null,
        category: normalizeProductCategory(form.category),
        image_url: imageUrl,
        stock: Number(form.stock) || 0,
      }

      if (editingId) {
        const { error } = await supabase.from('products').update(row).eq('id', editingId)

        if (error) {
          alert(error.message)
          return
        }

        if (previousImageUrl && previousImageUrl !== imageUrl) {
          await deleteProductImage(previousImageUrl)
        }
      } else {
        const { error } = await supabase.from('products').insert({
          ...row,
          created_by: user?.id ?? null,
        })

        if (error) {
          alert(error.message)
          if (imageUrl) await deleteProductImage(imageUrl)
          return
        }
      }

      resetForm()
      await refreshProducts()
      notifyCatalogChange()
    } catch (err) {
      alert(err.message ?? 'Could not upload image. Run supabase/storage-setup.sql in Supabase first.')
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

    if (product?.image_url) {
      await deleteProductImage(product.image_url)
    }

    if (editingId === id) {
      resetForm()
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
                Add, edit, or delete shop items. Each product needs an image, price, category, and
                description. Changes go live on the Collections page right away.
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
                ? 'Update the fields below, then save. The shop page updates automatically.'
                : 'Fill in every field, upload a photo, then tap Add product.'}
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
                  Product image
                </span>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#847377]/35 bg-[#fdf9f4] px-4 py-8 text-center transition hover:border-[#3d0a21]/35 hover:bg-white">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                  <span className="text-sm font-medium text-[#130006]">Click to upload image</span>
                  <span className="mt-1 text-xs text-[#847377]">JPG, PNG, WebP or GIF · max 5 MB</span>
                </label>
                {imagePreview && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[#847377]/15 bg-[#f1ede8]">
                    <img src={imagePreview} alt="Preview" className="max-h-56 w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        clearImageSelection()
                        if (editingId) {
                          setForm((f) => ({ ...f, image_url: '' }))
                        }
                      }}
                      className="w-full border-t border-[#847377]/15 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#514347] hover:bg-white"
                    >
                      Remove image
                    </button>
                  </div>
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
              {products.map((product) => (
                <article
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#847377]/15 bg-white shadow-[0_12px_36px_rgba(19,0,6,0.04)]"
                >
                  {product.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#f1ede8]">
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
                      <span className="text-[#847377]"> · Stock {product.stock}</span>
                    </p>
                    {product.description && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#514347]/90">{product.description}</p>
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
              ))}
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
