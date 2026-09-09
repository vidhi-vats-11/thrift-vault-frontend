import { useEffect, useState } from "react"
import { X, Heart, Minus, Plus, ShoppingBag, Star, Leaf, ArrowRight } from "lucide-react"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/currency"

export default function ProductModal({ product, onClose, onViewDetails }) {
  const { addToCart, wishlistIds, toggleWishlist } = useCart()
  const [size, setSize] = useState(product?.sizes?.[0] ?? null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (product) {
      setSize(product.sizes[0])
      setQty(1)
    }
  }, [product])

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose()
    }
    if (product) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [product, onClose])

  if (!product) return null
  const isWishlisted = wishlistIds.includes(product.id)
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border border-line bg-surface sm:flex-row">
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-pink"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-[4/5] shrink-0 bg-surface2 sm:w-1/2">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          {product.tag && (
            <span className="absolute left-3 top-3 rounded-full bg-lime px-3 py-1 text-[11px] font-bold uppercase text-ink">
              {product.tag}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">{product.brand}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">{product.name}</h2>

          <div className="mt-2 flex items-center gap-3 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Star size={13} className="fill-lime text-lime" /> {product.rating} ({product.reviews} reviews)
            </span>
            <span className="flex items-center gap-1">
              <Leaf size={13} className="text-lime" /> {product.era} era
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="font-display text-3xl font-bold text-white">{formatPrice(product.price)}</span>
            <span className="text-sm text-white/35 line-through">{formatPrice(product.originalPrice)}</span>
            <span className="rounded-full bg-lime/15 px-2 py-0.5 text-xs font-semibold text-lime">
              -{discount}%
            </span>
          </div>

          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/60">
            {product.description}
          </p>

          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="mt-2 flex cursor-pointer items-center gap-1 text-sm font-semibold text-lime hover:underline"
          >
            See full details, photos & {product.reviews} reviews <ArrowRight size={14} />
          </button>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    size === s
                      ? "border-lime bg-lime text-ink"
                      : "border-line bg-surface2 text-white/70 hover:border-lime/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Qty</p>
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface2 px-2 py-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-ink hover:text-lime"
              >
                <Minus size={13} />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-white">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-ink hover:text-lime"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="mt-auto flex gap-2 pt-6">
            <button
              type="button"
              onClick={(e) => {
                addToCart(product, size, qty, e.currentTarget)
                onClose()
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
            >
              <ShoppingBag size={16} /> Add to Bag · {formatPrice(product.price * qty)}
            </button>
            <button
              type="button"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={(e) => toggleWishlist(product, e.currentTarget)}
              className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-surface2 text-white/70 transition-colors hover:border-pink hover:text-pink"
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} className={isWishlisted ? "text-pink" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
