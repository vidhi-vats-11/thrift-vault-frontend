import { SearchX } from "lucide-react"
import ProductCard from "./ProductCard"

export default function ProductGrid({ products, onQuickView, onSelectProduct }) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-20 text-center">
        <SearchX size={32} className="text-white/30" />
        <p className="font-display text-white/70">No pieces match your search</p>
        <p className="text-sm text-white/40">Try a different category or keyword.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onQuickView={onQuickView}
          onSelectProduct={onSelectProduct}
        />
      ))}
    </div>
  )
}
