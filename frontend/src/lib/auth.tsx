import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '@/api'
import type { Me, Role } from '@/types'

interface AuthValue {
  user: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<Me>
  logout: () => void
  /** Muat ulang data user (mis. setelah membership berubah) */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(() => !!tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api.auth
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    tokenStore.set(res.token)
    const me = await api.auth.me()
    setUser(me)
    return me
  }, [])

  const refresh = useCallback(async () => {
    setUser(await api.auth.me())
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const homeFor = (role: Role) => (role === 'MEMBER' ? '/app' : role === 'TRAINER' ? '/trainer' : '/admin')
