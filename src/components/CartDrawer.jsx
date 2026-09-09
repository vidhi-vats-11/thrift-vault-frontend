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
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
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
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
                    <th className="pb-1 font-medium">Item</th>
                    <th className="pb-1 font-medium">Qty</th>
                    <th className="pb-1 text-right font-medium">Total</th>
                    <th className="pb-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="align-top">
                      <td className="rounded-l-xl border border-r-0 border-line bg-surface2 p-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={line.image}
                            alt={line.name}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{line.name}</p>
                            <p className="text-xs text-white/40">{line.brand}</p>
                            <p className="text-xs text-white/40">
                              Size <span className="text-white/70">{line.size}</span> · {formatPrice(line.price)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border border-x-0 border-line bg-surface2 p-2">
                        <div className="flex items-center gap-1.5 rounded-full border border-line bg-ink px-1.5 py-1 w-fit">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => (line.qty === 1 ? removeFromCart(line.key) : updateQty(line.key, line.qty - 1))}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-surface2 hover:text-lime"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-white">{line.qty}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateQty(line.key, line.qty + 1)}
                            className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-surface2 hover:text-lime"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="border border-x-0 border-line bg-surface2 p-2 text-right text-sm font-semibold text-white">
                        {formatPrice(line.price * line.qty)}
                      </td>
                      <td className="rounded-r-xl border border-l-0 border-line bg-surface2 p-2">
                        <button
                          type="button"
                          aria-label={`Remove ${line.name} from cart`}
                          onClick={() => removeFromCart(line.key)}
                          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-white/40 transition-colors hover:bg-pink/10 hover:text-pink"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={clearCart}
                className="mt-1 cursor-pointer text-xs text-white/40 underline decoration-dotted hover:text-pink"
              >
                Clear entire bag
              </button>
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="mb-1 flex items-center justify-between text-sm text-white/60">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="mb-4 flex items-center justify-between text-sm text-white/60">
                <span>Shipping</span>
                <span className="text-lime">Free</span>
              </div>
              <div className="mb-4 flex items-center justify-between border-t border-dashed border-line pt-3 font-display text-base font-bold text-white">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full cursor-pointer rounded-full bg-lime py-3 text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
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
