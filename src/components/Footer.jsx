import { Instagram, Twitter, Youtube, Music2, Recycle, CreditCard } from "lucide-react"
import { useCart } from "../context/CartContext"

const SHOP_LINKS = [
  { label: "All Products", href: "#shop" },
  { label: "New Drops", href: "#new-drops" },
  { label: "Jackets", href: "#shop" },
  { label: "Denim", href: "#shop" },
]

const HELP_LINKS = ["Shipping Info", "Returns & Exchanges", "Size Guide", "FAQ"]

const SOCIALS = [
  { icon: Instagram, label: "Instagram" },
  { icon: Twitter, label: "Twitter" },
  { icon: Music2, label: "TikTok" },
  { icon: Youtube, label: "YouTube" },
]

export default function Footer() {
  const { pushToast } = useCart()

  return (
    <footer id="footer" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-lime text-ink">
                <Recycle size={16} strokeWidth={2.5} />
              </span>
              <span className="font-display text-base font-bold text-white">
                THRIFT<span className="text-lime">VAULT</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/50">
              Curated secondhand streetwear for a generation that thrifts smarter, not harder.
            </p>
            <div className="mt-4 flex gap-2">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  onClick={() => pushToast(`Follow us on ${label} — link coming soon`, "success")}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line text-white/60 transition-colors hover:border-lime hover:text-lime"
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">Shop</h4>
            <ul className="flex flex-col gap-2">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="cursor-pointer text-sm text-white/50 transition-colors hover:text-lime"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">Help</h4>
            <ul className="flex flex-col gap-2">
              {HELP_LINKS.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => pushToast(`${label} page — coming soon`, "success")}
                    className="cursor-pointer text-left text-sm text-white/50 transition-colors hover:text-lime"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white">
              We Accept
            </h4>
            <div className="flex flex-wrap gap-2">
              {["Visa", "Mastercard", "UPI", "PayPal"].map((method) => (
                <span
                  key={method}
                  className="flex cursor-default items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-white/60"
                >
                  <CreditCard size={13} /> {method}
                </span>
              ))}
            </div>
            <h4 className="mb-2 mt-5 font-display text-sm font-bold uppercase tracking-wide text-white">
              Our Story
            </h4>
            <p id="story" className="text-sm text-white/50">
              Started in a dorm room, now diverting thousands of garments from landfills — one drop at a
              time.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-white/35 sm:flex-row">
          <p>© {new Date().getFullYear()} Thrift Vault. All rights reserved.</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => pushToast("Privacy Policy — coming soon", "success")}
              className="cursor-pointer hover:text-lime"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => pushToast("Terms of Service — coming soon", "success")}
              className="cursor-pointer hover:text-lime"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
