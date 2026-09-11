import { useEffect, useState } from "react"
import { ArrowLeft, User, Check, Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import { useAuth } from "../context/AuthContext"

// Mirrors the Gender enum in the Prisma schema. "prefer_not_to_say" is a real,
// selectable answer rather than an absence — and it is treated as "do not rank my
// results by gender at all", the same as leaving it unset.
const GENDER_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

export default function AccountPage({ onBack }) {
  const { user, updateProfile } = useAuth()

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState("")
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  // Seed the form from the context once the user is known, and re-seed whenever it
  // changes (e.g. after a save elsewhere) so the inputs never drift from the server.
  useEffect(() => {
    if (!user) return
    setName(user.name ?? "")
    setPhone(user.phone ?? "")
    setGender(user.gender ?? "")
  }, [user])

  const isDirty =
    name !== (user?.name ?? "") ||
    phone !== (user?.phone ?? "") ||
    gender !== (user?.gender ?? "")

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await updateProfile({ name: name.trim(), phone: phone.trim(), gender })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setError(res.error)
    }
  }

  if (!user) return null

  const field =
    "w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-lime"
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/45"

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-lime"
      >
        <ArrowLeft size={15} /> Back to shop
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime/15 text-lime">
          <User size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Account</h1>
          <p className="truncate text-sm text-white/45">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-base font-bold text-white">Profile</h2>
        <p className="mb-5 mt-1 text-sm text-white/45">
          Used to personalise your shopping — nothing here is ever shown publicly.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className={label} htmlFor="account-name">
              Full name
            </label>
            <input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className={field}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className={label} htmlFor="account-email">
              Email
            </label>
            {/* Read-only on purpose: the email is the login identifier, and changing
                it safely needs a verification flow rather than a text box. */}
            <input
              id="account-email"
              value={user.email}
              readOnly
              disabled
              className={`${field} cursor-not-allowed text-white/40`}
            />
            <p className="mt-1.5 text-xs text-white/30">
              Your email is your sign-in and can&apos;t be changed here.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="account-phone">
              Phone
            </label>
            <input
              id="account-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
              placeholder="+91 98765 43210"
            />
            <p className="mt-1.5 text-xs text-white/30">For delivery updates. Leave blank to remove.</p>
          </div>

          <div>
            <label className={label} htmlFor="account-gender">
              Gender
            </label>
            <select
              id="account-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`${field} cursor-pointer`}
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-surface text-white">
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-white/30">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-lime/60" />
              <span>
                Only moves matching pieces higher up your search results. Nothing is ever hidden
                from you, and unisex items always stay in view.
              </span>
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-pink/40 bg-pink/10 p-3 text-sm text-pink">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-lime">
              <Check size={15} /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
