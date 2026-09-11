import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/currency"

export default function CartDrawer({ onCheckout }) {
  const { lines, isCartOpen, setCartOpen, removeFromCart, updateQty, subtotal, clearCart } =
    useCart()

  function handleCheckout() {
    setCartOpen(false)
    onCheckout()
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${isCartOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isCartOpen}
    >
      <div
        onClick={() => setCartOpen(false)}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <ShoppingBag size={20} className="text-lime" />
            Your Bag
            <span className="text-sm font-normal text-white/50">({lines.length})</span>
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line hover:border-lime hover:text-lime"
          >
            <X size={18} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-surface2 text-white/30">
              <ShoppingBag size={28} />
            </div>
            <p className="font-display text-white/70">Your bag is empty</p>
            <p className="text-sm text-white/40">Add some one-of-one pieces to get started.</p>
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="mt-2 cursor-pointer rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink transition-transform hover:scale-105"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* A table forced four columns to share a 375px-wide drawer, so the line
                total and the remove button were pushed off the right edge. A list of
                flex cards reflows instead: the name truncates, and the price — which
                must never wrap mid-number — is given whitespace-nowrap and its own
                row beneath the stepper. */}
            <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="flex gap-3 rounded-xl border border-line bg-surface2 p-2.5"
                >
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />

                  {/* min-w-0 is what actually lets the truncate below work: without it
                      a flex child refuses to shrink below its content width. */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{line.name}</p>
                        <p className="truncate text-xs text-white/40">
                          {line.brand} · Size <span className="text-white/70">{line.size}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${line.name} from cart`}
                        onClick={() => removeFromCart(line.key)}
                        className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/40 transition-colors hover:bg-pink/10 hover:text-pink"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink px-1.5 py-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            line.qty === 1
                              ? removeFromCart(line.key)
                              : updateQty(line.key, line.qty - 1)
                          }
                          className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-surface2 hover:text-lime"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-4 text-center text-sm font-semibold text-white">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(line.key, line.qty + 1)}
                          className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-surface2 hover:text-lime"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="min-w-0 text-right">
                        <p className="whitespace-nowrap text-sm font-semibold text-white">
                          {formatPrice(line.price * line.qty)}
                        </p>
                        {line.qty > 1 && (
                          <p className="whitespace-nowrap text-[11px] text-white/40">
                            {formatPrice(line.price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}

              <li>
                <button
                  type="button"
                  onClick={clearCart}
                  className="cursor-pointer text-xs text-white/40 underline decoration-dotted hover:text-pink"
                >
                  Clear entire bag
                </button>
              </li>
            </ul>

            <div className="border-t border-line px-4 py-4 sm:px-5">
              <div className="mb-1 flex items-center justify-between gap-3 text-sm text-white/60">
                <span>Subtotal</span>
                <span className="whitespace-nowrap">{formatPrice(subtotal)}</span>
              </div>
              <div className="mb-4 flex items-center justify-between gap-3 text-sm text-white/60">
                <span>Shipping</span>
                <span className="whitespace-nowrap text-lime">Free</span>
              </div>
              <div className="mb-4 flex items-center justify-between gap-3 border-t border-dashed border-line pt-3 font-display text-base font-bold text-white">
                <span>Total</span>
                <span className="whitespace-nowrap">{formatPrice(subtotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full cursor-pointer whitespace-nowrap rounded-full bg-lime py-3 text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
              >
                Checkout · {formatPrice(subtotal)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
