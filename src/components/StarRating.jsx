import { Star } from "lucide-react"

/**
 * Renders `value` out of 5 stars, filling partial stars by clipping an overlay —
 * so 4.6 actually looks like 4.6 rather than rounding to 5.
 */
export default function StarRating({ value, size = 14, className = "" }) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {stars.map((n) => {
        const fillPercent = Math.max(0, Math.min(1, value - (n - 1))) * 100
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-white/20" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <Star size={size} className="fill-lime text-lime" />
            </span>
          </span>
        )
      })}
    </span>
  )
}
