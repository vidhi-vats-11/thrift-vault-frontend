import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  Package,
  Receipt,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  ExternalLink,
  Trash2,
  Undo2,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  Truck,
  Plus,
} from "lucide-react"
import { api } from "../lib/api"
import { formatPrice } from "../lib/currency"

const STATUS_STYLES = {
  live: "bg-lime/15 text-lime",
  sold: "bg-pink/15 text-pink",
  archived: "bg-white/10 text-white/50",
  paid: "bg-lime/15 text-lime",
  pending_payment: "bg-violet/20 text-violet",
  // Without entries for these the lookup returns undefined and the <select> renders
  // as an unstyled white box — easy to miss when adding a status to the enum.
  shipped: "bg-violet/20 text-violet",
  delivered: "bg-lime/15 text-lime",
  cancelled: "bg-pink/15 text-pink",
  fulfilled: "bg-white/15 text-white",
}

/** Never let a missing key strip the styling off the control. */
const statusStyle = (status) => STATUS_STYLES[status] ?? "bg-white/10 text-white/70"

export default function AdminPage({ onBack, onSelectProduct }) {
  const [tab, setTab] = useState("products")

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-lime"
      >
        <ArrowLeft size={15} /> Back to shop
      </button>

      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-white/45">
        Changes here write straight to the database — reload the storefront to see them.
      </p>

      <div className="mt-6 inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-surface p-1">
        {[
          { key: "products", label: "Products", icon: Package },
          { key: "orders", label: "Orders", icon: Receipt },
          { key: "returns", label: "Returns", icon: Undo2 },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-bold transition-colors sm:px-5 ${
              tab === t.key ? "bg-lime text-ink" : "text-white/50 hover:text-white"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "products" ? (
          <ProductsTab onSelectProduct={onSelectProduct} />
        ) : tab === "orders" ? (
          <OrdersTab />
        ) : (
          <ReturnsTab />
        )}
      </div>
    </div>
  )
}

// ── products ──────────────────────────────────────────────────────────────────

function ProductsTab({ onSelectProduct }) {
  const [products, setProducts] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.products()
      setProducts(res.data)
    } catch (err) {
      setError(describe(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function replaceProduct(updated) {
    setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)))
  }

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={load} />

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/45">
          {products.length} products · {products.filter((p) => p.status === "live").length} live
        </p>
        <button
          type="button"
          onClick={load}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-lime hover:text-lime"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface2 text-left text-xs uppercase tracking-wide text-white/45">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Price (₹)</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onSaved={replaceProduct}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ProductRow({ product, onSaved, onSelectProduct }) {
  const [price, setPrice] = useState(String(product.price))
  const [stock, setStock] = useState(String(product.stockQuantity))
  const [status, setStatus] = useState(product.status)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rowError, setRowError] = useState(null)

  // Re-sync when the parent replaces the row after a save
  useEffect(() => {
    setPrice(String(product.price))
    setStock(String(product.stockQuantity))
    setStatus(product.status)
  }, [product])

  const dirty =
    price !== String(product.price) ||
    stock !== String(product.stockQuantity) ||
    status !== product.status

  async function save() {
    const priceValue = Number(price)
    const stockValue = Number(stock)
    if (!Number.isFinite(priceValue) || priceValue <= 0) return setRowError("Price must be > 0")
    if (!Number.isInteger(stockValue) || stockValue < 0)
      return setRowError("Stock must be 0 or more")

    setRowError(null)
    setSaving(true)
    try {
      // The API stores money as integer cents, never floats
      const updated = await api.admin.updateProduct(product.id, {
        priceCents: Math.round(priceValue * 100),
        stockQuantity: stockValue,
        status,
      })
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setRowError(describe(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b border-line last:border-0 hover:bg-surface2/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={product.image}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onSelectProduct(product)}
              className="flex cursor-pointer items-center gap-1 truncate font-semibold text-white hover:text-lime"
            >
              {product.name} <ExternalLink size={12} className="shrink-0 opacity-60" />
            </button>
            <p className="text-xs text-white/40">
              {product.brand} · {product.category}
            </p>
            {rowError && <p className="mt-1 text-xs text-pink">{rowError}</p>}
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          className="w-24 cursor-text rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-white outline-none focus:border-lime"
        />
      </td>

      <td className="px-4 py-3">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-20 cursor-text rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-white outline-none focus:border-lime"
        />
      </td>

      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold uppercase outline-none ${statusStyle(status)}`}
        >
          <option value="live" className="bg-surface text-white">live</option>
          <option value="sold" className="bg-surface text-white">sold</option>
          <option value="archived" className="bg-surface text-white">archived</option>
        </select>
      </td>

      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-lime px-4 py-1.5 text-xs font-bold text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : null}
          {saving ? "Saving" : saved ? "Saved" : "Save"}
        </button>
      </td>
    </tr>
  )
}

// ── orders ────────────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Which order is showing its "are you sure?" strip, and which is mid-delete.
  // An inline strip rather than window.confirm: a native dialog blocks the whole
  // page and can't say anything order-specific, like whether stock comes back.
  const [confirmingId, setConfirmingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.orders()
      setOrders(res.data)
    } catch (err) {
      setError(describe(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Keeps the customer block when merging a server response: order endpoints return
  // the order, not the joined user, so a naive replace would blank the contact details.
  const replaceOrder = useCallback((updated) => {
    setOrders((list) =>
      list.map((o) => (o.id === updated.id ? { ...o, ...updated, customer: o.customer } : o))
    )
  }, [])

  async function changeStatus(id, status) {
    try {
      replaceOrder(await api.admin.updateOrder(id, status))
    } catch (err) {
      setError(describe(err))
    }
  }

  async function removeOrder(id) {
    setDeletingId(id)
    setError(null)
    try {
      await api.admin.deleteOrder(id)
      // Drop it locally instead of refetching — the list is already correct.
      setOrders((list) => list.filter((o) => o.id !== id))
      setConfirmingId(null)
    } catch (err) {
      setError(describe(err))
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={load} />

  if (orders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-white/40">
        No orders yet. Buy something in the storefront and it will appear here.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/45">{orders.length} orders</p>
        <button
          type="button"
          onClick={load}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-lime hover:text-lime"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-lime">{order.id}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {order.customer?.name}{" "}
                  <span className="font-normal text-white/40">{order.customer?.email}</span>
                </p>
                <p className="text-xs text-white/35">
                  {new Date(order.createdAt).toLocaleString()} ·{" "}
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  {order.payment && ` · payment ${order.payment.status}`}
                </p>
              </div>

              {/* Wraps on a phone: a large total plus the status control and the
                  delete button do not fit on one line at 320px. */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="whitespace-nowrap font-display text-lg font-bold text-white">
                  {formatPrice(order.total)}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => changeStatus(order.id, e.target.value)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold uppercase outline-none ${statusStyle(order.status)}`}
                >
                  {/* pending_payment is listed so the current value renders, but the
                      API only accepts a move to paid / cancelled / fulfilled. */}
                  <option value="pending_payment" disabled className="bg-surface text-white">
                    pending_payment
                  </option>
                  <option value="paid" className="bg-surface text-white">paid</option>
                  <option value="shipped" className="bg-surface text-white">shipped</option>
                  <option value="delivered" className="bg-surface text-white">delivered</option>
                  <option value="fulfilled" className="bg-surface text-white">fulfilled</option>
                  <option value="cancelled" className="bg-surface text-white">cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => setConfirmingId(confirmingId === order.id ? null : order.id)}
                  title="Delete order"
                  aria-label={`Delete order ${order.id}`}
                  className="cursor-pointer rounded-full border border-line p-2 text-white/45 transition-colors hover:border-pink hover:text-pink"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              {order.items.map((item) => (
                <span
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs text-white/70"
                >
                  {item.image && (
                    <img src={item.image} alt="" className="h-6 w-6 rounded object-cover" />
                  )}
                  {item.name} · {item.size} × {item.qty}
                </span>
              ))}
            </div>

            <FulfilmentPanel order={order} onChanged={replaceOrder} onError={setError} />

            {confirmingId === order.id && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink/40 bg-pink/10 p-3">
                <p className="text-xs text-white/70">
                  Delete this order permanently? Its items and payment records go with it.
                  {order.status === "pending_payment"
                    ? " The pieces it is holding will be returned to the catalogue."
                    : " This cannot be undone."}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOrder(order.id)}
                    disabled={deletingId === order.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full bg-pink px-3 py-1.5 text-xs font-bold text-black disabled:opacity-60"
                  >
                    {deletingId === order.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── fulfilment ────────────────────────────────────────────────────────────────

/**
 * Everything needed to actually put a parcel in a box and send it.
 *
 * Deliberately one panel rather than a separate screen: whoever is packing an order
 * needs the address, the phone number and the tracking control in the same glance.
 * Splitting them across pages is how the wrong thing gets sent to the right person.
 */
function FulfilmentPanel({ order, onChanged, onError }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [label, setLabel] = useState("")
  const [location, setLocation] = useState("")
  const [eta, setEta] = useState("")

  const a = order.address
  const c = order.customer

  const run = async (key, fn) => {
    setBusy(key)
    try {
      onChanged(await fn())
    } catch (err) {
      onError(describe(err))
    } finally {
      setBusy(null)
    }
  }

  async function addCheckpoint(e) {
    e.preventDefault()
    if (!label.trim()) return
    await run("event", () =>
      api.admin.addOrderEvent(order.id, { label: label.trim(), location: location.trim() || undefined })
    )
    setLabel("")
    setLocation("")
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-lime"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Hide" : "Delivery, payment & tracking"}
      </button>

      {open && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {/* who and where */}
          <div className="min-w-0 rounded-xl border border-line bg-surface2 p-3.5">
            <h4 className="mb-2 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-lime">
              <MapPin size={13} /> Deliver to
            </h4>
            {a ? (
              <address className="not-italic text-sm leading-relaxed text-white/80">
                <span className="font-semibold text-white">{a.recipientName ?? c?.name ?? "—"}</span>
                <br />
                {a.line1}
                {a.line2 ? <>, {a.line2}</> : null}
                <br />
                {a.city}, {a.state} {a.postalCode}
                <br />
                {a.country}
              </address>
            ) : (
              <p className="text-sm text-white/40">No address on this order.</p>
            )}
            <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-2.5 text-xs">
              <Detail icon={<Phone size={12} />} label="Phone" value={a?.phone || c?.phone || "—"} />
              <Detail icon={<Mail size={12} />} label="Email" value={c?.email ?? "—"} />
              <Detail icon={<User size={12} />} label="Gender" value={c?.gender ?? "not set"} />
            </dl>
          </div>

          {/* money */}
          <div className="min-w-0 rounded-xl border border-line bg-surface2 p-3.5">
            <h4 className="mb-2 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-lime">
              <CreditCard size={13} /> Payment
            </h4>
            {order.payment ? (
              <>
                <dl className="flex flex-col gap-1 text-xs">
                  <Detail label="Status" value={order.payment.status} />
                  <Detail label="Gateway" value={order.payment.gateway} />
                  <Detail label="Reference" value={order.payment.gatewayRef} mono />
                  <Detail label="Amount" value={formatPrice(order.total)} />
                </dl>
                {order.payment.status === "captured" && (
                  <button
                    type="button"
                    onClick={() =>
                      run("refund", () => api.admin.refundPayment(order.payment.id).then(() => api.admin.orders().then((r) => r.data.find((o) => o.id === order.id))))
                    }
                    disabled={busy === "refund"}
                    className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border border-pink/50 px-3 py-1.5 text-xs font-bold text-pink transition-colors hover:bg-pink/10 disabled:opacity-50"
                  >
                    {busy === "refund" ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
                    Refund this payment
                  </button>
                )}
                {order.payment.status === "refunded" && (
                  <p className="mt-3 rounded-lg bg-pink/10 px-2.5 py-1.5 text-xs text-pink">
                    Refunded — the order was cancelled.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-white/40">No payment recorded.</p>
            )}
          </div>

          {/* tracking */}
          <div className="min-w-0 rounded-xl border border-line bg-surface2 p-3.5 lg:col-span-2">
            <h4 className="mb-2 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-lime">
              <Truck size={13} /> Tracking
            </h4>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/40">Arriving by</span>
              <input
                type="date"
                value={eta || (order.expectedDeliveryAt ? order.expectedDeliveryAt.slice(0, 10) : "")}
                onChange={(e) => setEta(e.target.value)}
                className="cursor-pointer rounded-lg border border-line bg-ink px-2.5 py-1.5 text-white outline-none focus:border-lime"
              />
              <button
                type="button"
                disabled={!eta || busy === "eta"}
                onClick={() =>
                  run("eta", () =>
                    // noon avoids the date shifting a day either way across timezones
                    api.admin.setOrderEta(order.id, new Date(eta + "T12:00:00").toISOString())
                  )
                }
                className="cursor-pointer rounded-full bg-lime px-3 py-1.5 font-bold text-ink disabled:opacity-40"
              >
                {busy === "eta" ? "Saving…" : "Set date"}
              </button>
              {order.shippedAt && (
                <span className="text-white/35">
                  Shipped {new Date(order.shippedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <form onSubmit={addCheckpoint} className="mb-3 flex flex-wrap gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Reached Mumbai hub"
                maxLength={120}
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-lime"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (optional)"
                maxLength={120}
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-lime"
              />
              <button
                type="submit"
                disabled={!label.trim() || busy === "event"}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-white/70 hover:border-lime hover:text-lime disabled:opacity-40"
              >
                {busy === "event" ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add update
              </button>
            </form>

            {order.events?.length > 0 ? (
              <ol className="flex flex-col gap-1.5 border-t border-line pt-2.5">
                {order.events.map((e) => (
                  <li key={e.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 break-words text-xs">
                    <span className="font-mono text-white/30">
                      {new Date(e.createdAt).toLocaleString(undefined, {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className="text-white/80">{e.label}</span>
                    {e.location && <span className="text-lime/70">· {e.location}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="border-t border-line pt-2.5 text-xs text-white/35">
                No tracking updates yet. Moving the status above adds one automatically.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ icon, label, value, mono }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-white/40">
        {icon}
        {label}
      </dt>
      {/* min-w-0 is what actually lets `truncate` work: a flex item defaults to
          min-width:auto and refuses to shrink below its content, so a long unbroken
          value like a gateway reference silently widens the whole card instead. */}
      <dd
        className={`min-w-0 truncate text-right text-white/80 ${mono ? "font-mono" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </dd>
    </div>
  )
}

// ── shared ────────────────────────────────────────────────────────────────────

// ── returns ───────────────────────────────────────────────────────────────────

const RETURN_STATUS_STYLES = {
  requested: "bg-violet/20 text-violet",
  approved: "bg-lime/15 text-lime",
  rejected: "bg-pink/15 text-pink",
  completed: "bg-white/15 text-white",
}

function ReturnsTab() {
  const [returns, setReturns] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.returns()
      setReturns(res.data)
    } catch (err) {
      setError(describe(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function resolve(id, status) {
    setBusyId(id)
    setError(null)
    try {
      const updated = await api.admin.resolveReturn(id, status)
      setReturns((list) => list.map((r) => (r.id === id ? { ...r, ...updated } : r)))
    } catch (err) {
      setError(describe(err))
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={load} />

  if (returns.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line py-16 text-center text-sm text-white/40">
        No returns yet. They appear here as soon as a shopper requests one.
      </p>
    )
  }

  const open = returns.filter((r) => r.status === "requested").length

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-white/45">
          {returns.length} total · {open} awaiting review
        </p>
        <button
          type="button"
          onClick={load}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-lime hover:text-lime"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {returns.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {r.item?.image && (
                  <img src={r.item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-xs text-lime">{r.reference}</p>
                  <p className="truncate text-sm font-semibold text-white">{r.item?.name}</p>
                  <p className="truncate text-xs text-white/40">
                    {r.customer?.email} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-bold uppercase text-white/70">
                  {r.type}
                </span>
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                    RETURN_STATUS_STYLES[r.status] ?? "bg-white/10 text-white/60"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>

            <p className="mt-3 border-t border-line pt-3 text-sm text-white/70">
              <span className="text-white/40">Reason:</span> {r.reasonLabel}
              {r.note && <span className="block text-white/45">&ldquo;{r.note}&rdquo;</span>}
            </p>

            {/* Completing is the only action that touches stock — it puts the
                one-of-one piece back on the shelf, so it is deliberately a separate
                step from approving. */}
            {r.status !== "completed" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "requested" && (
                  <>
                    <ActionButton
                      busy={busyId === r.id}
                      onClick={() => resolve(r.id, "approved")}
                      icon={<Check size={13} />}
                      label="Approve"
                      tone="lime"
                    />
                    <ActionButton
                      busy={busyId === r.id}
                      onClick={() => resolve(r.id, "rejected")}
                      icon={<X size={13} />}
                      label="Reject"
                      tone="pink"
                    />
                  </>
                )}
                {r.status === "approved" && (
                  <ActionButton
                    busy={busyId === r.id}
                    onClick={() => resolve(r.id, "completed")}
                    icon={<Undo2 size={13} />}
                    label="Mark received — restock item"
                    tone="lime"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function ActionButton({ busy, onClick, icon, label, tone }) {
  const tones = {
    lime: "bg-lime text-ink",
    pink: "border border-pink/50 text-pink hover:bg-pink/10",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : icon}
      {label}
    </button>
  )
}

function describe(err) {
  if (err?.status === undefined) return "Can't reach the API. Is the backend running on port 4000?"
  if (err.status === 403) return "This account isn't an admin."
  return err.message
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-white/40">
      <Loader2 size={22} className="animate-spin text-lime" />
      Loading...
    </div>
  )
}

function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-pink/40 py-16 text-center">
      <AlertCircle size={28} className="text-pink" />
      <p className="max-w-sm text-sm text-white/50">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink"
      >
        Try again
      </button>
    </div>
  )
}
