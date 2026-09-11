// Thin client for the Express API in ../Backend.
//
// Token handling: the access token (15 min) lives in memory only, the refresh token
// (30 days) in localStorage. On a 401 the client transparently refreshes once and
// replays the request, so callers never deal with expiry.

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"
const REFRESH_KEY = "thrift-vault-refresh"

let accessToken = null
let refreshInFlight = null
let onSessionLost = null

/** Called when the refresh token is rejected, so the UI can drop back to login. */
export function setSessionLostHandler(fn) {
  onSessionLost = fn
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)
export const hasSession = () => Boolean(getRefreshToken())

export function storeSession({ accessToken: at, refreshToken: rt }) {
  accessToken = at ?? null
  if (rt) localStorage.setItem(REFRESH_KEY, rt)
}

export function clearSession() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function send(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await parseBody(res)

  if (!res.ok) {
    // The API's error handler returns { error: { message, details } }
    const message =
      payload?.error?.message ?? payload?.message ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status, payload?.error?.details ?? payload?.details)
  }

  return payload
}

/** Exchange the stored refresh token for a new pair. Deduped across callers. */
function refreshSession() {
  if (refreshInFlight) return refreshInFlight

  const token = getRefreshToken()
  if (!token) return Promise.reject(new ApiError("No session", 401))

  refreshInFlight = send("/auth/refresh", {
    method: "POST",
    body: { refreshToken: token },
    auth: false,
  })
    .then((data) => {
      // The API rotates refresh tokens, so the new one must replace the old.
      storeSession(data)
      return data
    })
    .catch((err) => {
      clearSession()
      onSessionLost?.()
      throw err
    })
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

async function request(path, options = {}) {
  const needsAuth = options.auth !== false

  // On a cold load the access token is gone (it only ever lived in memory) but the
  // refresh token survives. Refresh up front rather than firing a request we know
  // will 401 — that round trip is wasted and shows up as a console error.
  if (needsAuth && !accessToken && getRefreshToken()) {
    if (options.authOptional) {
      // The catalogue is public but sends credentials when it has them, so it can
      // be ranked for the signed-in shopper. A stale or revoked refresh token must
      // therefore NOT take the shop down with it — fall through and ask anonymously.
      try {
        await refreshSession()
      } catch {
        /* browsing signed out */
      }
    } else {
      await refreshSession()
    }
  }

  try {
    return await send(path, options)
  } catch (err) {
    const canRetry = err.status === 401 && needsAuth && getRefreshToken()
    if (!canRetry) throw err
    await refreshSession()
    return send(path, options)
  }
}

const qs = (params) => {
  const search = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, v)
  })
  const str = search.toString()
  return str ? `?${str}` : ""
}

export const api = {
  auth: {
    signup: (body) => request("/auth/signup", { method: "POST", body, auth: false }),
    login: (body) => request("/auth/login", { method: "POST", body, auth: false }),
    me: () => request("/auth/me"),
    updateProfile: (body) => request("/auth/me", { method: "PATCH", body }),
    refresh: refreshSession,
    logout: () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return Promise.resolve()
      return request("/auth/logout", { method: "POST", body: { refreshToken } })
    },
  },

  products: {
    // Sent WITH credentials when there is a session: /products is public, but it
    // uses the signed-in shopper's gender to rank results (never to filter them).
    // Signed out, `request` simply omits the header and the default order applies.
    list: (params) => request(`/products${qs(params)}`, { authOptional: true }),
    get: (id) => request(`/products/${id}`, { auth: false }),
  },

  categories: {
    list: () => request("/categories", { auth: false }),
  },

  cart: {
    get: () => request("/cart"),
    add: (body) => request("/cart/items", { method: "POST", body }),
    update: (id, qty) => request(`/cart/items/${id}`, { method: "PATCH", body: { qty } }),
    remove: (id) => request(`/cart/items/${id}`, { method: "DELETE" }),
    clear: () => request("/cart", { method: "DELETE" }),
    merge: (items) => request("/cart/merge", { method: "POST", body: { items } }),
  },

  wishlist: {
    get: () => request("/wishlist"),
    toggle: (productId) => request(`/wishlist/${productId}`, { method: "POST" }),
    merge: (productIds) => request("/wishlist/merge", { method: "POST", body: { productIds } }),
  },

  addresses: {
    list: () => request("/addresses"),
    create: (body) => request("/addresses", { method: "POST", body }),
  },

  orders: {
    create: ({ addressId, idempotencyKey }) =>
      request("/orders", {
        method: "POST",
        body: addressId ? { addressId } : {},
        headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
      }),
    list: () => request("/orders"),
    get: (id) => request(`/orders/${id}`),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
  },

  returns: {
    reasons: () => request("/orders/returns/reasons"),
    mine: () => request("/orders/returns/mine"),
    create: (body) => request("/orders/returns", { method: "POST", body }),
  },

  newsletter: {
    subscribe: (email) =>
      request("/newsletter/subscribe", { method: "POST", body: { email }, auth: false }),
  },

  // Every /admin route is behind requireAuth + requireAdmin, so these 403 for a
  // normal shopper even if the UI is reached some other way.
  admin: {
    products: () => request("/admin/products"),
    updateProduct: (id, body) => request(`/admin/products/${id}`, { method: "PATCH", body }),
    orders: (status) => request(`/admin/orders${qs({ status })}`),
    updateOrder: (id, status) =>
      request(`/admin/orders/${id}`, { method: "PATCH", body: { status } }),
    // Returns 204 with no body. Restocks the items first if the order was still
    // holding them, so deleting a pending checkout can't strand a one-of-one piece.
    deleteOrder: (id) => request(`/admin/orders/${id}`, { method: "DELETE" }),
    returns: (status) => request(`/admin/returns${qs({ status })}`),
    resolveReturn: (id, status) =>
      request(`/admin/returns/${id}`, { method: "PATCH", body: { status } }),
  },

  payments: {
    /**
     * Settles the order for the demo.
     *
     * With a real provider this happens server-to-server: the gateway posts a signed
     * webhook to /payments/webhook and the browser is never involved. There is no
     * provider here, so the client tells the API its own order is paid and the API
     * verifies ownership before settling it. The browser no longer handles webhook
     * signatures at all — it never should have.
     */
    simulateCapture: (gatewayRef, { fail = false } = {}) =>
      request("/payments/mock/confirm", { method: "POST", body: { gatewayRef, fail } }),
  },
}
