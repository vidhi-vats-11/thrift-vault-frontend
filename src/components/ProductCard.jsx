import { Heart, Eye, ShoppingBag, Star, Check, Minus, Plus } from "lucide-react"
import { useCart } from "../context/CartContext"

const TAG_STYLES = {
  "RARE FIND": "bg-pink text-white",
  "NEW DROP": "bg-lime text-ink",
  "ONE OF ONE": "bg-violet text-white",
  TRENDING: "bg-white text-ink",
}

export default function ProductCard({ product, onQuickView, onSelectProduct }) {
  const { addToCart, updateQty, removeFromCart, lines, wishlistIds, toggleWishlist } = useCart()
  const isWishlisted = wishlistIds.includes(product.id)
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
  const defaultSize = product.sizes[0]
  const cartLine = lines.find((l) => l.productId === product.id && l.size === defaultSize)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-lime/50">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface2">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-110"
          onClick={() => onSelectProduct(product)}
        />

        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {product.tag && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${TAG_STYLES[product.tag] ?? "bg-white text-ink"}`}
            >
              {product.tag}
            </span>
          )}
          <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {product.condition}
          </span>
        </div>

        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => toggleWishlist(product, e.currentTarget)}
          className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-pink"
        >
          <Heart size={15} fill={isWishlisted ? "currentColor" : "none"} className={isWishlisted ? "text-pink" : ""} />
        </button>

        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute inset-x-2 bottom-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/60 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
        >
          <Eye size={14} /> Quick View
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span>{product.brand}</span>
          <span className="flex items-center gap-1">
            <Star size={11} className="fill-lime text-lime" /> {product.rating}
          </span>
        </div>
        <h3
          onClick={() => onSelectProduct(product)}
          className="cursor-pointer truncate font-display text-sm font-semibold text-white hover:text-lime"
        >
          {product.name}
        </h3>

        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-base font-bold text-white">${product.price}</span>
          <span className="text-xs text-white/35 line-through">${product.originalPrice}</span>
          <span className="text-xs font-semibold text-lime">-{discount}%</span>
        </div>

        {cartLine ? (
          <div className="mt-2 flex items-center justify-between rounded-full border border-lime bg-lime/10 py-1.5 pl-3 pr-1.5">
            <span className="flex items-center gap-1 text-[11px] font-bold text-lime">
              <Check size={13} /> Added to Cart
            </span>
            <div className="flex items-center gap-1 rounded-full bg-ink px-1 py-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() =>
                  cartLine.qty === 1 ? removeFromCart(cartLine.key) : updateQty(cartLine.key, cartLine.qty - 1)
                }
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/80 transition-colors hover:bg-surface2 hover:text-lime"
              >
                <Minus size={12} />
              </button>
              <span className="w-4 text-center text-xs font-bold text-white">{cartLine.qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => updateQty(cartLine.key, cartLine.qty + 1)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/80 transition-colors hover:bg-surface2 hover:text-lime"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => addToCart(product, defaultSize, 1, e.currentTarget)}
            className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-surface2 py-2 text-xs font-bold text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink"
          >
            <ShoppingBag size={14} /> Add to Bag
          </button>
        )}
      </div>
    </div>
  )
}
