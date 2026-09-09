import { ArrowDown, Sparkles, Leaf, ShieldCheck } from "lucide-react"

const STATS = [
  { icon: Sparkles, label: "1-of-1 pieces", value: "500+" },
  { icon: Leaf, label: "CO2 saved", value: "3.2t" },
  { icon: ShieldCheck, label: "Authenticity checked", value: "100%" },
]

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      <div className="noise pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lime/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-pink/20 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet/20 blur-[100px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 lg:px-8">
        <span className="mb-5 inline-flex cursor-default items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium text-white/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
          New drop every Friday
        </span>

        <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl">
          Reworn. Reworked.
          <br />
          <span className="text-lime text-outline">Re</span>
          <span className="text-lime">loved.</span>
        </h1>

        <p className="mt-5 max-w-xl text-balance text-base text-white/60 sm:text-lg">
          Certified pre-loved streetwear for people who'd rather flex a rare find than
          another fast-fashion haul. Every piece is one of one.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#shop"
            className="cursor-pointer rounded-full bg-lime px-7 py-3 text-sm font-bold text-ink shadow-glow transition-transform hover:scale-105 active:scale-95"
          >
            Shop the Vault
          </a>
          <a
            href="#new-drops"
            className="cursor-pointer rounded-full border border-line bg-surface px-7 py-3 text-sm font-bold text-white transition-colors hover:border-pink hover:text-pink"
          >
            See New Drops
          </a>
        </div>

        <div className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-3 sm:gap-6">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="cursor-default rounded-2xl border border-line bg-surface/60 px-3 py-4 backdrop-blur-sm"
            >
              <Icon className="mx-auto mb-2 text-lime" size={20} />
              <p className="font-display text-xl font-bold text-white sm:text-2xl">{value}</p>
              <p className="text-[11px] text-white/45 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>

        <a
          href="#shop"
          aria-label="Scroll to shop"
          className="mt-14 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line text-white/50 transition-colors hover:border-lime hover:text-lime"
        >
          <ArrowDown size={18} className="animate-bounce" />
        </a>
      </div>
    </section>
  )
}
