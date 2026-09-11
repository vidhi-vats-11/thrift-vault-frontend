import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Truck,
  CreditCard,
  Home,
  Check,
  XCircle,
  ShoppingBag,
} from "lucide-react"
import { api } from "../lib/api"
import { useCart } from "../context/CartContext"
import { formatPrice } from "../lib/currency"
import ReturnWizard from "./ReturnWizard"

// The happy path an order walks along. Cancelled orders never enter it, so they get
// their own treatment rather than a broken-looking timeline.
const TRACK_STEPS = [
  { key: "paid", label: "Paid", icon: CreditCard },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
]

// `fulfilled` predates shipped/delivered and means the same thing as delivered,
// so it maps onto the last step rather than falling off the end.
const stepIndexFor = (status) => {
  if (status === "pending_payment") return -1
  if (status === "paid") return 0
  if (status === "shipped") return 1
  if (status === "delivered" || status === "fulfilled") return 2
  return -1
}

const STATUS_LABEL = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "On its way",
  delivered: "Delivered",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
}

const RETURN_BADGE = {
  requested: "bg-violet/20 text-violet",
  approved: "bg-lime/15 text-lime",
  rejected: "bg-pink/15 text-pink",
  completed: "bg-white/15 text-white",
}

export default function OrdersPage({ onBack, onBrowse }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [returning, setReturning] = useState(null) // { item, order }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.orders.list()
      setOrders(res.data)
    } catch (err) {
      setError(
        err?.status === undefined
          ? "Can't reach the API. Is the backend running on port 4000?"
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-lime"
      >
        <ArrowLeft size={15} /> Back to shop
      </button>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime/15 text-lime">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Your orders</h1>
            <p className="text-sm text-white/45">Track, reorder, return or exchange.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh orders"
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-lime hover:text-lime"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-white/40">
          <Loader2 size={22} className="animate-spin text-lime" /> Loading your orders...
        </div>
      ) : error ? (
        <p className="flex items-start gap-2 rounded-xl border border-pink/40 bg-pink/10 p-4 text-sm text-pink">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-surface2 text-white/30">
            <ShoppingBag size={26} />
          </div>
          <p className="font-display text-white/70">No orders yet</p>
          <p className="max-w-xs px-6 text-sm text-white/40">
            When you buy a piece it will show up here, with tracking and returns.
          </p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-1 cursor-pointer rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink"
          >
            Start shopping
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onReturn={(item) => setReturning({ item, order })}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {returning && (
        <ReturnWizard
          item={returning.item}
          order={returning.order}
          onClose={() => setReturning(null)}
          onCompleted={load}
        />
      )}
    </div>
  )
}

function OrderCard({ order, onReturn, onChanged }) {
  const { refresh, pushToast } = useCart()
  const [isReordering, setReordering] = useState(false)

  const active = stepIndexFor(order.status)
  const isCancelled = order.status === "cancelled"

  /**
   * Reorder is best-effort by necessity. Every piece is one-of-one, so items from an
   * old order have usually sold to someone else — the honest behaviour is to add
   * whatever is still available and say plainly what was not.
   *
   * This calls the cart API directly rather than going through the context's
   * addToCart: that helper swallows failures into an error toast and resolves to
   * null, which would both miscount the result and fire one red toast per sold-out
   * piece. Here a rejection is expected, not exceptional.
   */
  async function reorder() {
    setReordering(true)
    let added = 0
    const missed = []
    for (const item of order.items) {
      try {
        await api.cart.add({ productId: item.productId, size: item.size, qty: item.qty })
        added += 1
      } catch {
        missed.push(item.name)
      }
    }
    await refresh()
    setReordering(false)

    if (added === 0) {
      pushToast("Every piece from this order has sold — they're all one-of-one", "error")
    } else if (missed.length > 0) {
      pushToast(`Added ${added} to your bag · ${missed.length} already sold`, "cart")
    } else {
      pushToast(`Added ${added} ${added === 1 ? "piece" : "pieces"} to your bag`, "cart")
    }
    onChanged?.()
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-lime">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-0.5 text-xs text-white/35">
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            · {order.items.length} item{order.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap font-display text-lg font-bold text-white">
            {formatPrice(order.total)}
          </span>
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
              isCancelled ? "bg-pink/15 text-pink" : "bg-lime/15 text-lime"
            }`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Tracking timeline */}
      {isCancelled ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface2 p-3 text-sm text-white/50">
          <XCircle size={15} className="shrink-0 text-pink" />
          This order was cancelled and its pieces went back into the vault.
        </p>
      ) : (
        <div className="mt-4 flex items-center">
          {TRACK_STEPS.map((s, i) => {
            const done = i <= active
            const Icon = s.icon
            return (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${
                      done
                        ? "border-lime bg-lime/15 text-lime"
                        : "border-line bg-surface2 text-white/25"
                    }`}
                  >
                    {done && i < active ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide ${
                      done ? "text-lime" : "text-white/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < TRACK_STEPS.length - 1 && (
                  <span
                    className={`mx-1.5 -mt-5 h-0.5 flex-1 rounded-full ${
                      i < active ? "bg-lime" : "bg-surface2"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            {item.image && (
              <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{item.name}</p>
              <p className="truncate text-xs text-white/40">
                Size {item.size} · {formatPrice(item.priceCents / 100)}
              </p>
            </div>

            {item.activeReturn ? (
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  RETURN_BADGE[item.activeReturn.status] ?? "bg-white/10 text-white/60"
                }`}
                title={item.activeReturn.reference}
              >
                {item.activeReturn.type} · {item.activeReturn.status}
              </span>
            ) : item.canReturn ? (
              <button
                type="button"
                onClick={() => onReturn(item)}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:border-lime hover:text-lime"
              >
                Return
              </button>
            ) : (
              // A disabled control with no explanation reads as a bug, so the
              // server's reason is surfaced as a tooltip.
              <span
                className="shrink-0 cursor-help text-[11px] text-white/25"
                title={item.returnBlockedReason ?? ""}
              >
                —
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reorder}
          disabled={isReordering}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-lime hover:text-lime disabled:opacity-50"
        >
          {isReordering ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RotateCcw size={13} />
          )}
          Buy these again
        </button>
      </div>
    </div>
  )
}
