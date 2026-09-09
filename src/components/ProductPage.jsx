import { useEffect, useMemo, useState } from "react"
import {
  ChevronRight,
  ArrowLeft,
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  RotateCcw,
  ShieldCheck,
  Leaf,
  Check,
  Ruler,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useCart } from "../context/CartContext"
import { api } from "../lib/api"
import { getRelatedProducts } from "../hooks/useCatalog"
import StarRating from "./StarRating"
import { formatPrice } from "../lib/currency"

const REVIEWS_PER_PAGE = 5

const SORTS = {
  recent: { label: "Most recent", fn: (a, b) => b.date - a.date },
  highest: { label: "Highest rated", fn: (a, b) => b.rating - a.rating || b.date - a.date },
  lowest: { label: "Lowest rated", fn: (a, b) => a.rating - b.rating || b.date - a.date },
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
}

export default function ProductPage({ productId, allProducts, onBack, onSelectProduct }) {
  const [product, setProduct] = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The grid payload omits reviews, so the page loads the full record itself.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    window.scrollTo({ top: 0, behavior: "auto" })

    api.products
      .get(productId)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err?.status === 404
            ? "That piece isn't in the vault anymore — it may have sold."
            : err?.status === undefined
              ? "Can't reach the API. Is the backend running on port 4000?"
              : err.message
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-lime" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle size={32} className="text-pink" />
        <p className="text-white/70">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink"
        >
          Back to shop
        </button>
      </div>
    )
  }

  return (
    <ProductDetail
      product={product}
      allProducts={allProducts}
      onBack={onBack}
      onSelectProduct={onSelectProduct}
    />
  )
}

