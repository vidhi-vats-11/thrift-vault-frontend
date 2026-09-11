import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, clearSession, hasSession, setSessionLostHandler, storeSession } from "../lib/api"

const AuthContext = createContext(null)

// Seeded by Backend/prisma/seed.js — handy for signing in without registering.
export const DEMO_CREDENTIALS = {
  email: "shopper@thriftvault.test",
  password: "Password123!",
}

// The pre-API build kept accounts, cart and wishlist in localStorage under these
// keys. They hold static product ids like "tv-001" which the API rejects (it uses
// UUIDs), so clear them once rather than letting them cause confusing failures.
const LEGACY_KEYS = [
  "thrift-vault-users",
  "thrift-vault-session",
  "thrift-vault-cart",
  "thrift-vault-wishlist",
]

function dropLegacyLocalData() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Starts true so the app can show a splash instead of flashing the login page
  // while the stored refresh token is exchanged.
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    dropLegacyLocalData()

    // A rejected refresh token (expired, revoked, or the API's database was reset)
    // drops us back to the login screen rather than leaving a half-signed-in UI.
    setSessionLostHandler(() => setUser(null))

    if (!hasSession()) {
      setLoading(false)
      return
    }

    api.auth
      .me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const data = await api.auth.login({ email: email.trim(), password })
      storeSession(data)
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: friendlyError(err, "Could not sign you in.") }
    }
  }, [])

  const signup = useCallback(async (name, email, password) => {
    try {
      const data = await api.auth.signup({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      storeSession(data)
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: friendlyError(err, "Could not create your account.") }
    }
  }, [])

  // Kept in the context rather than the page so that everything reading `user`
  // updates at once — the navbar greeting and the catalogue's gender ranking both
  // react to a profile change without a reload.
  const updateProfile = useCallback(async (patch) => {
    try {
      setUser(await api.auth.updateProfile(patch))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: friendlyError(err, "Could not save your profile.") }
    }
  }, [])

  const logout = useCallback(async () => {
    // Revoke server-side where possible, but always drop the local session so a
    // network failure can't trap someone in a signed-in state.
    try {
      await api.auth.logout()
    } catch {
      /* ignore */
    }
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      updateProfile,
    }),
    [user, isLoading, login, signup, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function friendlyError(err, fallback) {
  // A failed fetch (API down) has no HTTP status
  if (err?.status === undefined) {
    return "Can't reach the API. Is the backend running on port 4000?"
  }
  return err.message || fallback
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider")
  return ctx
}
