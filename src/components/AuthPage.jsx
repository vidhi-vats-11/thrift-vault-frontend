import { useState } from "react"
import {
  Recycle,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext"

const PERKS = [
  { icon: Sparkles, text: "One-of-one vintage, hand-picked weekly" },
  { icon: ShieldCheck, text: "Every piece inspected, cleaned and steamed" },
  // Checkout charges no shipping at any basket size, so promising a threshold here
  // would advertise a rule the app does not actually apply.
  { icon: Truck, text: "Free carbon-neutral shipping on every order" },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AuthPage() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const isSignup = mode === "signup"

  function switchMode(next) {
    setMode(next)
    setError("")
    setPassword("")
    setConfirm("")
  }

  function fillDemo() {
    setMode("login")
    setError("")
    setEmail(DEMO_CREDENTIALS.email)
    setPassword(DEMO_CREDENTIALS.password)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    if (isSignup && name.trim().length < 2) {
      setError("Tell us your name so we know who's thrifting.")
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError("That doesn't look like a valid email address.")
      return
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.")
      return
    }
    if (isSignup && password !== confirm) {
      setError("Those two passwords don't match.")
      return
    }

    setBusy(true)
    const result = isSignup
      ? await signup(name, email, password)
      : await login(email, password)
    setBusy(false)

    if (!result.ok) setError(result.error)
    // On success the provider flips isAuthenticated and App swaps this page out
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink noise lg:flex-row">
      {/* Brand panel — decorative, hidden on small screens so the form leads */}
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-pink/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-ink shadow-glow">
            <Recycle size={20} strokeWidth={2.5} />
          </span>
          THRIFT<span className="-ml-1.5 text-lime">VAULT</span>
        </div>

        <div className="relative">
          <p className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-lime">
            Secondhand, first choice
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-white">
            Wear the
            <br />
            <span className="text-outline">archive.</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/50">
            Rare 90s and Y2K pieces, rescued from landfill and re-listed one at a time.
            Sign in to save your finds and check out.
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {PERKS.map((perk) => (
              <li key={perk.text} className="flex items-center gap-3 text-sm text-white/60">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime/10 text-lime">
                  <perk.icon size={15} />
                </span>
                {perk.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/25">
          © {new Date().getFullYear()} Thrift Vault — a portfolio demo, not a real shop.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Compact logo for mobile, where the brand panel is hidden */}
          <div className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold text-white lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink shadow-glow">
              <Recycle size={18} strokeWidth={2.5} />
            </span>
            THRIFT<span className="-ml-1.5 text-lime">VAULT</span>
          </div>

          <div className="mb-6 inline-flex rounded-full border border-line bg-surface p-1">
            {[
              { key: "login", label: "Sign In" },
              { key: "signup", label: "Create Account" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchMode(tab.key)}
                className={`cursor-pointer rounded-full px-5 py-2 font-display text-sm font-bold transition-colors ${
                  mode === tab.key
                    ? "bg-lime text-ink"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <h2 className="font-display text-3xl font-bold text-white">
            {isSignup ? "Join the vault" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {isSignup
              ? "Create an account to save pieces and check out."
              : "Sign in to pick up where you left off."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4" noValidate>
            {isSignup && (
              <Field
                icon={User}
                label="Full name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Alex Mercer"
                autoComplete="name"
              />
            )}

            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              autoComplete="email"
            />

            <Field
              icon={Lock}
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              trailing={
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="cursor-pointer text-white/40 transition-colors hover:text-lime"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {isSignup && (
              <Field
                icon={Lock}
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={setConfirm}
                placeholder="Type it once more"
                autoComplete="new-password"
              />
            )}

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-pink/40 bg-pink/10 px-3.5 py-2.5 text-sm text-pink"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-lime py-3.5 font-display text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isSignup ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>
                  {isSignup ? "Create Account" : "Sign In"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-line bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/50">
              Demo website
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/40">
              Accounts are real and stored in the API's database — payments are the only
              simulated part. Sign in with the seeded demo account or register your own.
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 cursor-pointer rounded-full border border-lime/40 bg-lime/10 px-3.5 py-1.5 text-xs font-bold text-lime transition-colors hover:bg-lime hover:text-ink"
            >
              Use demo account
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-white/40">
            {isSignup ? "Already have an account?" : "New to Thrift Vault?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              className="cursor-pointer font-semibold text-lime hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({ icon: Icon, label, type, value, onChange, placeholder, autoComplete, trailing }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </span>
      <span className="relative flex items-center">
        <Icon
          size={16}
          className="pointer-events-none absolute left-3.5 text-white/35"
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full cursor-text rounded-xl border border-line bg-surface py-3 pl-10 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-lime ${
            trailing ? "pr-11" : "pr-3.5"
          }`}
        />
        {trailing && <span className="absolute right-3.5 flex items-center">{trailing}</span>}
      </span>
    </label>
  )
}