function ProductDetail({ product, allProducts, onBack, onSelectProduct }) {
  const { addToCart, lines, wishlistIds, toggleWishlist } = useCart()

  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState(product.sizes[0] ?? "One Size")
  const [qty, setQty] = useState(1)
  const [visibleReviews, setVisibleReviews] = useState(REVIEWS_PER_PAGE)
  const [sortKey, setSortKey] = useState("recent")
  const [starFilter, setStarFilter] = useState(null)
  const [isAdding, setAdding] = useState(false)

  const reviews = useMemo(
    () =>
      (product.recentReviews ?? []).map((r) => ({
        ...r,
        date: new Date(r.createdAt),
      })),
    [product]
  )
  const breakdown = product.reviewBreakdown ?? {}
  const total = product.reviews ?? reviews.length
  const average = product.rating ?? 0
  const related = useMemo(
    () => getRelatedProducts(product, allProducts),
    [product, allProducts]
  )

  const isWishlisted = wishlistIds.includes(product.id)
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0
  const inCart = lines.find((l) => l.productId === product.id && l.size === size)
  const soldOut = product.stockQuantity < 1 || product.status !== "live"

  const shownReviews = useMemo(() => {
    const filtered = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews
    return [...filtered].sort(SORTS[sortKey].fn)
  }, [reviews, sortKey, starFilter])

  const deliveryDate = new Date(Date.now() + 4 * 86400000)

  async function handleAdd(e) {
    const anchor = e.currentTarget
    setAdding(true)
    await addToCart(product, size, qty, anchor)
    setAdding(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-white/40">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer transition-colors hover:text-lime"
        >
          Home
        </button>
        <ChevronRight size={12} />
        <span>{product.category}</span>
        <ChevronRight size={12} />
        <span className="text-white/70">{product.name}</span>
      </nav>

      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-lime"
      >
        <ArrowLeft size={15} /> Back to shop
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_300px]">
        <Gallery
          gallery={product.gallery}
          name={product.name}
          active={activeImage}
          onSelect={setActiveImage}
        />

        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-white/40">
            {product.brand}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
            {product.name}
          </h1>

          <a
            href="#reviews"
            className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-sm hover:underline"
          >
            <StarRating value={average} size={15} />
            <span className="font-semibold text-white">{average.toFixed(1)}</span>
            <span className="text-white/40">({total} reviews)</span>
          </a>

          <div className="mt-4 flex flex-wrap items-baseline gap-2.5 border-b border-line pb-5">
            <span className="font-display text-3xl font-bold text-white">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="text-base text-white/35 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="rounded-full bg-lime/15 px-2.5 py-1 text-xs font-bold text-lime">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Chip icon={ShieldCheck} label={`Condition: ${product.condition}`} />
            <Chip icon={Leaf} label={`${product.era} era`} />
            <Chip
              icon={Ruler}
              label={product.sizes.length > 1 ? `${product.sizes.length} sizes` : "One size"}
            />
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-white/60">
                About this piece
              </h2>
              <p className="text-sm leading-relaxed text-white/60">{product.description}</p>
            </div>
          )}

          {product.highlights?.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2">
              {product.highlights.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-white/65">
                  <Check size={15} className="mt-0.5 shrink-0 text-lime" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {product.flaws && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-surface p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-pink" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-white/60">
                  Condition notes
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{product.flaws}</p>
              </div>
            </div>
          )}

          {product.details?.length > 0 && (
            <div className="mt-7">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-white/60">
                Product details
              </h2>
              <dl className="overflow-hidden rounded-xl border border-line">
                {product.details.map((row, i) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[40%_60%] text-sm sm:grid-cols-[35%_65%] ${
                      i % 2 ? "bg-surface" : "bg-surface2"
                    }`}
                  >
                    <dt className="px-4 py-2.5 font-medium text-white/45">{row.label}</dt>
                    <dd className="px-4 py-2.5 text-white/80">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <aside className="lg:col-span-2 xl:col-span-1">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface p-5 xl:sticky xl:top-24 xl:max-w-none">
            <p className="font-display text-2xl font-bold text-white">{formatPrice(product.price)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-lime">
              <Truck size={13} /> Free shipping
            </p>
            <p className="mt-2.5 text-sm text-white/50">
              Arrives by{" "}
              <span className="font-semibold text-white">
                {deliveryDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </p>

            {soldOut ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-pink">
                <span className="h-1.5 w-1.5 rounded-full bg-pink" />
                Sold — this was the only one
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                In stock — only {product.stockQuantity} available
              </p>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-[46px] cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      size === s
                        ? "border-lime bg-lime text-ink"
                        : "border-line bg-surface2 text-white/70 hover:border-lime/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Qty</p>
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface2 px-2 py-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-ink hover:text-lime"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-semibold text-white">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-white/70 hover:bg-ink hover:text-lime"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={soldOut || isAdding}
              onClick={handleAdd}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime py-3 font-display text-sm font-bold text-ink shadow-glow transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isAdding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShoppingBag size={16} />
              )}
              {soldOut ? "Sold out" : `Add to Bag · ${formatPrice(product.price * qty)}`}
            </button>

            {inCart && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-lime">
                <Check size={13} /> {inCart.qty} in your bag (size {size})
              </p>
            )}

            <button
              type="button"
              onClick={(e) => toggleWishlist(product, e.currentTarget)}
              className={`mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-3 text-sm font-bold transition-colors ${
                isWishlisted
                  ? "border-pink bg-pink/10 text-pink"
                  : "border-line bg-surface2 text-white/70 hover:border-pink hover:text-pink"
              }`}
            >
              <Heart size={15} fill={isWishlisted ? "currentColor" : "none"} />
              {isWishlisted ? "Saved to wishlist" : "Save for later"}
            </button>

            <ul className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4 text-xs text-white/45">
              <li className="flex items-center gap-2">
                <RotateCcw size={14} className="shrink-0 text-white/30" />
                14-day returns on everything
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0 text-white/30" />
                Inspected, cleaned and steamed
              </li>
              <li className="flex items-center gap-2">
                <Leaf size={14} className="shrink-0 text-white/30" />
                Carbon-neutral delivery
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <ReviewSection
        average={average}
        total={total}
        breakdown={breakdown}
        reviews={shownReviews}
        visible={visibleReviews}
        onShowMore={() => setVisibleReviews((v) => v + REVIEWS_PER_PAGE)}
        sortKey={sortKey}
        onSortChange={setSortKey}
        starFilter={starFilter}
        onStarFilter={(stars) => {
          setStarFilter((current) => (current === stars ? null : stars))
          setVisibleReviews(REVIEWS_PER_PAGE)
        }}
      />

      {related.length > 0 && (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="mb-5 font-display text-xl font-bold text-white">You might also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProduct(item)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-colors hover:border-lime/50"
              >
                <div className="aspect-[4/5] overflow-hidden bg-surface2">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-3.5">
                  <p className="text-[11px] text-white/40">{item.brand}</p>
                  <p className="truncate font-display text-sm font-semibold text-white group-hover:text-lime">
                    {item.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-display text-base font-bold text-white">
                      {formatPrice(item.price)}
                    </span>
                    {item.originalPrice && (
                      <span className="text-xs text-white/35 line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Gallery({ gallery, name, active, onSelect }) {
  if (!gallery?.length) return <div className="aspect-[4/5] rounded-2xl bg-surface2" />

  const current = gallery[Math.min(active, gallery.length - 1)]

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <div className="flex shrink-0 gap-3 sm:flex-col">
        {gallery.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`View ${shot.label} image`}
            className={`h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors sm:h-20 sm:w-20 ${
              active === i ? "border-lime" : "border-line hover:border-white/40"
            }`}
          >
            <img
              src={shot.src}
              alt={shot.label}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* self-start stops the frame stretching to the height of the info column */}
      <div className="relative min-w-0 flex-1 self-start overflow-hidden rounded-2xl border border-line bg-surface2">
        <img
          src={current.src}
          alt={`${name} — ${current.label}`}
          className="aspect-[4/5] w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {current.label}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
          {active + 1} / {gallery.length}
        </span>
      </div>
    </div>
  )
}

function ReviewSection({
  average,
  total,
  breakdown,
  reviews,
  visible,
  onShowMore,
  sortKey,
  onSortChange,
  starFilter,
  onStarFilter,
}) {
  return (
    <section id="reviews" className="mt-14 scroll-mt-24 border-t border-line pt-10">
      <h2 className="mb-6 font-display text-xl font-bold text-white">Customer reviews</h2>

      {total === 0 ? (
        <p className="py-8 text-sm text-white/40">
          No reviews yet — this piece hasn't been rated.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-bold text-white">
                {average.toFixed(1)}
              </span>
              <div>
                <StarRating value={average} size={16} />
                <p className="mt-1 text-xs text-white/40">{total} global reviews</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = breakdown[stars] ?? 0
                const percent = total ? Math.round((count / total) * 100) : 0
                const isActive = starFilter === stars
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => onStarFilter(stars)}
                    disabled={count === 0}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isActive ? "bg-lime/10" : "hover:bg-surface2"
                    }`}
                  >
                    <span
                      className={`w-12 shrink-0 text-left ${isActive ? "text-lime" : "text-white/60"}`}
                    >
                      {stars} star
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                      <span
                        className={`block h-full rounded-full ${isActive ? "bg-lime" : "bg-lime/60"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-white/45">{percent}%</span>
                  </button>
                )
              })}
            </div>

            {starFilter && (
              <button
                type="button"
                onClick={() => onStarFilter(starFilter)}
                className="mt-3 cursor-pointer text-xs text-lime underline decoration-dotted"
              >
                Clear {starFilter}-star filter
              </button>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-line pb-3">
              <p className="text-sm text-white/45">
                {reviews.length} {starFilter ? `${starFilter}-star` : ""} review
                {reviews.length === 1 ? "" : "s"}
              </p>
              <label className="flex items-center gap-2 text-xs text-white/45">
                Sort by
                <select
                  value={sortKey}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-lime"
                >
                  {Object.entries(SORTS).map(([key, { label }]) => (
                    <option key={key} value={key} className="bg-surface">
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {reviews.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/40">
                No reviews match that filter.
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {reviews.slice(0, visible).map((review) => (
                  <article key={review.id} className="border-b border-line pb-6 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface2 font-display text-xs font-bold text-white/70">
                        {review.author?.[0] ?? "?"}
                      </span>
                      <span className="text-sm font-semibold text-white">{review.author}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StarRating value={review.rating} size={13} />
                      <span className="text-xs text-white/35">
                        Reviewed on {formatDate(review.date)}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                        {review.comment}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {visible < reviews.length && (
              <button
                type="button"
                onClick={onShowMore}
                className="mt-5 w-full cursor-pointer rounded-full border border-line bg-surface2 py-3 text-sm font-bold text-white transition-colors hover:border-lime hover:text-lime"
              >
                Show more reviews ({reviews.length - visible} remaining)
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Chip({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-white/65">
      <Icon size={13} className="text-lime" />
      {label}
    </span>
  )
}
