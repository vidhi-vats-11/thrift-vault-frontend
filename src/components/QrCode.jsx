import { useMemo } from "react"

const SIZE = 33 // modules per side
const QUIET = 3 // quiet-zone modules around the code

// Deterministic PRNG so the same payload always draws the same pattern
function makeRandom(seed) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

// The structural bits a scanner looks for: three finder squares, one alignment
// square, and the two timing lines.
function isReserved(x, y) {
  const inFinder = (fx, fy) => x >= fx && x < fx + 8 && y >= fy && y < fy + 8
  if (inFinder(0, 0) || inFinder(SIZE - 8, 0) || inFinder(0, SIZE - 8)) return true
  if (x === 6 || y === 6) return true
  if (x >= SIZE - 9 && x < SIZE - 4 && y >= SIZE - 9 && y < SIZE - 4) return true
  return false
}

function buildModules(payload) {
  const rand = makeRandom(payload)
  const on = []

  const fill = (x, y, w, h) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) on.push([x + dx, y + dy])
  }

  // Finder pattern: 7x7 ring with a 3x3 core
  const finder = (fx, fy) => {
    fill(fx, fy, 7, 1)
    fill(fx, fy + 6, 7, 1)
    fill(fx, fy + 1, 1, 5)
    fill(fx + 6, fy + 1, 1, 5)
    fill(fx + 2, fy + 2, 3, 3)
  }
  finder(0, 0)
  finder(SIZE - 7, 0)
  finder(0, SIZE - 7)

  // Alignment pattern: 5x5 ring with a single centre module
  const ax = SIZE - 9
  const ay = SIZE - 9
  fill(ax, ay, 5, 1)
  fill(ax, ay + 4, 5, 1)
  fill(ax, ay + 1, 1, 3)
  fill(ax + 4, ay + 1, 1, 3)
  fill(ax + 2, ay + 2, 1, 1)

  // Timing lines: alternating modules bridging the finders
  for (let i = 8; i < SIZE - 8; i++) {
    if (i % 2 === 0) {
      on.push([i, 6])
      on.push([6, i])
    }
  }

  // Everything else is payload-derived noise
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isReserved(x, y)) continue
      if (rand() > 0.52) on.push([x, y])
    }
  }

  return on
}

/**
 * A QR-styled graphic generated from `payload`.
 *
 * This is deliberately NOT a scannable QR code — it is a visual stand-in for the
 * demo checkout, so nobody can scan it into a real payment app. Swap this for a
 * proper encoder (e.g. the `qrcode` package) if the checkout ever goes live.
 */
export default function QrCode({ payload, className = "" }) {
  const modules = useMemo(() => buildModules(payload), [payload])
  const span = SIZE + QUIET * 2

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      role="img"
      aria-label="Demo QR code placeholder"
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width={span} height={span} fill="#ffffff" rx="1.5" />
      {modules.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + QUIET} y={y + QUIET} width="1" height="1" fill="#0b0b0f" />
      ))}
    </svg>
  )
}
