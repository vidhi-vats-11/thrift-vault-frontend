import { Star, Quote } from "lucide-react"

const REVIEWS = [
  {
    name: "Priya M.",
    handle: "@priyathrifts",
    text: "Copped a Y2K windbreaker for $42 that would've been $150 anywhere else. The condition tags are actually accurate too.",
    rating: 5,
  },
  {
    name: "Devon K.",
    handle: "@devon.reworn",
    text: "Quick view + size chart made checkout so easy on mobile. My cargo pants fit perfectly first try.",
    rating: 5,
  },
  {
    name: "Ananya S.",
    handle: "@ananya.fits",
    text: "Love that every piece is one-of-one. Nobody else at my school has this trucker jacket lol.",
    rating: 4,
  },
]

export default function Testimonials() {
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-widest text-pink">
            The Community
          </p>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Straight from thrifters</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <div
              key={r.handle}
              className="flex cursor-default flex-col gap-4 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-violet/50"
            >
              <Quote className="text-violet" size={22} />
              <p className="flex-1 text-sm leading-relaxed text-white/70">"{r.text}"</p>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <div>
                  <p className="text-sm font-semibold text-white">{r.name}</p>
                  <p className="text-xs text-white/40">{r.handle}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < r.rating ? "fill-lime text-lime" : "text-white/20"}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
