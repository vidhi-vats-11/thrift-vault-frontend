import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { api } from "../lib/api"

const CartContext = createContext(null)

// The API returns cart lines keyed by their own row id; the components use `key`
// for updates and removal, so map the server shape onto the one they expect.
function toLine(item) {
  return {
    key: item.id,
    productId: item.productId,
    name: item.product.name,
    brand: item.product.brand,
    image: item.product.image,
    price: item.product.price,
    size: item.size,
    qty: item.qty,
    available: item.available,
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([])
  const [subtotal, setSubtotal] = useState(0)
  const [wishlist, setWishlist] = useState([])
  const [isCartOpen, setCartOpen] = useState(false)
  const [isWishlistOpen, setWishlistOpen] = useState(false)
  const [isLoading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
  }, [])

  // `anchorEl` is the element that triggered the toast. When one is passed we
  // snapshot its position so the toast can pop up right at the button instead of
  // in a screen corner. Toasts without an anchor fall back to a bottom stack.
  const pushToast = useCallback(
    (message, variant = "success", anchorEl = null) => {
      const id = crypto.randomUUID()
      let anchor = null
      if (anchorEl?.getBoundingClientRect) {
        const rect = anchorEl.getBoundingClientRect()
        anchor = { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom }
      }
      setToasts((t) => [...t, { id, message, variant, anchor }])
      setTimeout(() => dismissToast(id), 2800)
    },
    [dismissToast]
  )

  const applyCart = useCallback((cart) => {
    setLines(cart.items.map(toLine))
    setSubtotal(cart.subtotal)
  }, [])

  const applyWishlist = useCallback((payload) => {
    setWishlist(payload.data.map((row) => row.product))
  }, [])

  // Every mutation reports failure the same way, so the shopper always finds out
  // when the server rejected something instead of seeing a silently stale cart.
  const run = useCallback(
    async (fn, { anchorEl } = {}) => {
      try {
        return await fn()
      } catch (err) {
        const message =
          err?.status === undefined
            ? "Can't reach the API — is the backend running?"
            : err.message
        pushToast(message, "error", anchorEl)
        return null
      }
    },
    [pushToast]
  )

  // CartProvider only mounts once signed in, so this always has a session.
  useEffect(() => {
    let cancelled = false
    Promise.all([api.cart.get(), api.wishlist.get()])
      .then(([cart, wish]) => {
        if (cancelled) return
        applyCart(cart)
        applyWishlist(wish)
      })
      .catch(() => {
        if (!cancelled) pushToast("Couldn't load your bag from the server.", "error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyCart, applyWishlist, pushToast])

  const refresh = useCallback(async () => {
    const cart = await run(() => api.cart.get())
    if (cart) applyCart(cart)
  }, [run, applyCart])

  const addToCart = useCallback(
    async (product, size, qty = 1, anchorEl = null) => {
      const cart = await run(
        () => api.cart.add({ productId: product.id, size, qty }),
        { anchorEl }
      )
      if (!cart) return
      applyCart(cart)
      pushToast(`Added to bag · ${size}`, "cart", anchorEl)
    },
    [run, applyCart, pushToast]
  )

  const updateQty = useCallback(
    async (key, qty) => {
      if (qty < 1) return
      const cart = await run(() => api.cart.update(key, qty))
      if (cart) applyCart(cart)
    },
    [run, applyCart]
  )

  const removeFromCart = useCallback(
    async (key) => {
      const cart = await run(() => api.cart.remove(key))
      if (cart) applyCart(cart)
    },
    [run, applyCart]
  )

  const clearCart = useCallback(async () => {
    const cart = await run(() => api.cart.clear())
    if (cart) applyCart(cart)
  }, [run, applyCart])

  const toggleWishlist = useCallback(
    async (product, anchorEl = null) => {
      const result = await run(() => api.wishlist.toggle(product.id), { anchorEl })
      if (!result) return
      applyWishlist(result)
      pushToast(
        result.saved ? "Saved to wishlist" : "Removed from wishlist",
        "wishlist",
        anchorEl
      )
    },
    [run, applyWishlist, pushToast]
  )

  const removeFromWishlist = useCallback(
    async (productId, anchorEl = null) => {
      const result = await run(() => api.wishlist.toggle(productId), { anchorEl })
      if (result) applyWishlist(result)
    },
    [run, applyWishlist]
  )

  const wishlistIds = useMemo(() => wishlist.map((p) => p.id), [wishlist])
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines])

  const value = {
    lines,
    itemCount,
    subtotal,
    isLoading,
    refresh,
    isCartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    wishlist,
    wishlistIds,
    toggleWishlist,
    removeFromWishlist,
    isWishlistOpen,
    setWishlistOpen,
    toasts,
    pushToast,
    dismissToast,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside a CartProvider")
  return ctx
}
