import { ArrowRight } from "lucide-react"

// Shop-by-gender. `unisex` is offered as its own door rather than hidden, because
// it is the largest slice of a secondhand streetwear catalogue and plenty of people
// are specifically looking for it.
const GENDERS = [
  { value: "women", label: "Women", blurb: "Cut for women" },
  { value: "men", label: "Men", blurb: "Cut for men" },
  { value: "unisex", label: "Unisex", blurb: "Wears either way" },
]

/**
 * Picks a representative photo per tile straight from the live catalogue, so the
 * imagery is always something genuinely in stock. A hardcoded image would go stale
 * the moment that piece sold — which, with one-of-one stock, is soon.
 */
const coverFor = (products, predicate) =>
  products.find((p) => predicate(p) && p.images?.[0])?.images?.[0] ?? null

export default function BrowseSections({ products, categories, onPickGender, onPickCategory }) {
  const count = (predicate) => products.filter(predicate).length

  // "All" is a UI affordance from the category strip, not a real category.
  const realCategories = categories.filter((c) => c !== "All")

  return (
    <>
      <section id="shop-by" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-lime">
            Shop by
          </p>
          <h2 className="mb-6 font-display text-2xl font-bold text-white sm:text-3xl">
            Find your fit
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {GENDERS.map((g) => {
              const n = count((p) => p.gender === g.value)
              const cover = coverFor(products, (p) => p.gender === g.value)
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => onPickGender(g.value)}
                  className="group relative h-40 cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface2 text-left sm:h-56"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    <span className="min-w-0">
                      <span className="block font-display text-xl font-bold text-white">
                        {g.label}
                      </span>
                      <span className="block text-xs text-white/50">
                        {g.blurb} · {n} {n === 1 ? "piece" : "pieces"}
                      </span>
                    </span>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-lime transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section id="categories" className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <p className="mb-1 font-display text-sm font-bold uppercase tracking-widest text-pink">
            Categories
          </p>
          <h2 className="mb-6 font-display text-2xl font-bold text-white sm:text-3xl">
            Browse the rails
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {realCategories.map((c) => {
              const n = count((p) => p.category === c)
              const cover = coverFor(products, (p) => p.category === c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onPickCategory(c)}
                  className="group relative h-32 cursor-pointer overflow-hidden rounded-xl border border-line bg-surface2 text-left sm:h-40"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3">
                    <span className="block truncate font-display text-sm font-bold text-white">
                      {c}
                    </span>
                    <span className="block text-[11px] text-white/45">
                      {n} {n === 1 ? "piece" : "pieces"}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
