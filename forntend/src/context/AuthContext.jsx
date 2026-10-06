// -----------------------------------------------------------------------------
// src/context/AuthContext.jsx
// Global auth state - wrap the app with <AuthProvider> to use useAuth()
// -----------------------------------------------------------------------------
import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, setToken, clearToken, getToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while verifying existing token

  // On first load: if a token exists in localStorage, verify it with /auth/me
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    authAPI
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => clearToken()) // token expired or invalid - wipe it
      .finally(() => setLoading(false))
  }, [])

  // -- Login ------------------------------------------------------------------
  const login = async (email, password, remember = false, role = null) => {
    const data = await authAPI.login({ email, password, remember, role }, role)
    setToken(data.token, remember)
    setUser(data.user)
    return data.user
  }

  // -- Register ---------------------------------------------------------------
  // Registers new account without auto-logging in (requires manual login)
  const register = async (fields) => {
    const data = await authAPI.register(fields)
    return data
  }

  // -- Logout -----------------------------------------------------------------
  const logout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Convenience hook
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}