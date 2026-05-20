import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import BuyNowButton from '../WhatsApp/BuyNowButton'

function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

function ProductCard({ product, onSelect }) {
  const priceLabel = formatInr(product.price)

  return (
    <article className="group flex h-full flex-col rounded-lg border border-[#d4af37]/15 bg-[#fbf7f1] p-2 shadow-[0_18px_44px_-28px_rgba(19,0,6,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#d4af37]/35 sm:p-3">
      <button
        type="button"
        className="aspect-[4/5] overflow-hidden rounded-md bg-[#f1ede8] text-left"
        onClick={() => onSelect(product)}
        aria-label={`View ${product.name}`}
      >
        {product.image_url ? (
          <img
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#847377]">No image</div>
        )}
      </button>

      <div className="flex flex-1 flex-col items-center px-1 pb-1 pt-3 text-center sm:pt-5">
        <button type="button" onClick={() => onSelect(product)} className="text-center">
          <h4 className="font-serif text-[1.05rem] leading-tight text-[#130006] transition hover:text-[#6f334a] sm:text-2xl">
            {product.name}
          </h4>
        </button>
        {product.category && (
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#847377]">{product.category}</p>
        )}
        <p className="type-price mt-2 text-[0.95rem] font-medium tabular-nums tracking-[0.04em] text-[#6f334a] sm:mt-2.5 sm:text-lg">
          {priceLabel}
        </p>
        <div className="mt-3 flex w-full justify-center sm:mt-4">
          <BuyNowButton productName={product.name} className="w-full px-3 py-2 sm:w-auto sm:px-5 sm:py-2.5">
            Buy Now
          </BuyNowButton>
        </div>
      </div>
    </article>
  )
}

function ProductPreviewModal({ product, onClose }) {
  useEffect(() => {
    if (!product) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [product, onClose])

  if (!product) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#130006]/80 px-3 py-4 backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close product preview" />

      <div className="relative z-10 flex max-h-[92svh] w-full max-w-5xl flex-col overflow-hidden bg-[#fbf7f1] shadow-2xl sm:max-h-[90vh] md:grid md:grid-cols-[minmax(0,1fr)_320px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#130006]/85 text-2xl leading-none text-[#ffe088] transition hover:bg-[#3d0a21]"
          aria-label="Close product preview"
        >
          &times;
        </button>

        <div className="flex min-h-0 items-center justify-center bg-[#f1ede8] p-3 sm:p-5 md:p-6">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-h-[58svh] w-full object-contain sm:max-h-[68vh] md:max-h-[78vh]"
              decoding="async"
            />
          ) : null}
        </div>

        <div className="flex flex-col justify-between gap-6 p-5 text-center sm:p-7 md:text-left">
          <div>
            <p className="label-stitch mb-3 text-xs uppercase tracking-[0.18em] text-[#847377]">Velisqa Collection</p>
            <h3 className="font-serif text-3xl leading-tight text-[#130006] sm:text-4xl">{product.name}</h3>
            <p className="type-price mt-4 font-serif text-2xl font-medium tabular-nums tracking-[0.02em] text-[#3d0a21] sm:text-3xl">
              {formatInr(product.price)}
            </p>
            {product.description && (
              <p className="mt-4 text-sm leading-7 text-[#514347]">{product.description}</p>
            )}
          </div>

          <BuyNowButton productName={product.name} className="w-full px-6 py-4">
            Buy Now
          </BuyNowButton>
        </div>
      </div>
    </div>
  )
}

export default function CatalogProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data?.length) {
          setProducts(data)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading || products.length === 0) {
    return null
  }

  return (
    <section id="catalog" className="container-stitch mb-16 scroll-mt-[calc(var(--nav-height)+1rem)] md:mb-24">
      <div className="mb-10 flex flex-col items-center px-2 text-center md:mb-12">
        <p className="type-label text-[#847377]">Curated for you</p>
        <h2 className="mt-2 type-section text-[#130006]">Latest Pieces</h2>
        <div className="mt-2 h-px w-24 bg-[#e9c349]" />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
        ))}
      </div>

      <ProductPreviewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </section>
  )
}
