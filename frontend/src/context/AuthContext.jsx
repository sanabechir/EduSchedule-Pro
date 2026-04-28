import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

const API_URL = 'http://localhost/EduSchedule-Pro/backend/api'

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const savedUser = localStorage.getItem('user')
      if (savedUser) setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth.php?action=login`, {
        email,
        password
      })
      if (res.data.success) {
        const { token: newToken, user: newUser } = res.data
        setToken(newToken)
        setUser(newUser)
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        return { success: true, user: newUser }
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Erreur de connexion'
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext