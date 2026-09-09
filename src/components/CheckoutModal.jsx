import { useEffect, useMemo, useState } from "react"
import {
  X,
  ArrowLeft,
  ArrowRight,
  MapPin,
  QrCode as QrIcon,
  CreditCard,
  Banknote,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Lock,
  PackageCheck,
} from "lucide-react"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import { api } from "../lib/api"
import QrCode from "./QrCode"
import { formatPrice } from "../lib/currency"

const UPI_WINDOW_SECONDS = 300

// ── YOUR UPI SCANNER GOES HERE ────────────────────────────────────────────────
// 1. Save your QR image as:  Frontend/public/upi-qr.png
// 2. Set UPI_QR_IMAGE to:    "/upi-qr.png"
// 3. Put your real UPI ID in UPI_VPA so the on-screen text matches the code.
//
// Anything in public/ is served from the site root, so "/upi-qr.png" is the
// correct path — do NOT write "public/upi-qr.png". PNG, JPG and SVG all work.
// While UPI_QR_IMAGE is null the checkout draws a generated placeholder instead.
const UPI_QR_IMAGE = null
const UPI_VPA = "thriftvault@demoupi"

const METHODS = [
  {
    key: "upi",
    label: "UPI / Scan QR",
    blurb: "Pay instantly with any UPI app",
    icon: QrIcon,
  },
  {
    key: "card",
    label: "Credit / Debit Card",
    blurb: "Visa, Mastercard, Amex, RuPay",
    icon: CreditCard,
  },
  {
    key: "cod",
    label: "Cash on Delivery",
    blurb: "Pay the courier at your door",
    icon: Banknote,
  },
]

// Each stage maps to a real API call, so the progress bar reflects actual work.
const PROCESSING_STAGES = [
  "Saving your delivery address...",
  "Reserving your pieces...",
  "Authorising payment...",
  "Confirming your order...",
]

// ── helpers ───────────────────────────────────────────────────────────────────

function groupCardNumber(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(.{4})/g, "$1 ").trim()
}

function detectBrand(raw) {
  const d = raw.replace(/\D/g, "")
  if (/^4/.test(d)) return "VISA"
  if (/^(5[1-5]|2[2-7])/.test(d)) return "MASTERCARD"
  if (/^3[47]/.test(d)) return "AMEX"
  if (/^(60|65|81|82)/.test(d)) return "RUPAY"
  return null
}

// Standard Luhn checksum — the same check a real gateway runs before it even
// touches the network, which is why a random 16 digits gets rejected here too.
function passesLuhn(raw) {
  const d = raw.replace(/\D/g, "")
  if (d.length < 13) return false
  let sum = 0
  let double = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i])
    if (double) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    double = !double
  }
  return sum % 10 === 0
}

