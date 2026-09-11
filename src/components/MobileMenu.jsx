import { X, Search } from "lucide-react"

export default function MobileMenu({ open, onClose, links, searchTerm, onSearchChange }) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute right-0 top-0 h-full w-[80%] max-w-xs border-l border-line bg-surface p-6 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-white">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line hover:border-lime hover:text-lime"
          >
            <X size={18} />
          </button>
        </div>

        {/* Submitting closes the menu and drops the shopper onto the results. Without
            this, searching on a phone means typing, then realising you have to
            dismiss the panel yourself before you can see anything. */}
        <form
          className="relative mb-6"
          onSubmit={(e) => {
            e.preventDefault()
            onClose()
            document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
          }}
        >
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            enterKeyHint="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Try 'jeans' or 'something warm'"
            className="w-full cursor-text rounded-full border border-line bg-surface2 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-lime"
          />
        </form>

        <nav className="flex flex-col gap-1 font-display text-base font-medium">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2 py-3 text-white/80 transition-colors hover:bg-surface2 hover:text-lime"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
