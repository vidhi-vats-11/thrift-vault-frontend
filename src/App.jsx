import { useCallback, useEffect, useMemo, useState } from "react"
import { Info, Loader2, AlertCircle, RefreshCw, Recycle } from "lucide-react"
import { CartProvider } from "./context/CartContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { useCatalog } from "./hooks/useCatalog"
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

function ShopContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [isCheckoutOpen, setCheckoutOpen] = useState(false)
  const [activeProductId, setActiveProductId] = useState(null)
  const [isAdminView, setAdminView] = useState(false)

  const { products, categories, isLoading, error, reload } = useCatalog()

  // Routing is done through the URL hash (#product/<uuid>) rather than a router
  // library. Browser back/forward and refresh-on-a-product-page all work for free,
  // and the existing #shop / #new-drops anchors keep behaving as anchors.
  useEffect(() => {
    function syncFromHash() {
      const match = window.location.hash.match(/^#product\/(.+)$/)
      setActiveProductId(match ? match[1] : null)
      setAdminView(window.location.hash === "#admin")
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

  const closeProduct = useCallback(() => {
    // Land back on the grid the shopper came from rather than the top of the page
    window.location.hash = "shop"
  }, [])

  const newDrops = useMemo(
    () => products.filter((p) => p.tag === "NEW DROP" || p.tag === "TRENDING"),
    [products]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory
      const matchesSearch =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, searchTerm, activeCategory])

  return (
    <div className="min-h-screen bg-ink">
      <p className="flex items-center justify-center gap-2 bg-lime/10 px-4 py-2 text-center text-[11px] font-medium text-lime">
        <Info size={13} className="shrink-0" />
        Demo store — payments are simulated, but accounts, stock and orders are real.
      </p>

      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {isAdminView ? (
        <main>
          <AdminPage onBack={closeAdmin} onSelectProduct={openProduct} />
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

          <section id="shop" className="border-b border-line">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
              <div className="mb-6">
                <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-pink">
                  The Vault
                </p>
                <h2 className="mb-5 font-display text-2xl font-bold text-white sm:text-3xl">
                  Shop All Pieces
                </h2>
                <CategoryStrip
                  categories={categories}
                  active={activeCategory}
                  onChange={setActiveCategory}
                />
              </div>
              <CatalogState isLoading={isLoading} error={error} onRetry={reload}>
                <ProductGrid
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
