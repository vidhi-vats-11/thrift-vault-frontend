export default function CategoryStrip({ categories, active, onChange }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
      {categories.map((cat) => {
        const isActive = cat === active
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-lime bg-lime text-ink"
                : "border-line bg-surface text-white/60 hover:border-lime/60 hover:text-white"
            }`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
