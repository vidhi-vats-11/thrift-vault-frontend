import { X, Heart, ShoppingBag, Trash2 } from "lucide-react"
import { useCart } from "../context/CartContext"

export default function WishlistDrawer() {
  const { wishlist, isWishlistOpen, setWishlistOpen, removeFromWishlist, addToCart } = useCart()

  async function handleMoveToBag(product, anchorEl) {
    // Only drop it from the wishlist once the server has accepted it into the bag
    await addToCart(product, product.sizes[0], 1, anchorEl)
    await removeFromWishlist(product.id)
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${isWishlistOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isWishlistOpen}
    >
      <div
        onClick={() => setWishlistOpen(false)}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          isWishlistOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface transition-transform duration-300 ${
          isWishlistOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Heart size={20} className="text-pink" />
            Your Wishlist
            <span className="text-sm font-normal text-white/50">({wishlist.length})</span>
          </h2>
          <button
            type="button"
            aria-label="Close wishlist"
            onClick={() => setWishlistOpen(false)}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line hover:border-pink hover:text-pink"
          >
            <X size={18} />
          </button>
        </div>

        {wishlist.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-surface2 text-white/30">
              <Heart size={28} />
            </div>
            <p className="font-display text-white/70">Your wishlist is empty</p>
            <p className="text-sm text-white/40">Tap the heart on any piece to save it for later.</p>
            <button
              type="button"
              onClick={() => setWishlistOpen(false)}
              className="mt-2 cursor-pointer rounded-full bg-pink px-5 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
            >
              Continue Browsing
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-3">
              {wishlist.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface2 p-3"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                    <p className="text-xs text-white/40">{product.brand}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-white">${product.price}</span>
                      <span className="text-xs text-white/35 line-through">${product.originalPrice}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from wishlist`}
                      onClick={(e) => removeFromWishlist(product.id, e.currentTarget)}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-white/40 transition-colors hover:bg-pink/10 hover:text-pink"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveToBag(product, e.currentTarget)}
                      className="flex cursor-pointer items-center gap-1 rounded-full border border-line bg-ink px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:border-lime hover:bg-lime hover:text-ink"
                    >
                      <ShoppingBag size={12} /> Move to Bag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
