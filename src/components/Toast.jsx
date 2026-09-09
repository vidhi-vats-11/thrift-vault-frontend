import { CheckCircle2, ShoppingBag, Heart, X, AlertCircle } from "lucide-react"
import { useCart } from "../context/CartContext"

const ICONS = {
  success: CheckCircle2,
  cart: ShoppingBag,
  wishlist: Heart,
  error: AlertCircle,
}

const ACCENTS = {
  success: "border-lime/60 text-lime",
  cart: "border-lime/60 text-lime",
  wishlist: "border-pink/60 text-pink",
  error: "border-pink/70 text-pink",
}

const BUBBLE_WIDTH = 190
const EDGE_GAP = 10 // keep the bubble off the viewport edges
const ARM = 12 // distance between the bubble and the button it points at

export default function Toast() {
  const { toasts, dismissToast } = useCart()

  const anchored = toasts.filter((t) => t.anchor)
  const floating = toasts.filter((t) => !t.anchor)

  return (
    <>
      {/* Anchored bubbles: pop up at the button that was clicked */}
      {anchored.map((toast) => {
        const Icon = ICONS[toast.variant] ?? CheckCircle2

        // Clamp horizontally so a card at the edge of the grid still reads
        const half = BUBBLE_WIDTH / 2
        const x = Math.min(
          Math.max(toast.anchor.x, half + EDGE_GAP),
          window.innerWidth - half - EDGE_GAP
        )
        // Flip below the button when there isn't room above it
        const above = toast.anchor.top > 80
        const y = above ? toast.anchor.top - ARM : toast.anchor.bottom + ARM

        return (
          <div
            key={toast.id}
            role="status"
            style={{
              left: x,
              top: y,
              width: BUBBLE_WIDTH,
              transform: `translate(-50%, ${above ? "-100%" : "0"})`,
            }}
            className={`pointer-events-none fixed z-[80] animate-[popIn_0.18s_ease-out] ${
              ACCENTS[toast.variant] ?? ACCENTS.success
            }`}
          >
            <div className="flex items-center gap-2 rounded-xl border border-inherit bg-surface px-3 py-2 shadow-glow">
              <Icon size={15} className="shrink-0" />
              <p className="flex-1 text-[13px] font-semibold leading-tight text-white">
                {toast.message}
              </p>
            </div>
            {/* little pointer toward the anchor */}
            <span
              className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-inherit bg-surface ${
                above ? "-bottom-[5px] border-b border-r" : "-top-[5px] border-l border-t"
              }`}
            />
          </div>
        )
      })}

      {/* Unanchored toasts (newsletter, order status) stack at the bottom */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4">
        {floating.map((toast) => {
          const Icon = ICONS[toast.variant] ?? CheckCircle2
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-lg animate-[popIn_0.2s_ease-out] ${
                ACCENTS[toast.variant] ?? ACCENTS.success
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <p className="flex-1 text-sm font-medium text-white/90">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
                className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
