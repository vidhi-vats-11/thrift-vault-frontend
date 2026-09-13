import { Loader2, SearchX, X } from "lucide-react"
import RankedProductGrid from "./RankedProductGrid"
import CategoryStrip from "./CategoryStrip"

// Suggestions are phrased to show off what the search actually understands —
// synonyms ("kicks"), moods ("something warm") and price hints ("under 2000") —
// rather than just listing category names the shopper could already click.
const SUGGESTIONS = ["jeans", "kicks", "something warm", "jacket under 3000", "bags"]

export default function SearchResults({
  term,
  results,
  isLoading,
  categories,
  activeCategory,
  onCategoryChange,
  activeGender,
  onClearFilters,
  onSuggest,
  onClear,
  onQuickView,
  onSelectProduct,
}) {
  const hasFilters = activeCategory !== "All" || Boolean(activeGender)

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-6">
          <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-lime">
            Search
          </p>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Results for “{term}”
            </h1>
            {!isLoading && (
              <span className="text-sm text-white/45">
                {results.length} {results.length === 1 ? "piece" : "pieces"}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClear}
            className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:border-pink hover:text-pink"
          >
            <X size={13} /> Clear search
          </button>
        </div>

        {/* Shown whenever there are results OR a filter is narrowing them. It used
            to be hidden on an empty result set, which hid the very chip that had
            emptied it — the shopper saw "nothing matched" with no way to tell why. */}
        {(results.length > 0 || hasFilters) && (
          <div className="mb-6">
            <CategoryStrip
              categories={categories}
              active={activeCategory}
              onChange={onCategoryChange}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-white/40">
            <Loader2 size={22} className="animate-spin text-lime" />
            Searching the vault...
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-surface2 text-white/30">
              <SearchX size={26} />
            </div>
            <p className="font-display text-white/70">Nothing matched “{term}”</p>

            {hasFilters ? (
              // The query itself may well have matched — a filter is hiding the
              // results. Say so, and offer the one click that fixes it.
              <>
                <p className="max-w-sm px-6 text-sm text-white/40">
                  {activeCategory !== "All" && activeGender
                    ? `You're still filtered to ${activeCategory} and ${activeGender}.`
                    : activeCategory !== "All"
                      ? `You're still filtered to ${activeCategory}.`
                      : `You're still filtered to ${activeGender}.`}{" "}
                  There may be matches outside it.
                </p>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="mt-1 cursor-pointer rounded-full border border-lime px-3 py-1.5 text-xs font-semibold text-lime transition-colors hover:bg-lime hover:text-ink"
                >
                  Search all categories
                </button>
              </>
            ) : (
              <>
                <p className="max-w-sm px-6 text-sm text-white/40">
                  Every piece here is one-of-one, so stock moves fast. Try something
                  broader:
                </p>
                <div className="mt-1 flex flex-wrap justify-center gap-2 px-6">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      // Runs the suggested search. This used to call onClear, so
                      // tapping a suggestion wiped the query and dumped the shopper
                      // back on the shop page — the opposite of what it advertises.
                      onClick={() => onSuggest(s)}
                      className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:border-lime hover:text-lime"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <RankedProductGrid
            products={results}
            onQuickView={onQuickView}
            onSelectProduct={onSelectProduct}
          />
        )}
      </div>
    </section>
  )
}
