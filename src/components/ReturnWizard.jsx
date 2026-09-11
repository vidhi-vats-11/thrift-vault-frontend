import { useEffect, useState } from "react"
import {
  X,
  ArrowLeft,
  RefreshCw,
  Banknote,
  Check,
  Loader2,
  AlertCircle,
  PackageCheck,
} from "lucide-react"
import { api } from "../lib/api"
import { formatPrice } from "../lib/currency"

// A deliberate decision tree rather than a chat box. Every real store's return flow
// is a handful of fixed questions, because the answers have to map onto structured
// data an operations team can act on — free text cannot be routed or counted.
const STEPS = ["reason", "resolution", "confirm", "done"]

export default function ReturnWizard({ item, order, onClose, onCompleted }) {
  const [step, setStep] = useState("reason")
  const [reasons, setReasons] = useState([])
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState("")
  const [type, setType] = useState(null)
  const [created, setCreated] = useState(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.returns
      .reasons()
      .then((res) => setReasons(res.data))
      .catch(() => setReasons([]))
  }, [])

  // Escape closes, which people expect of anything modal.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.returns.create({
        orderItemId: item.id,
        type,
        reason,
        note: note.trim() || undefined,
      })
      setCreated(res)
      setStep("done")
      onCompleted?.()
    } catch (err) {
      setError(
        err?.status === undefined
          ? "Can't reach the API. Is the backend running on port 4000?"
          : err.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)
  const back = () => setStep(STEPS[Math.max(0, stepIndex - 1)])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {stepIndex > 0 && step !== "done" && (
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                className="-ml-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/50 hover:text-lime"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="truncate font-display text-base font-bold text-white">
              {step === "done" ? "All set" : "Return or exchange"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-white/50 hover:border-lime hover:text-lime"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress rail — three real decisions, so three segments. */}
        {step !== "done" && (
          <div className="flex gap-1.5 px-4 pt-3 sm:px-5">
            {STEPS.slice(0, 3).map((s, i) => (
              <span
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-lime" : "bg-surface2"
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {/* The item under discussion stays visible the whole way through, so
              nobody submits a return against the wrong piece. */}
          {step !== "done" && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-surface2 p-2.5">
              {item.image && (
                <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <p className="truncate text-xs text-white/40">
                  {item.brand} · Size {item.size} · {formatPrice(item.priceCents / 100)}
                </p>
              </div>
            </div>
          )}

          {step === "reason" && (
            <>
              <p className="mb-3 text-sm font-semibold text-white">What went wrong?</p>
              <div className="flex flex-col gap-2">
                {reasons.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setReason(r.value)
                      setStep("resolution")
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                      reason === r.value
                        ? "border-lime bg-lime/10 text-lime"
                        : "border-line bg-surface2 text-white/80 hover:border-lime/50 hover:text-white"
                    }`}
                  >
                    {r.label}
                    {reason === r.value && <Check size={15} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "resolution" && (
            <>
              <p className="mb-3 text-sm font-semibold text-white">
                Would you like a refund or an exchange?
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <ResolutionCard
                  icon={<Banknote size={18} />}
                  title="Refund"
                  body="Money back to your original payment method once the piece reaches us."
                  active={type === "refund"}
                  onClick={() => setType("refund")}
                />
                <ResolutionCard
                  icon={<RefreshCw size={18} />}
                  title="Exchange"
                  body="We put this piece back in the vault and help you pick another."
                  active={type === "exchange"}
                  onClick={() => setType("exchange")}
                />
              </div>

              {/* Honest disclosure: every piece is unique, so "exchange" can't mean
                  "the same thing in another size" the way it does at a chain store. */}
              {type === "exchange" && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-surface2 p-3 text-xs text-white/50">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-lime/70" />
                  <span>
                    Every piece here is one-of-one, so we can&apos;t send the same item in another
                    size. An exchange gives you credit to pick anything else in the vault.
                  </span>
                </p>
              )}

              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/45">
                  Anything else? (optional)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us more — it helps us describe pieces better."
                  className="w-full resize-none rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-lime"
                />
              </label>

              <button
                type="button"
                disabled={!type}
                onClick={() => setStep("confirm")}
                className="mt-4 w-full cursor-pointer rounded-full bg-lime py-2.5 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <p className="mb-3 text-sm font-semibold text-white">Check this over</p>
              <dl className="flex flex-col gap-2 rounded-xl border border-line bg-surface2 p-3.5 text-sm">
                <Row label="Order" value={`#${order.id.slice(0, 8).toUpperCase()}`} />
                <Row
                  label="Reason"
                  value={reasons.find((r) => r.value === reason)?.label ?? reason}
                />
                <Row label="You want" value={type === "refund" ? "A refund" : "An exchange"} />
                {note.trim() && <Row label="Note" value={note.trim()} />}
              </dl>

              {error && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-pink/40 bg-pink/10 p-3 text-sm text-pink">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime py-2.5 text-sm font-bold text-ink disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isSubmitting ? "Submitting…" : "Submit request"}
              </button>
            </>
          )}

          {step === "done" && created && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-lime/15 text-lime">
                <PackageCheck size={26} />
              </div>
              <p className="font-display text-lg font-bold text-white">
                {created.type === "exchange" ? "Exchange" : "Refund"} requested
              </p>
              <p className="rounded-full border border-line bg-surface2 px-3 py-1.5 font-mono text-sm text-lime">
                {created.reference}
              </p>
              <p className="max-w-sm text-sm text-white/45">
                We&apos;ll review it and email you next steps. You can follow its progress from
                your orders at any time.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 cursor-pointer rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResolutionCard({ icon, title, body, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 cursor-pointer flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-colors ${
        active
          ? "border-lime bg-lime/10"
          : "border-line bg-surface2 hover:border-lime/50"
      }`}
    >
      <span className={`flex items-center gap-2 text-sm font-bold ${active ? "text-lime" : "text-white"}`}>
        {icon} {title}
      </span>
      <span className="text-xs leading-relaxed text-white/45">{body}</span>
    </button>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-white/40">{label}</dt>
      <dd className="text-right font-medium text-white">{value}</dd>
    </div>
  )
}
