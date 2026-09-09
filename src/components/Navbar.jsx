import { useEffect, useRef, useState } from "react"
import { Search, Heart, ShoppingBag, Menu, X, Recycle, LogOut, ShieldCheck } from "lucide-react"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import MobileMenu from "./MobileMenu"

const NAV_LINKS = [
  { label: "Shop", href: "#shop" },
  { label: "New Drops", href: "#new-drops" },
  { label: "Our Story", href: "#story" },
  { label: "Contact", href: "#footer" },
]

export default function Navbar({ searchTerm, onSearchChange }) {
  const { itemCount, wishlist, setCartOpen, setWishlistOpen } = useCart()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  const initials = (user?.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  // Close the account dropdown on an outside click or Escape
  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(e) {
      if (!accountRef.current?.contains(e.target)) setAccountOpen(false)
    }
    function onKey(e) {
      if (e.key === "Escape") setAccountOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [accountOpen])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="flex cursor-pointer items-center gap-2 font-display text-lg font-bold tracking-tight text-white shrink-0"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink shadow-glow">
              <Recycle size={18} strokeWidth={2.5} />
            </span>
            <span className="hidden sm:inline">
              THRIFT<span className="text-lime">VAULT</span>
            </span>
          </a>

          <nav className="ml-4 hidden items-center gap-7 font-display text-sm font-medium text-white/70 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="cursor-pointer transition-colors hover:text-lime"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <div className="relative hidden max-w-xs flex-1 sm:block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search drops, brands..."
                className="w-full cursor-text rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-lime"
              />
            </div>

            <button
              type="button"
              aria-label="Open wishlist"
              onClick={() => setWishlistOpen(true)}
              className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line bg-surface transition-colors hover:border-pink hover:text-pink"
            >
              <Heart size={18} fill={wishlist.length ? "currentColor" : "none"} className={wishlist.length ? "text-pink" : ""} />
              {wishlist.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-pink text-[10px] font-bold text-ink">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label="Open cart"
              onClick={() => setCartOpen(true)}
              className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line bg-surface transition-colors hover:border-lime hover:text-lime"
            >
              <ShoppingBag size={18} />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-lime text-[10px] font-bold text-ink">
                  {itemCount}
                </span>
              )}
            </button>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((o) => !o)}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line bg-surface font-display text-xs font-bold text-lime transition-colors hover:border-lime"
              >
                {initials}
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="truncate text-xs text-white/40">{user?.email}</p>
                  </div>
                  {user?.role === "admin" && (
                    <a
                      href="#admin"
                      onClick={() => setAccountOpen(false)}
                      className="flex w-full cursor-pointer items-center gap-2 border-b border-line px-4 py-3 text-sm font-medium text-lime transition-colors hover:bg-surface2"
                    >
                      <ShieldCheck size={15} /> Admin dashboard
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-surface2 hover:text-pink"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-line bg-surface transition-colors hover:border-lime hover:text-lime md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={NAV_LINKS}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
      />
    </>
  )
}
