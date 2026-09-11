import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, AlertCircle, RefreshCw, Recycle, X, AlertTriangle } from "lucide-react"
import { CartProvider } from "./context/CartContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { useCatalog, useProductSearch } from "./hooks/useCatalog"
import AuthPage from "./components/AuthPage"
import CheckoutModal from "./components/CheckoutModal"
import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import CategoryStrip from "./components/CategoryStrip"
import ProductGrid from "./components/ProductGrid"
import ProductModal from "./components/ProductModal"
import Testimonials from "./components/Testimonials"
import Newsletter from "./components/Newsletter"
import Footer from "./components/Footer"
import CartDrawer from "./components/CartDrawer"
import WishlistDrawer from "./components/WishlistDrawer"
import Toast from "./components/Toast"
import ProductPage from "./components/ProductPage"
import AdminPage from "./components/AdminPage"
import AccountPage from "./components/AccountPage"
import SearchResults from "./components/SearchResults"
import RankedProductGrid from "./components/RankedProductGrid"
import OrdersPage from "./components/OrdersPage"
import BrowseSections from "./components/BrowseSections"
import HelpAssistant from "./components/HelpAssistant"

function ShopContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [isCheckoutOpen, setCheckoutOpen] = useState(false)
  const [activeProductId, setActiveProductId] = useState(null)
  const [isAdminView, setAdminView] = useState(false)
  const [isAccountView, setAccountView] = useState(false)
  const [isOrdersView, setOrdersView] = useState(false)
  const [activeGender, setActiveGender] = useState(null)

  const { products, categories, isLoading, error, reload } = useCatalog()
  const { results: searchResults, isSearching: isSearchLoading } = useProductSearch(searchTerm)
  const isSearching = Boolean(searchTerm.trim())

  // Jump back to the top when a search starts, so the results are the first thing
  // on screen rather than wherever the shopper happened to be scrolled to.
  useEffect(() => {
    if (isSearching) window.scrollTo({ top: 0, behavior: "smooth" })
  }, [isSearching])

  // Routing is done through the URL hash (#product/<uuid>) rather than a router
  // library. Browser back/forward and refresh-on-a-product-page all work for free,
  // and the existing #shop / #new-drops anchors keep behaving as anchors.
  useEffect(() => {
    function syncFromHash() {
      const match = window.location.hash.match(/^#product\/(.+)$/)
      setActiveProductId(match ? match[1] : null)
      setAdminView(window.location.hash === "#admin")
      setAccountView(window.location.hash === "#account")
      setOrdersView(window.location.hash === "#orders")
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  const openProduct = useCallback((product) => {
    setQuickViewProduct(null)
    window.location.hash = `product/${product.id}`
  }, [])

  const closeAdmin = useCallback(() => {
    window.location.hash = "shop"
  }, [])

  const closeAccount = useCallback(() => {
    window.location.hash = "shop"
  }, [])

  const closeProduct = useCallback(() => {
    // Land back on the grid the shopper came from rather than the top of the page
    window.location.hash = "shop"
  }, [])

  const newDrops = useMemo(
    () => products.filter((p) => p.tag === "NEW DROP" || p.tag === "TRENDING"),
    [products]
  )

  // While there is a query the results come from the API (which understands
  // synonyms, price hints and gender ranking); otherwise the full catalogue that
  // was already loaded is used. The category chip filters whichever list is active.
  const filteredProducts = useMemo(() => {
    const base = searchTerm.trim() ? searchResults : products
    return base.filter(
      (p) =>
        (activeCategory === "All" || p.category === activeCategory) &&
        // A gender chosen from "Shop by" IS a filter — the shopper explicitly asked
        // for that rail. This is different from the profile gender on the server,
        // which only ever re-orders and never removes anything.
        (!activeGender || p.gender === activeGender)
    )
  }, [products, searchResults, searchTerm, activeCategory, activeGender])

  const jumpToShop = useCallback(() => {
    // rAF so the scroll happens after React has painted the filtered grid.
    requestAnimationFrame(() =>
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
    )
  }, [])

  return (
    <div className="min-h-screen bg-ink">
      {/* Styled as a warning, not an info notice. This banner used to say payments
          were simulated; a real UPI QR is now wired into checkout, so the same lime
          "all is well" treatment would undersell a message about losing money. */}
      <p className="flex items-center justify-center gap-2 bg-pink/10 px-4 py-2 text-center text-[11px] font-medium leading-relaxed text-pink">
        <AlertTriangle size={13} className="mt-px shrink-0" />
        <span>
          Payments are real and will move actual money — pay at your own risk. This is a
          demo store: no order is ever delivered.
        </span>
      </p>

      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {isAdminView ? (
        <main>
          <AdminPage onBack={closeAdmin} onSelectProduct={openProduct} />
        </main>
      ) : isAccountView ? (
        <main>
          <AccountPage onBack={closeAccount} />
        </main>
      ) : activeProductId ? (
        <main>
          <ProductPage
            key={activeProductId}
            productId={activeProductId}
            allProducts={products}
            onBack={closeProduct}
            onSelectProduct={openProduct}
          />
        </main>
      ) : isOrdersView ? (
        <main>
          <OrdersPage
            onBack={() => (window.location.hash = "shop")}
            onBrowse={() => (window.location.hash = "shop")}
          />
        </main>
      ) : isSearching ? (
        // A query takes over the page. Previously the grid updated in place, 1500px
        // below the hero — you typed and nothing visibly happened, which reads as
        // "search is broken". Every real store swaps the page for results instead.
        <main>
          <SearchResults
            term={searchTerm}
            results={filteredProducts}
            isLoading={isSearchLoading}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onClear={() => {
              setSearchTerm("")
              setActiveCategory("All")
            }}
            onQuickView={setQuickViewProduct}
            onSelectProduct={openProduct}
          />
        </main>
      ) : (
        <main>
          <Hero />

          <section id="new-drops" className="border-b border-line">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-lime">
                    Fresh In
                  </p>
                  <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    This Week's New Drops
                  </h2>
                </div>
                <a
                  href="#shop"
                  className="hidden cursor-pointer text-sm font-semibold text-white/50 hover:text-lime sm:block"
                >
                  View all →
                </a>
              </div>
              <CatalogState isLoading={isLoading} error={error} onRetry={reload}>
                <ProductGrid
                  products={newDrops}
                  onQuickView={setQuickViewProduct}
                  onSelectProduct={openProduct}
                />
              </CatalogState>
            </div>
          </section>

          <BrowseSections
            products={products}
            categories={categories}
            onPickGender={(g) => {
              setActiveGender(g)
              setActiveCategory("All")
              jumpToShop()
            }}
            onPickCategory={(c) => {
              setActiveCategory(c)
              setActiveGender(null)
              jumpToShop()
            }}
          />

          <section id="shop" className="border-b border-line">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
              <div className="mb-6">
                <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-pink">
                  The Vault
                </p>
                <h2 className="mb-2 font-display text-2xl font-bold text-white sm:text-3xl">
                  {activeGender
                    ? `${activeGender[0].toUpperCase()}${activeGender.slice(1)}'s Pieces`
                    : "Shop All Pieces"}
                </h2>

                {/* A removable chip, so an active filter is always visible and always
                    reversible — a filtered grid with no visible cause looks like an
                    empty shop. */}
                {activeGender && (
                  <button
                    type="button"
                    onClick={() => setActiveGender(null)}
                    className="mb-4 flex cursor-pointer items-center gap-1.5 rounded-full border border-lime bg-lime/10 px-3 py-1.5 text-xs font-semibold text-lime"
                  >
                    {activeGender} <X size={13} />
                  </button>
                )}

                <div className="mt-3">
                  <CategoryStrip
                    categories={categories}
                    active={activeCategory}
                    onChange={setActiveCategory}
                  />
                </div>
              </div>
              <CatalogState isLoading={isLoading} error={error} onRetry={reload}>
                <RankedProductGrid
                  products={filteredProducts}
                  onQuickView={setQuickViewProduct}
                  onSelectProduct={openProduct}
                />
              </CatalogState>
            </div>
          </section>

          <Testimonials />
          <Newsletter />
        </main>
      )}

      <Footer />
      <HelpAssistant />
      <CartDrawer onCheckout={() => setCheckoutOpen(true)} />
      <WishlistDrawer />
      <Toast />
      <ProductModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onViewDetails={openProduct}
      />
      <CheckoutModal open={isCheckoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  )
}

/** Loading spinner / API-down message wrapper for the product grids. */
function CatalogState({ isLoading, error, onRetry, children }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-white/40">
        <Loader2 size={22} className="animate-spin text-lime" />
        Loading the vault...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-pink/40 py-16 text-center">
        <AlertCircle size={28} className="text-pink" />
        <p className="font-display text-white/80">Couldn't load products</p>
        <p className="max-w-sm text-sm text-white/40">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 flex cursor-pointer items-center gap-2 rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    )
  }

  return children
}

// The storefront sits behind the login gate — CartProvider only mounts once
// someone is signed in, so it can assume every request carries a session.
function Gate() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-full bg-lime text-ink shadow-glow">
          <Recycle size={24} strokeWidth={2.5} />
        </span>
        <p className="text-sm text-white/40">Restoring your session...</p>
      </div>
    )
  }

  if (!isAuthenticated) return <AuthPage />

  return (
    <CartProvider>
      <ShopContent />
    </CartProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
