import { Sparkles, UserCog } from "lucide-react"
import ProductGrid from "./ProductGrid"
import { useAuth } from "../context/AuthContext"

/**
 * Shows WHY the results are in this order.
 *
 * The API already ranks the shopper's fit above everything else, but an ordering
 * with no label is indistinguishable from no ordering at all — the work was
 * invisible. Splitting the same list under two headings makes the personalisation
 * legible, and keeps the promise that nothing is ever hidden: the rest of the
 * catalogue is right there under "Also available".
 *
 * When there is no gender on the profile there is nothing to explain, so this
 * renders a plain grid plus a one-line prompt offering to turn the feature on.
 */
export default function RankedProductGrid({ products, onQuickView, onSelectProduct }) {
  const { user } = useAuth()
  const viewerGender = user?.gender

  const canRank = viewerGender === "women" || viewerGender === "men"
  const best = canRank ? products.filter((p) => p.gender === viewerGender) : []
  const others = canRank ? products.filter((p) => p.gender !== viewerGender) : products

  // Splitting only helps when both halves exist. One empty group would give a
  // heading with nothing under it, or a "best for you" label above the entire
  // catalogue, which says nothing.
  const showSplit = canRank && best.length > 0 && others.length > 0

  if (!showSplit) {
    return (
      <>
        {!viewerGender && products.length > 0 && <SetYourFitPrompt />}
        <ProductGrid
          products={products}
          onQuickView={onQuickView}
          onSelectProduct={onSelectProduct}
        />
      </>
    )
  }

  return (
    <>
      <SectionLabel
        icon={<Sparkles size={13} />}
        title="Best for you"
        note={`Cut for ${viewerGender} · from your profile`}
        tone="lime"
      />
      <ProductGrid products={best} onQuickView={onQuickView} onSelectProduct={onSelectProduct} />

      <SectionLabel
        title="Also available"
        note="Everything else in the vault — nothing is hidden from you"
        tone="muted"
        className="mt-8"
      />
      <ProductGrid products={others} onQuickView={onQuickView} onSelectProduct={onSelectProduct} />
    </>
  )
}

function SectionLabel({ icon, title, note, tone, className = "" }) {
  const isLime = tone === "lime"
  return (
    <div className={`mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide ${
          isLime ? "bg-lime/15 text-lime" : "bg-surface2 text-white/50"
        }`}
      >
        {icon}
        {title}
      </span>
      <span className="text-xs text-white/35">{note}</span>
    </div>
  )
}

/** Shown only when the shopper has never set a gender — the feature is otherwise
 *  completely undiscoverable, which is exactly how it went unnoticed. */
function SetYourFitPrompt() {
  return (
    <a
      href="#account"
      className="mb-4 flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-xs transition-colors hover:border-lime"
    >
      <UserCog size={14} className="shrink-0 text-lime" />
      <span className="text-white/70">
        Set your fit in <span className="font-semibold text-lime">Account settings</span> to see
        matching pieces first.
      </span>
      <span className="text-white/30">Nothing ever gets hidden — it only changes the order.</span>
    </a>
  )
}