function formatExpiry(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

function expiryIsValid(value) {
  const m = value.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  return endOfMonth >= new Date()
}

function makeClientRef() {
  return `TV-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`
}

function mmss(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ── component ─────────────────────────────────────────────────────────────────

export default function CheckoutModal({ open, onClose }) {
  const { lines, subtotal, refresh } = useCart()
  const { user } = useAuth()

  const [step, setStep] = useState("address")
  const [method, setMethod] = useState("upi")
  const [error, setError] = useState("")
  const [stage, setStage] = useState(0)
  const [order, setOrder] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(UPI_WINDOW_SECONDS)

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" })
  const [upiId, setUpiId] = useState("")

  // The API total is authoritative — it is recomputed from the database at order
  // time, so the UI never invents charges the backend doesn't know about.
  const total = subtotal

  // Doubles as the Idempotency-Key, so a retried payment replays the same order
  // rather than reserving the stock twice.
  const clientRef = useMemo(() => makeClientRef(), [open])

  useEffect(() => {
    if (!open) return
    setStep("address")
    setError("")
    setStage(0)
    setOrder(null)
    setSecondsLeft(UPI_WINDOW_SECONDS)
    setMethod("upi")
    setCard({ number: "", holder: "", expiry: "", cvv: "" })
    setUpiId("")
    setAddress((a) => ({ ...a, name: a.name || user?.name || "" }))
  }, [open, user])

  // UPI collect requests expire; count the window down while that tab is showing
  useEffect(() => {
    if (step !== "payment" || method !== "upi" || !open) return
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [step, method, open])

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && step !== "processing") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, step, onClose])

  if (!open) return null

  function validateAddress() {
    if (address.name.trim().length < 2) return "Enter the full name for delivery."
    if (!/^\d{10}$/.test(address.phone.replace(/\D/g, "")))
      return "Enter a 10-digit contact number."
    if (address.line1.trim().length < 6) return "Enter a complete street address."
    if (address.city.trim().length < 2) return "Enter your city."
    if (address.state.trim().length < 2) return "Enter your state."
    if (!/^\d{6}$/.test(address.pincode.trim())) return "Enter a valid 6-digit PIN code."
    return ""
  }

  function validatePayment() {
    if (method === "card") {
      if (!passesLuhn(card.number)) return "That card number isn't valid. Try 4242 4242 4242 4242."
      if (card.holder.trim().length < 2) return "Enter the name printed on the card."
      if (!expiryIsValid(card.expiry)) return "Enter a valid future expiry date (MM/YY)."
      if (!/^\d{3,4}$/.test(card.cvv)) return "Enter the 3-digit CVV from the back of the card."
    }
    if (method === "upi" && upiId.trim() && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim()))
      return "That UPI ID doesn't look right — it should look like name@bank."
    return ""
  }

  function goToPayment() {
    const problem = validateAddress()
    if (problem) return setError(problem)
    setError("")
    setStep("payment")
  }

  async function pay() {
    const problem = validatePayment()
    if (problem) return setError(problem)

    setError("")
    setStep("processing")
    setStage(0)

    try {
      // 1. Persist the delivery address
      const savedAddress = await api.addresses.create({
        recipientName: address.name.trim(),
        phone: address.phone.trim(),
        line1: address.line1.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        postalCode: address.pincode.trim(),
        country: "India",
        isDefault: true,
      })

      // 2. Create the order. This is the step that actually reserves stock —
      //    the API locks the product rows so a one-of-one piece can't sell twice.
      setStage(1)
      const { order: created, paymentIntent } = await api.orders.create({
        addressId: savedAddress.id,
        idempotencyKey: clientRef,
      })

      // 3. Drive the payment to captured through the API's webhook pipeline
      setStage(2)
      const gatewayRef = paymentIntent?.gatewayRef ?? created.payment?.gatewayRef
      if (gatewayRef) await api.payments.simulateCapture(gatewayRef)

      // 4. Read the order back so the receipt shows the server's own status
      setStage(3)
      const confirmed = await api.orders.get(created.id)

      setOrder({
        id: confirmed.id,
        status: confirmed.status,
        method,
        total: confirmed.total,
        eta: new Date(Date.now() + 4 * 86400000),
        last4: card.number.replace(/\D/g, "").slice(-4),
        itemCount: confirmed.items.length,
      })
      setStep("success")

      // createOrder empties the server cart, so pull the now-empty cart down
      await refresh()
    } catch (err) {
      setStep("payment")
      if (err?.status === 409 && err.details?.unavailable) {
        const names = err.details.unavailable.map((u) => u.name).join(", ")
        setError(`Someone just bought ${names}. Remove it from your bag to continue.`)
      } else if (err?.status === undefined) {
        setError("Can't reach the API. Is the backend running on port 4000?")
      } else {
        setError(err.message)
      }
    }
  }

  const stepIndex = { address: 0, payment: 1, processing: 1, success: 2 }[step]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4">
      <div
        onClick={() => step !== "processing" && onClose()}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden border-line bg-surface sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime/15 text-lime">
              <Lock size={16} />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-white">Secure Checkout</h2>
              <p className="text-[11px] text-white/40">Ref {clientRef}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={onClose}
            disabled={step === "processing"}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line text-white/60 transition-colors hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <Stepper index={stepIndex} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
          <div className="flex-1 px-5 py-6 sm:px-7">
            {step === "address" && (
              <AddressStep address={address} setAddress={setAddress} email={user?.email} />
            )}

            {step === "payment" && (
              <PaymentStep
                method={method}
                setMethod={(m) => {
                  setMethod(m)
                  setError("")
                  setSecondsLeft(UPI_WINDOW_SECONDS)
                }}
                card={card}
                setCard={setCard}
                upiId={upiId}
                setUpiId={setUpiId}
                total={total}
                clientRef={clientRef}
                secondsLeft={secondsLeft}
              />
            )}

            {step === "processing" && <ProcessingStep stage={stage} method={method} />}

            {step === "success" && <SuccessStep order={order} address={address} />}

            {error && step !== "processing" && (
              <p
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-xl border border-pink/40 bg-pink/10 px-3.5 py-2.5 text-sm text-pink"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {step !== "success" && (
            <aside className="shrink-0 border-t border-line bg-ink/40 px-5 py-6 sm:px-7 lg:w-[300px] lg:border-l lg:border-t-0">
              <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-white/60">
                Order Summary
              </h3>

              <div className="flex max-h-52 flex-col gap-3 overflow-y-auto pr-1">
                {lines.map((line) => (
                  <div key={line.key} className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={line.image}
                        alt={line.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-lime text-[10px] font-bold text-ink">
                        {line.qty}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{line.name}</p>
                      <p className="text-[11px] text-white/40">Size {line.size}</p>
                    </div>
                    <span className="text-xs font-semibold text-white">
                      {formatPrice(line.price * line.qty)}
                    </span>
                  </div>
                ))}
              </div>

              <dl className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Shipping" value="Free" valueClass="text-lime" />
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3 font-display text-base font-bold text-white">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
                <ShieldCheck size={14} className="mt-px shrink-0 text-lime/70" />
                The order and stock reservation are real; only the payment is simulated.
              </p>
            </aside>
          )}
        </div>

        {step !== "processing" && (
          <div className="flex shrink-0 items-center gap-3 border-t border-line px-5 py-4 sm:px-7">
            {step === "payment" && (
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setStep("address")
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:border-white/40 hover:text-white"
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}

            {step === "address" && (
              <button
                type="button"
                onClick={goToPayment}
                className="ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-lime px-6 py-3 font-display text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
              >
                Continue to Payment <ArrowRight size={15} />
              </button>
            )}

            {step === "payment" && (
              <button
                type="button"
                onClick={pay}
                disabled={lines.length === 0}
                className="ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-lime px-6 py-3 font-display text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={14} />
                {method === "cod" ? `Place Order · ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
              </button>
            )}

            {step === "success" && (
              <button
                type="button"
                onClick={onClose}
                className="ml-auto cursor-pointer rounded-full bg-lime px-6 py-3 font-display text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
              >
                Continue Shopping
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── steps ─────────────────────────────────────────────────────────────────────

function Stepper({ index }) {
  const steps = ["Delivery", "Payment", "Confirmation"]
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3 sm:px-7">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
              i < index
                ? "bg-lime/20 text-lime"
                : i === index
                  ? "bg-lime text-ink"
                  : "border border-line text-white/30"
            }`}
          >
            {i < index ? <CheckCircle2 size={13} /> : i + 1}
          </span>
          <span
            className={`hidden text-xs font-semibold sm:block ${
              i <= index ? "text-white" : "text-white/30"
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <span className={`h-px flex-1 ${i < index ? "bg-lime/40" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function AddressStep({ address, setAddress, email }) {
  const set = (key) => (value) => setAddress((a) => ({ ...a, [key]: value }))

  return (
    <>
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <MapPin size={18} className="text-lime" /> Where should it go?
      </h3>
      <p className="mt-1 text-sm text-white/40">Delivering to {email ?? "your account"}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          value={address.name}
          onChange={set("name")}
          placeholder="Alex Mercer"
        />
        <Input
          label="Phone"
          value={address.phone}
          onChange={(v) => set("phone")(v.replace(/\D/g, "").slice(0, 10))}
          placeholder="9876543210"
          inputMode="numeric"
        />
        <Input
          label="Street address"
          value={address.line1}
          onChange={set("line1")}
          placeholder="42 Camden High Street, Flat 3B"
          className="sm:col-span-2"
        />
        <Input label="City" value={address.city} onChange={set("city")} placeholder="Mumbai" />
        <Input
          label="State"
          value={address.state}
          onChange={set("state")}
          placeholder="Maharashtra"
        />
        <Input
          label="PIN code"
          value={address.pincode}
          onChange={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))}
          placeholder="400001"
          inputMode="numeric"
        />
      </div>
    </>
  )
}

function PaymentStep({ method, setMethod, card, setCard, upiId, setUpiId, total, clientRef, secondsLeft }) {
  const brand = detectBrand(card.number)
  const setCardField = (key) => (value) => setCard((c) => ({ ...c, [key]: value }))

  return (
    <>
      <h3 className="font-display text-lg font-bold text-white">How would you like to pay?</h3>
      <p className="mt-1 text-sm text-white/40">All three options are simulated.</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {METHODS.map((m) => {
          const active = method === m.key
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                active ? "border-lime bg-lime/10" : "border-line bg-surface2 hover:border-white/25"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-lime text-ink" : "bg-ink text-white/50"
                }`}
              >
                <m.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">{m.label}</span>
                <span className="block text-xs text-white/40">{m.blurb}</span>
              </span>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                  active ? "border-lime" : "border-line"
                }`}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-lime" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface2 p-5">
        {method === "upi" && (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-xl bg-white p-3">
              {UPI_QR_IMAGE ? (
                <img
                  src={UPI_QR_IMAGE}
                  alt={`UPI QR code for ${UPI_VPA}`}
                  className="h-40 w-40 object-contain"
                />
              ) : (
                <QrCode
                  payload={`upi://pay?pa=${UPI_VPA}&am=${total.toFixed(2)}&tr=${clientRef}`}
                  className="h-40 w-40"
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 font-display text-sm font-bold text-white sm:justify-start">
                <Smartphone size={15} className="text-lime" />
                Scan with any UPI app
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                Open GPay, PhonePe, Paytm or your bank app and scan the code to pay
                <span className="font-semibold text-white"> {formatPrice(total)}</span>.
              </p>

              {UPI_QR_IMAGE && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-pink/40 bg-pink/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-pink">
                  <AlertCircle size={13} className="mt-px shrink-0" />
                  This is a real QR code — scanning it will move actual money. The rest of
                  the checkout is still simulated.
                </p>
              )}

              <dl className="mt-4 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Payee</dt>
                  <dd className="font-semibold text-white">Thrift Vault</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">UPI ID</dt>
                  <dd className="font-mono font-semibold text-lime">{UPI_VPA}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Expires in</dt>
                  <dd
                    className={`font-mono font-semibold ${secondsLeft < 60 ? "text-pink" : "text-white"}`}
                  >
                    {mmss(secondsLeft)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-line pt-4">
                <Input
                  label="Or enter your UPI ID"
                  value={upiId}
                  onChange={setUpiId}
                  placeholder="yourname@okhdfcbank"
                />
              </div>
            </div>
          </div>
        )}

        {method === "card" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Card number"
                value={card.number}
                onChange={(v) => setCardField("number")(groupCardNumber(v))}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                trailing={
                  brand && (
                    <span className="rounded bg-ink px-2 py-1 text-[10px] font-bold tracking-wide text-lime">
                      {brand}
                    </span>
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Name on card"
                value={card.holder}
                onChange={(v) => setCardField("holder")(v.toUpperCase())}
                placeholder="ALEX MERCER"
              />
            </div>
            <Input
              label="Expiry"
              value={card.expiry}
              onChange={(v) => setCardField("expiry")(formatExpiry(v))}
              placeholder="MM/YY"
              inputMode="numeric"
            />
            <Input
              label="CVV"
              value={card.cvv}
              onChange={(v) => setCardField("cvv")(v.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              type="password"
              inputMode="numeric"
            />
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/35 sm:col-span-2">
              <ShieldCheck size={14} className="mt-px shrink-0 text-lime/70" />
              Card details never leave your browser — use the test card 4242 4242 4242 4242
              with any future expiry and any CVV.
            </p>
          </div>
        )}

        {method === "cod" && (
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink/15 text-pink">
              <Banknote size={20} />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-white">
                Pay {formatPrice(total)} when it arrives
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                Hand cash to the delivery partner at your door. No extra charge. Please keep
                exact change ready — our partners may not carry any.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs text-white/40">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="shrink-0 text-lime" />
                  No card details needed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="shrink-0 text-lime" />
                  Inspect the parcel before you pay
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ProcessingStep({ stage, method }) {
  const label = { upi: "UPI", card: "card", cod: "order" }[method]
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center">
      <span className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-lime/20" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-lime/15 text-lime">
          <Loader2 size={28} className="animate-spin" />
        </span>
      </span>
      <div>
        <p className="font-display text-lg font-bold text-white">
          Processing your {label} payment
        </p>
        <p className="mt-1.5 text-sm text-white/45">{PROCESSING_STAGES[stage]}</p>
      </div>
      <div className="flex gap-1.5">
        {PROCESSING_STAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              i <= stage ? "bg-lime" : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-white/30">Please don't close this window.</p>
    </div>
  )
}

function SuccessStep({ order, address }) {
  if (!order) return null
  const methodLabel = {
    upi: "UPI",
    card: `Card ending ${order.last4 || "••••"}`,
    cod: "Cash on Delivery",
  }[order.method]

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-lime/15 text-lime">
        <CheckCircle2 size={32} />
      </span>
      <h3 className="mt-4 font-display text-2xl font-bold text-white">
        {order.method === "cod" ? "Order confirmed!" : "Payment successful!"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        Thanks for giving {order.itemCount === 1 ? "this piece" : "these pieces"} a second life.
        Your order is saved to your account.
      </p>

      <dl className="mt-6 w-full rounded-xl border border-line bg-surface2 p-4 text-left text-sm">
        <ReceiptRow
          label="Order ID"
          value={<span className="font-mono text-xs text-lime">{order.id}</span>}
        />
        <ReceiptRow
          label="Status"
          value={
            <span className="rounded-full bg-lime/15 px-2 py-0.5 text-xs font-bold uppercase text-lime">
              {order.status}
            </span>
          }
        />
        <ReceiptRow label="Paid with" value={methodLabel} />
        <ReceiptRow
          label={order.method === "cod" ? "Amount due" : "Amount paid"}
          value={<span className="font-bold text-white">{formatPrice(order.total)}</span>}
        />
        <ReceiptRow label="Delivering to" value={`${address.city} ${address.pincode}`} />
        <ReceiptRow
          label="Arrives by"
          value={order.eta.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          last
        />
      </dl>

      <p className="mt-5 flex items-center gap-2 rounded-full bg-surface2 px-4 py-2 text-xs text-white/40">
        <PackageCheck size={14} className="text-lime" />
        Stock was really decremented — nothing ships, but the item is now sold.
      </p>
    </div>
  )
}

// ── small shared bits ─────────────────────────────────────────────────────────

function Row({ label, value, valueClass = "text-white/70" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/45">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  )
}

function ReceiptRow({ label, value, last }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2 ${last ? "" : "border-b border-line"}`}
    >
      <dt className="shrink-0 text-xs text-white/40">{label}</dt>
      <dd className="min-w-0 break-all text-right text-sm text-white/80">{value}</dd>
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = "text", inputMode, trailing, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      <span className="relative flex items-center">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full cursor-text rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-lime ${
            trailing ? "pr-20" : ""
          }`}
        />
        {trailing && <span className="absolute right-3 flex items-center">{trailing}</span>}
      </span>
    </label>
  )
}
