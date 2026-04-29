import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-lg" style={{ width: '420px' }}>
        <div className="card-body p-5">

          {/* Logo */}
          <div className="text-center mb-4">
            <div className="bg-primary rounded-circle d-inline-flex align-items-center 
                            justify-content-center mb-3"
                 style={{ width: '60px', height: '60px' }}>
              <span className="text-white fs-4">📅</span>
            </div>
            <h4 className="fw-bold text-primary">EduSchedule Pro</h4>
            <p className="text-muted small">Connectez-vous à votre espace</p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Mot de passe</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Connexion...
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          {/* Comptes de test */}
<div className="mt-4 p-3 bg-light rounded">
  <p className="small fw-semibold mb-2">Comptes de test :</p>
  <p className="small mb-1">👤 admin@isge.bf</p>
  <p className="small mb-1">👤 mkabore@isge.bf (enseignant)</p>
  <p className="small mb-0">🔑 password123</p>
</div>

        </div>
      </div>
    </div>
  )
}

export default LoginPage