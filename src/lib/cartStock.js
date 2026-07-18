import { getPrimaryImageUrl } from './productImages'
import { SITE_URL } from '../Components/SEO/siteConfig'

export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function getProductStock(product) {
  return Math.max(0, Math.floor(Number(product?.stock) || 0))
}

/** Admin flag or zero stock — product stays visible, bag add blocked. */
export function isProductSoldOut(product) {
  if (!product) return false
  if (product.out_of_stock === true) return true
  return getProductStock(product) <= 0
}

export function productToCartLine(product, quantity = 1) {
  if (!product?.name) {
    console.warn('[cart] product missing name — check admin catalogue row', product?.id ?? product)
  }
  return {
    productId: product.id,
    name: product.name ?? 'Product',
    price: Number(product.price) || 0,
    imageUrl: getPrimaryImageUrl(product),
    productUrl: product.id ? `${SITE_URL}/product/${product.id}` : null,
    stock: getProductStock(product),
    outOfStock: isProductSoldOut(product),
    quantity: Math.max(1, Math.floor(quantity)),
  }
}

/** @returns {{ ok: boolean, reason?: string, maxAllowed?: number, message?: string }} */
export function validateCartQuantity(stock, requestedQty, currentInCart = 0, options = {}) {
  const soldOut = options.soldOut ?? false
  const available = soldOut ? 0 : getProductStock({ stock })
  const qty = Math.floor(Number(requestedQty) || 0)

  if (available <= 0) {
    return {
      ok: false,
      reason: 'out_of_stock',
      maxAllowed: 0,
      message: 'This product is out of stock. Request it and we will notify you when available.',
    }
  }

  if (qty < 1) {
    return {
      ok: false,
      reason: 'invalid_qty',
      maxAllowed: available - currentInCart,
      message: 'Quantity must be at least 1.',
    }
  }

  const total = currentInCart + qty
  if (total > available) {
    const canAdd = Math.max(0, available - currentInCart)
    return {
      ok: false,
      reason: 'exceeds_stock',
      maxAllowed: canAdd,
      message:
        canAdd === 0
          ? `Only ${available} in stock — you already have the maximum in your cart.`
          : `Only ${available} in stock. You can add ${canAdd} more.`,
    }
  }

  return { ok: true, maxAllowed: available - total }
}

export function getCartLineSubtotal(line) {
  return (Number(line.price) || 0) * (Number(line.quantity) || 0)
}

export function getCartTotal(lines) {
  return lines.reduce((sum, line) => sum + getCartLineSubtotal(line), 0)
}

/** Delivery fee at checkout; 0 = free delivery */
export const CHECKOUT_DELIVERY_CHARGE = 0

export function getCheckoutGrandTotal(subtotal) {
  return (Number(subtotal) || 0) + CHECKOUT_DELIVERY_CHARGE
}

export function getCartItemCount(lines) {
  return lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
}

export function findCartStockIssues(lines) {
  return lines
    .map((line) => {
      if (line.outOfStock || isProductSoldOut({ stock: line.stock, out_of_stock: line.outOfStock })) {
        return { line, issue: 'out_of_stock', message: `${line.name} is out of stock.` }
      }
      const stock = getProductStock({ stock: line.stock })
      if (line.quantity > stock) {
        return {
          line,
          issue: 'exceeds_stock',
          message: `${line.name}: only ${stock} available (you have ${line.quantity} in cart).`,
        }
      }
      return null
    })
    .filter(Boolean)
}
