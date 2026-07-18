import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useWishlist } from '../context/WishlistContext'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../Components/Product/ProductCard'
import SEOHead from '../Components/SEO/SEOHead'

export default function Wishlist() {
  const { wishlistIds, removeFromWishlist, wishlistCount } = useWishlist()
  const { catalogVersion } = useCatalog()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const idsKey = useMemo(() => wishlistIds.join(','), [wishlistIds])

  useEffect(() => {
    let cancelled = false

    if (!wishlistIds.length) {
      setProducts([])
      setLoading(false)
      return undefined
    }

    setLoading(true)

    supabase
      .from('products')
      .select('*')
      .in('id', wishlistIds)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setProducts([])
        } else {
          const order = new Map(wishlistIds.map((id, index) => [id, index]))
          const sorted = [...(data ?? [])].sort(
            (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
          )
          setProducts(sorted)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [idsKey, wishlistIds, catalogVersion])

  const missingCount = wishlistCount - products.length

  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#130006]">
      <SEOHead
        title="Wishlist | Velisqa"
        description="Your saved Velisqa jewellery pieces — add to bag or continue shopping."
        canonicalPath="/wishlist"
      />
      <div className="container-stitch px-4 py-10 sm:py-14">
        <header className="mx-auto max-w-2xl text-center">
          <p className="type-label text-[#847377]">Saved pieces</p>
          <h1 className="mt-2 type-section">Wishlist</h1>
          <p className="mt-3 text-sm text-[#514347]">
            {wishlistCount === 0
              ? 'Tap the heart on any product to save it here.'
              : `${wishlistCount} piece${wishlistCount === 1 ? '' : 's'} saved on this device.`}
          </p>
        </header>

        {loading && wishlistCount > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: Math.min(wishlistCount, 4) }, (_, index) => (
              <div
                key={`wishlist-skeleton-${index}`}
                className="aspect-[4/5] animate-pulse rounded-lg bg-[#e8e2db]"
                aria-hidden
              />
            ))}
          </div>
        )}

        {!loading && wishlistCount === 0 && (
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-[#514347]">Your wishlist is empty.</p>
            <Link
              to="/collections"
              className="tap-target rounded-full bg-[#3d0a21] px-8 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#e9c349] transition hover:bg-[#2a0718]"
            >
              Explore collections
            </Link>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && missingCount > 0 && (
          <p className="mt-8 text-center text-xs text-[#847377]">
            {missingCount} saved item{missingCount === 1 ? '' : 's'} may no longer be available.
            <button
              type="button"
              className="ml-1 font-semibold text-[#6f334a] underline-offset-2 hover:underline"
              onClick={() => {
                const available = new Set(products.map((p) => p.id))
                wishlistIds.filter((id) => !available.has(id)).forEach(removeFromWishlist)
              }}
            >
              Clean up
            </button>
          </p>
        )}
      </div>
    </main>
  )
}
