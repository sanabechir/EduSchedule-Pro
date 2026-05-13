import { useEffect, useState } from 'react'
import DynamicDashboard from './pages/DynamicDashboard.jsx'
import RapportsPageNew from './pages/RapportsPage.jsx'
import PointageQRCode from './pages/PointageQRCode.jsx'
import CahierTextePage from './pages/CahierTextePage.jsx'
import VacationsPageNew from './pages/VacationsPage.jsx'
import EmploiTempsISGE from './pages/EmploiTempsISGE.jsx'
import {
  canViewDashboard,
  canViewEmploiTemps,
  canViewPointage,
  canViewCahierTexte,
  canViewVacations,
  canViewRapports,
  getCahierMenuLabel,
  getPointageMenuLabel,
  getRoleInitial,
  getRoleLabel,
  getVacationMenuLabel,
} from './services/permissions.js'

const API_BASE = 'http://localhost/EduSchedule-Pro/backend/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [page, setPage] = useState('dashboard')

  const visibleNavigation = getNavigationByUser(user)

  useEffect(() => {
    if (!token || !user) return

    const currentPageIsAllowed = visibleNavigation.some((item) => item.key === page)

    if (!currentPageIsAllowed && visibleNavigation.length > 0) {
      setPage(visibleNavigation[0].key)
    }
  }, [token, user, page, visibleNavigation])

  const handleLoginSuccess = (tokenValue, userValue) => {
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userValue))
    setToken(tokenValue)
    setUser(userValue)

    const firstVisiblePage = getNavigationByUser(userValue)[0]?.key || 'dashboard'
    setPage(firstVisiblePage)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken('')
    setUser(null)
    setPage('dashboard')
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <DashboardLayout
      page={page}
      setPage={setPage}
      user={user}
      onLogout={logout}
      nav={visibleNavigation}
    >
      {page === 'dashboard' && canViewDashboard(user) && (
        <DynamicDashboard user={user} setPage={setPage} />
      )}

      {page === 'emploi' && canViewEmploiTemps(user) && (
        <EmploiTempsISGE user={user} />
      )}

      {page === 'qr' && canViewPointage(user) && (
        <PointageQRCode user={user} />
      )}

      {page === 'cahier' && canViewCahierTexte(user) && (
        <CahierTextePage user={user} />
      )}

      {page === 'vacations' && canViewVacations(user) && (
        <VacationsPageNew user={user} />
      )}

      {page === 'rapports' && canViewRapports(user) && (
        <RapportsPageNew user={user} />
      )}

      {!visibleNavigation.some((item) => item.key === page) && (
        <AccessDenied user={user} />
      )}
    </DashboardLayout>
  )
}

/* =========================
   LOGIN
========================= */

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@isge.bf')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/auth_clean.php?action=login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.message || 'Connexion impossible')
      }

      onLoginSuccess(json.data.token, json.data.user)
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-icon">ES</div>
          <div>
            <h1>EduSchedule Pro</h1>
            <p>Gestion académique intelligente</p>
          </div>
        </div>

        <div className="hero-content">
          <h2>Gérez les emplois du temps avec précision.</h2>
          <p>
            Une plateforme moderne pour planifier les séances, suivre les
            présences, gérer les cahiers de texte et préparer les vacations.
          </p>

          <div className="hero-features">
            <span>✓ Emploi du temps centralisé</span>
            <span>✓ Pointage QR-Code</span>
            <span>✓ Cahier de texte numérique</span>
            <span>✓ Validation des vacations</span>
          </div>
        </div>

        <div className="hero-stats">
          <div>
            <strong>5</strong>
            <span>Classes actives</span>
          </div>
          <div>
            <strong>8</strong>
            <span>Enseignants</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>Suivi académique</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submitLogin}>
          <div className="login-card-icon">ES</div>

          <h2>Bienvenue !</h2>
          <p>Connectez-vous à votre espace.</p>

          {error && <div className="error-box">{error}</div>}

          <label>Email</label>
          <input
            type="email"
            placeholder="admin@isge.bf"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </div>
  )
}

/* =========================
   LAYOUT
========================= */

function DashboardLayout({ children, page, setPage, user, onLogout, nav }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">ES</div>
          <div>
            <h1>EduSchedule Pro</h1>
            <p>Gestion académique</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section">Modules</p>

          {nav.map((item) => (
            <button
              key={item.key}
              className={page === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => setPage(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar small">{getRoleInitial(user)}</div>
          <div>
            <strong>{getRoleLabel(user)}</strong>
            <span>{user?.email || 'admin@isge.bf'}</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h2>{getPageTitle(page, user)}</h2>
            <p>{getTopbarDescription(user)}</p>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn">🔔</button>

            <div className="user-chip">
              <div className="avatar">{getRoleInitial(user)}</div>
              <div>
                <strong>{getRoleLabel(user)}</strong>
                <span>{user?.email || 'admin@isge.bf'}</span>
              </div>
            </div>

            <button className="logout-btn" onClick={onLogout}>
              Déconnexion
            </button>
          </div>
        </header>

        <section className="content-area">{children}</section>
      </main>
    </div>
  )
}

/* =========================
   NAVIGATION PAR PERMISSIONS
========================= */

function getNavigationByUser(user) {
  const nav = []

  if (canViewDashboard(user)) {
    nav.push({
      key: 'dashboard',
      label: 'Tableau de bord',
      icon: 'TD',
    })
  }

  if (canViewEmploiTemps(user)) {
    nav.push({
      key: 'emploi',
      label: 'Emploi du temps',
      icon: 'ET',
    })
  }

  if (canViewPointage(user)) {
    nav.push({
      key: 'qr',
      label: getPointageMenuLabel(user),
      icon: 'QR',
    })
  }

  if (canViewCahierTexte(user)) {
    nav.push({
      key: 'cahier',
      label: getCahierMenuLabel(user),
      icon: 'CT',
    })
  }

  if (canViewVacations(user)) {
    nav.push({
      key: 'vacations',
      label: getVacationMenuLabel(user),
      icon: 'FV',
    })
  }

  if (canViewRapports(user)) {
    nav.push({
      key: 'rapports',
      label: 'Rapports',
      icon: 'RP',
    })
  }

  return nav
}

function getPageTitle(page, user) {
  const titles = {
    dashboard: 'Tableau de bord',
    emploi: 'Emploi du temps',
    qr: getPointageMenuLabel(user),
    cahier: getCahierMenuLabel(user),
    vacations: getVacationMenuLabel(user),
    rapports: 'Rapports & Statistiques',
  }

  return titles[page] || 'EduSchedule Pro'
}

function getTopbarDescription(user) {
  const role = String(user?.role || 'admin').toLowerCase()

  if (role === 'enseignant') {
    return 'Bienvenue dans votre espace enseignant.'
  }

  if (role === 'delegue') {
    return 'Bienvenue dans votre espace délégué de classe.'
  }

  if (role === 'surveillant') {
    return 'Bienvenue dans votre espace de contrôle académique.'
  }

  if (role === 'comptable') {
    return 'Bienvenue dans votre espace comptabilité.'
  }

  return 'Bienvenue dans votre espace de gestion académique.'
}

function AccessDenied({ user }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Accès non autorisé</h1>
          <p>
            Votre rôle actuel ({getRoleLabel(user)}) ne permet pas d’accéder à
            cette page.
          </p>
        </div>
      </div>

      <div className="panel">
        <p>
          Sélectionnez un module autorisé dans le menu de gauche ou reconnectez-vous
          avec un compte disposant des permissions nécessaires.
        </p>
      </div>
    </div>
  )
}

export default App