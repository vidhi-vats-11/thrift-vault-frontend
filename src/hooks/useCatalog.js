import { useCallback, useEffect, useState } from "react"
import { api } from "../lib/api"

/**
 * Loads the whole catalogue once and lets the UI filter it in memory.
 *
 * The API also supports server-side `category` / `q` / `sort` / pagination params
 * (see Backend catalog.routes.js) — worth switching to when the catalogue outgrows
 * a single page. At a dozen one-of-one pieces, fetching once keeps search instant
 * and avoids a request per keystroke.
 */
export function useCatalog() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(["All"])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [productRes, categoryRes] = await Promise.all([
        api.products.list({ limit: 100 }),
        api.categories.list(),
      ])
      setProducts(productRes.data)
      setCategories(["All", ...categoryRes.data.map((c) => c.name)])
    } catch (err) {
      setError(
        err?.status === undefined
          ? "Can't reach the API. Is the backend running on port 4000?"
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { products, categories, isLoading, error, reload: load }
}

/**
 * Server-side search, used only while the shopper is actually typing.
 *
 * This deliberately does NOT reuse the in-memory filter above. The API understands
 * far more than a substring match: it maps "jeans" onto the Denim category, reads
 * price hints out of "cheap jeans", and ranks results by the signed-in shopper's
 * gender. None of that can be reproduced by filtering an array in the browser, so
 * once there is a query the answer has to come from the server.
 *
 * Debounced so a five-letter word costs one request rather than five.
 */
export function useProductSearch(term, delay = 250) {
  const [results, setResults] = useState([])
  const [isSearching, setSearching] = useState(false)

  useEffect(() => {
    const query = term.trim()
    if (!query) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    // `cancelled` guards against a slow early request landing after a fast later
    // one and overwriting newer results with stale ones.
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await api.products.list({ q: query, limit: 100 })
        if (!cancelled) setResults(res.data)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term, delay])

  return { results, isSearching }
}

/** Same-category first, then same-era, for the "you might also like" rail. */
export function getRelatedProducts(product, allProducts, limit = 4) {
  if (!product) return []
  const sameCategory = allProducts.filter(
    (p) => p.id !== product.id && p.category === product.category
  )
  const sameEra = allProducts.filter(
    (p) => p.id !== product.id && p.category !== product.category && p.era === product.era
  )
  return [...sameCategory, ...sameEra].slice(0, limit)
}
