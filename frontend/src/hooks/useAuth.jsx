import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

function decodeJwtPayload(token) {
  try {
    const part = (token || '').split('.')[1] || ''
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function userFromToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.sub) return null
  return {
    id: payload.sub,
    email: payload.email,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/admin/me')
        .then(res => setUser(res.data))
        .catch((err) => {
          
          
          
          if (err?.response?.status === 401) {
            localStorage.removeItem('token')
            setUser(null)
            return
          }
          const fallback = userFromToken(token)
          if (fallback) setUser(fallback)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, senha) => {
    const res = await api.post('/api/admin/login', { email, senha })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.restaurante)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
