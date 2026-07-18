import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import OrderFormModal from '../Components/WhatsApp/OrderFormModal'
import SEOHead from '../Components/SEO/SEOHead'
import { useCart } from '../context/CartContext'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, stockIssues, clearCart } = useCart()

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [items.length, navigate])

  if (items.length === 0) {
    return null
  }

  return (
    <>
      <SEOHead
        title="Checkout | Velisqa"
        description="Complete your Velisqa order with delivery details and payment choice."
        canonicalPath="/checkout"
        noindex
      />
      <main className="page-offset-nav min-h-screen bg-[#fdf9f4] text-[#130006]">
        <div className="container-stitch mx-auto max-w-lg px-4 py-6 sm:py-10">
          <Link
            to="/cart"
            className="mb-4 inline-flex text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377] hover:text-[#3d0a21]"
          >
            ← Back to bag
          </Link>
          <OrderFormModal
            presentation="page"
            open
            onClose={() => navigate('/cart')}
            cartItems={items}
            stockWarnings={stockIssues.map((issue) => issue.message)}
            onCheckoutSuccess={clearCart}
          />
        </div>
      </main>
    </>
  )
}
