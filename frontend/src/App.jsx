import { useEffect, useState } from 'react'
import PointageQRCode from './pages/PointageQRCode.jsx'
import EmploiTempsISGE from './pages/EmploiTempsISGE.jsx'

const API_BASE = 'http://localhost/EduSchedule-Pro/backend/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [page, setPage] = useState('dashboard')

  const handleLoginSuccess = (tokenValue, userValue) => {
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userValue))
    setToken(tokenValue)
    setUser(userValue)
    setPage('dashboard')
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
    >
      {page === 'dashboard' && <DashboardRouter token={token} user={user} />}
      {page === 'emploi' && <EmploiTempsISGE token={token} />}
      {page === 'qr' && <PointageQRCode user={user} />}
      {page === 'cahier' && <CahierPage user={user} />}
      {page === 'vacations' && <VacationsPage user={user} />}
      {page === 'rapports' && <RapportsPage user={user} />}
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

function DashboardLayout({ children, page, setPage, user, onLogout }) {
  const nav = getNavigationByRole(user?.role)

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
          <div className="avatar small">{getRoleInitial(user?.role)}</div>
          <div>
            <strong>{getRoleLabel(user?.role)}</strong>
            <span>{user?.email || 'admin@isge.bf'}</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h2>{getPageTitle(page)}</h2>
            <p>Bienvenue dans votre espace de gestion académique.</p>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn">🔔</button>

            <div className="user-chip">
              <div className="avatar">{getRoleInitial(user?.role)}</div>
              <div>
                <strong>{getRoleLabel(user?.role)}</strong>
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

function getNavigationByRole(role) {
  const common = [
    { key: 'dashboard', label: 'Tableau de bord', icon: 'TD' },
    { key: 'emploi', label: 'Emploi du temps', icon: 'ET' },
  ]

  if (role === 'enseignant') {
    return [
      ...common,
      { key: 'qr', label: 'Pointage QR-Code', icon: 'QR' },
      { key: 'cahier', label: 'Cahier de texte', icon: 'CT' },
      { key: 'vacations', label: 'Mes vacations', icon: 'FV' },
      { key: 'rapports', label: 'Rapports', icon: 'RP' },
    ]
  }

  if (role === 'delegue') {
    return [
      ...common,
      { key: 'qr', label: 'Pointage QR-Code', icon: 'QR' },
      { key: 'cahier', label: 'Cahier de texte', icon: 'CT' },
    ]
  }

  if (role === 'surveillant') {
    return [
      ...common,
      { key: 'qr', label: 'Contrôle pointage', icon: 'QR' },
      { key: 'cahier', label: 'Cahiers à contrôler', icon: 'CT' },
      { key: 'rapports', label: 'Rapports', icon: 'RP' },
    ]
  }

  if (role === 'comptable') {
    return [
      { key: 'dashboard', label: 'Tableau de bord', icon: 'TD' },
      { key: 'vacations', label: 'Fiches de vacation', icon: 'FV' },
      { key: 'rapports', label: 'Rapports financiers', icon: 'RP' },
    ]
  }

  return [
    ...common,
    { key: 'qr', label: 'Pointage QR-Code', icon: 'QR' },
    { key: 'cahier', label: 'Cahier de texte', icon: 'CT' },
    { key: 'vacations', label: 'Fiches de vacation', icon: 'FV' },
    { key: 'rapports', label: 'Rapports', icon: 'RP' },
  ]
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    enseignant: 'Enseignant',
    delegue: 'Délégué',
    surveillant: 'Surveillant',
    comptable: 'Comptable',
  }

  return labels[role] || 'Administrateur'
}

function getRoleInitial(role) {
  const initials = {
    admin: 'A',
    enseignant: 'E',
    delegue: 'D',
    surveillant: 'S',
    comptable: 'C',
  }

  return initials[role] || 'A'
}

function getPageTitle(page) {
  const titles = {
    dashboard: 'Tableau de bord',
    emploi: 'Emploi du temps',
    qr: 'Pointage QR-Code',
    cahier: 'Cahier de texte',
    vacations: 'Fiches de vacation',
    rapports: 'Rapports & Statistiques',
  }

  return titles[page] || 'EduSchedule Pro'
}

/* =========================
   DASHBOARD ROUTER
========================= */

function DashboardRouter({ token, user }) {
  const role = user?.role || 'admin'

  if (role === 'enseignant') {
    return <TeacherDashboard token={token} user={user} />
  }

  if (role === 'delegue') {
    return <DelegateDashboard token={token} user={user} />
  }

  if (role === 'surveillant') {
    return <SupervisorDashboard token={token} user={user} />
  }

  if (role === 'comptable') {
    return <AccountantDashboard token={token} user={user} />
  }

  return <AdminDashboard token={token} user={user} />
}

/* =========================
   ADMIN DASHBOARD
========================= */

function AdminDashboard({ token }) {
  const [stats, setStats] = useState({
    classes: 5,
    enseignants: 8,
    matieres: 8,
    salles: 5,
    creneaux: 8,
    pointages: 1,
  })

  useEffect(() => {
    fetch(`${API_BASE}/dashboard.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.stats) {
          setStats(json.data.stats)
        }
      })
      .catch(() => {})
  }, [token])

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Bonjour, Administrateur</h1>
          <p>Vue globale sur la planification, les enseignants et les séances.</p>
        </div>

        <button className="primary-btn">+ Nouvelle séance</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Classes" value={stats.classes} icon="CL" hint="Classes actives" />
        <StatCard label="Enseignants" value={stats.enseignants} icon="EN" hint="Personnel disponible" />
        <StatCard label="Matières" value={stats.matieres} icon="MT" hint="Modules actifs" />
        <StatCard label="Salles" value={stats.salles} icon="SL" hint="Salles disponibles" />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Évolution des séances</h3>
            <select>
              <option>Cette semaine</option>
              <option>Ce mois</option>
            </select>
          </div>

          <ChartBars />

          <div className="mini-stats">
            <div>
              <strong>{stats.creneaux || 8}</strong>
              <span>Séances planifiées</span>
            </div>
            <div>
              <strong>{stats.pointages || 1}</strong>
              <span>Pointages enregistrés</span>
            </div>
            <div>
              <strong>84.6%</strong>
              <span>Taux de réalisation</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Activités récentes</h3>
            <button>Voir tout</button>
          </div>

          <Activity icon="✓" title="Pointage effectué" text="Programmation Web - Licence 1 RIT" />
          <Activity icon="CT" title="Cahier de texte signé" text="Base de Données - Licence 2 RIT" />
          <Activity icon="FV" title="Fiche de vacation validée" text="Dr. TRAORE Jean" />
          <Activity icon="ET" title="Nouvelle séance planifiée" text="Sécurité Réseaux - Master 1" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   TEACHER DASHBOARD
========================= */

function TeacherDashboard() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Bonjour, Enseignant</h1>
          <p>Suivez vos séances, cahiers de texte, pointages et vacations.</p>
        </div>

        <button className="primary-btn">Remplir un cahier</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Séances prévues" value="6" icon="SP" hint="Cette semaine" />
        <StatCard label="Séances réalisées" value="4" icon="SR" hint="66% effectuées" />
        <StatCard label="Cahiers signés" value="3" icon="CT" hint="À jour" />
        <StatCard label="Vacations" value="200K" icon="FC" hint="FCFA estimés" />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Mes prochaines séances</h3>
            <button>Voir tout</button>
          </div>

          <Activity icon="ET" title="Programmation Web" text="Licence 1 RIT - Lundi 07h30 - Salle A101" />
          <Activity icon="ET" title="Base de Données" text="Licence 2 RIT - Mardi 10h00 - Salle B201" />
          <Activity icon="ET" title="Réseaux" text="Licence 3 RIT - Jeudi 13h00 - Salle A102" />

          <div className="mini-stats">
            <div>
              <strong>18h</strong>
              <span>Volume horaire</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Classes concernées</span>
            </div>
            <div>
              <strong>92%</strong>
              <span>Présence moyenne</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Actions rapides</h3>
          </div>

          <Activity icon="CT" title="Remplir cahier de texte" text="Saisir le contenu d’une séance" />
          <Activity icon="QR" title="Consulter pointages" text="Voir les présences enregistrées" />
          <Activity icon="FV" title="Voir vacations" text="Suivre les montants à payer" />
          <Activity icon="RP" title="Rapport personnel" text="Exporter le suivi mensuel" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   DELEGATE DASHBOARD
========================= */

function DelegateDashboard() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Espace Délégué</h1>
          <p>Gérez le pointage, le suivi de classe et les signatures.</p>
        </div>

        <button className="primary-btn">Scanner QR-Code</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Cours du jour" value="3" icon="CD" hint="Aujourd’hui" />
        <StatCard label="Pointages faits" value="2" icon="QR" hint="Enregistrés" />
        <StatCard label="Cahiers à signer" value="1" icon="CT" hint="En attente" />
        <StatCard label="Classe" value="L1" icon="CL" hint="Licence 1 RIT" />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Planning de la classe</h3>
            <button>Emploi complet</button>
          </div>

          <Activity icon="ET" title="Programmation Web" text="07h30 - 09h30 / Salle A101" />
          <Activity icon="ET" title="Base de Données" text="10h00 - 12h15 / Salle B201" />
          <Activity icon="ET" title="Réseaux" text="13h00 - 16h00 / Salle A102" />

          <div className="mini-stats">
            <div>
              <strong>1</strong>
              <span>Cahier en attente</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Absence signalée</span>
            </div>
            <div>
              <strong>2/3</strong>
              <span>QR scannés</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Responsabilités</h3>
          </div>

          <Activity icon="QR" title="Pointage QR-Code" text="Scanner au début de la séance" />
          <Activity icon="CT" title="Signature cahier" text="Signer après vérification" />
          <Activity icon="RP" title="Signalement" text="Notifier une absence de professeur" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   SUPERVISOR DASHBOARD
========================= */

function SupervisorDashboard() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Espace Surveillant</h1>
          <p>Contrôlez les présences, retards et séances réalisées.</p>
        </div>

        <button className="primary-btn">Contrôler pointages</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Séances prévues" value="8" icon="SP" hint="Aujourd’hui" />
        <StatCard label="Pointages validés" value="6" icon="PV" hint="75%" />
        <StatCard label="Anomalies" value="2" icon="AN" hint="À vérifier" />
        <StatCard label="Salles occupées" value="4" icon="SL" hint="En cours" />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Contrôle des séances</h3>
            <button>Exporter</button>
          </div>

          <Activity icon="✓" title="Programmation Web validée" text="TRAORE Jean - Licence 1 RIT" />
          <Activity icon="AN" title="Pointage manquant" text="Base de Données - Licence 2 RIT" />
          <Activity icon="✓" title="Sécurité Réseaux validée" text="SANKARA Mariam - Master 1" />

          <div className="mini-stats">
            <div>
              <strong>6</strong>
              <span>Séances validées</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Anomalies</span>
            </div>
            <div>
              <strong>75%</strong>
              <span>Taux de contrôle</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Alertes</h3>
          </div>

          <Activity icon="AN" title="Retard signalé" text="Salle B201 - 10h00" />
          <Activity icon="AN" title="Cahier non signé" text="Licence 3 RIT" />
          <Activity icon="QR" title="QR non scanné" text="Séance de 13h00" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   ACCOUNTANT DASHBOARD
========================= */

function AccountantDashboard() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Espace Comptable</h1>
          <p>Gérez les fiches de vacation et les montants à payer.</p>
        </div>

        <button className="primary-btn">Générer fiches</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Fiches validées" value="12" icon="FV" hint="Ce mois" />
        <StatCard label="En attente" value="4" icon="AT" hint="À contrôler" />
        <StatCard label="Montant total" value="1.4M" icon="FC" hint="FCFA" />
        <StatCard label="Enseignants" value="8" icon="EN" hint="Concernés" />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Fiches récentes</h3>
            <button>Voir toutes</button>
          </div>

          <Activity icon="FV" title="TRAORE Jean" text="Programmation Web - 200 000 FCFA" />
          <Activity icon="FV" title="KABORE Paul" text="Base de Données - 160 000 FCFA" />
          <Activity icon="FV" title="SANKARA Mariam" text="Sécurité - 180 000 FCFA" />

          <div className="mini-stats">
            <div>
              <strong>12</strong>
              <span>Fiches validées</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Fiches en attente</span>
            </div>
            <div>
              <strong>1.4M</strong>
              <span>Total FCFA</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Statuts</h3>
          </div>

          <Activity icon="✓" title="Validées" text="12 fiches prêtes pour paiement" />
          <Activity icon="AT" title="En attente" text="4 fiches à vérifier" />
          <Activity icon="RP" title="Rapport mensuel" text="Avril 2025" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   SHARED COMPONENTS
========================= */

function StatCard({ label, value, icon, hint }) {
  return (
    <div className="stat-card">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{hint}</span>
      </div>

      <div className="stat-icon">{icon}</div>
    </div>
  )
}

function Activity({ icon, title, text }) {
  return (
    <div className="activity">
      <div className="activity-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  )
}

function ChartBars() {
  return (
    <div className="fake-chart">
      <div style={{ height: '35%' }}></div>
      <div style={{ height: '55%' }}></div>
      <div style={{ height: '75%' }}></div>
      <div style={{ height: '48%' }}></div>
      <div style={{ height: '68%' }}></div>
      <div style={{ height: '42%' }}></div>
    </div>
  )
}

/* =========================
   EMPLOI DU TEMPS
========================= */

function EmploiTempsPage({ token }) {
  const [emploi, setEmploi] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/emploi_temps.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const data = json.data || {}

          if (Array.isArray(data)) {
            setEmploi(groupScheduleByDay(data))
          } else {
            setEmploi(data)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Emploi du temps</h1>
          <p>Gestion et planification des séances par classe.</p>
        </div>

        <button className="primary-btn">+ Nouvelle séance</button>
      </div>

      <div className="panel">
        {loading && <p>Chargement de l’emploi du temps...</p>}

        {!loading && (
          <div className="schedule-grid">
            {jours.map((jour) => (
              <div key={jour} className="day-column">
                <h3>{jour}</h3>

                {(emploi[jour] || []).length === 0 && (
                  <p className="empty-day">Aucun cours</p>
                )}

                {(emploi[jour] || []).map((item) => (
                  <div key={item.id} className={`course-card ${item.type}`}>
                    <strong>{item.matiere}</strong>
                    <span>{item.horaire}</span>
                    <span>{item.classe}</span>
                    <small>{item.enseignant}</small>
                    <em>{item.salle}</em>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function groupScheduleByDay(items) {
  const result = {
    Lundi: [],
    Mardi: [],
    Mercredi: [],
    Jeudi: [],
    Vendredi: [],
    Samedi: [],
  }

  items.forEach((item) => {
    if (!result[item.jour]) {
      result[item.jour] = []
    }

    result[item.jour].push(item)
  })

  return result
}

/* =========================
   OTHER PAGES
========================= */

function PointagePage({ user }) {
  const role = user?.role || 'admin'

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Pointage QR-Code</h1>
          <p>
            {role === 'delegue'
              ? 'Scannez le QR-Code pour enregistrer la présence de la classe.'
              : 'Suivi et contrôle des pointages enregistrés.'}
          </p>
        </div>

        <button className="primary-btn">
          {role === 'delegue' ? 'Scanner maintenant' : 'Vérifier pointages'}
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Séance en cours</h3>
            <button>Actualiser</button>
          </div>

          <Activity icon="ET" title="Programmation Web" text="Licence 1 RIT - Salle A101" />
          <Activity icon="EN" title="Enseignant" text="TRAORE Jean" />
          <Activity icon="HR" title="Horaire" text="07h30 - 09h30" />

          <div className="placeholder" style={{ minHeight: 260, marginTop: 18 }}>
            <div>
              <div className="placeholder-icon">QR</div>
              <h1>QR-Code séance</h1>
              <p>Le QR-Code sera généré ici pour valider la présence.</p>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Historique</h3>
          </div>

          <Activity icon="✓" title="Pointage validé" text="Base de Données - Mardi" />
          <Activity icon="✓" title="Pointage validé" text="Réseaux - Mercredi" />
          <Activity icon="AN" title="Pointage manquant" text="Cloud - Vendredi" />
        </div>
      </div>
    </div>
  )
}

function CahierPage({ user }) {
  const role = user?.role || 'admin'

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Cahier de texte</h1>
          <p>
            {role === 'enseignant'
              ? 'Saisissez le contenu de vos séances.'
              : 'Consultez et contrôlez les cahiers de texte.'}
          </p>
        </div>

        <button className="primary-btn">
          {role === 'enseignant' ? 'Nouveau contenu' : 'Voir cahiers'}
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Derniers cahiers</h3>
            <button>Exporter</button>
          </div>

          <Activity icon="CT" title="Programmation Web" text="Introduction HTML + formulaires" />
          <Activity icon="CT" title="Base de Données" text="Modèle relationnel et SQL" />
          <Activity icon="CT" title="Réseaux" text="Adressage IP et routage" />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Statuts</h3>
          </div>

          <Activity icon="✓" title="Signé" text="Délégué + enseignant" />
          <Activity icon="AT" title="En attente" text="Signature enseignant" />
          <Activity icon="AN" title="À corriger" text="Contenu incomplet" />
        </div>
      </div>
    </div>
  )
}

function VacationsPage({ user }) {
  const role = user?.role || 'admin'

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Fiches de vacation</h1>
          <p>
            {role === 'comptable'
              ? 'Validez les fiches et préparez les paiements.'
              : 'Suivi des heures effectuées et montants estimés.'}
          </p>
        </div>

        <button className="primary-btn">
          {role === 'comptable' ? 'Générer fiches' : 'Voir mes fiches'}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Fiches" value="12" icon="FV" hint="Ce mois" />
        <StatCard label="En attente" value="4" icon="AT" hint="À valider" />
        <StatCard label="Montant" value="1.4M" icon="FC" hint="FCFA" />
        <StatCard label="Heures" value="144h" icon="HR" hint="Total" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Liste récente</h3>
          <button>Exporter PDF</button>
        </div>

        <Activity icon="FV" title="TRAORE Jean" text="Programmation Web - 200 000 FCFA" />
        <Activity icon="FV" title="KABORE Paul" text="Base de Données - 160 000 FCFA" />
        <Activity icon="FV" title="SANKARA Mariam" text="Sécurité - 180 000 FCFA" />
      </div>
    </div>
  )
}

function RapportsPage({ user }) {
  const role = user?.role || 'admin'

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Rapports & Statistiques</h1>
          <p>Analyse des séances, présences, cahiers et vacations.</p>
        </div>

        <button className="primary-btn">Exporter rapport</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Séances" value="156" icon="SE" hint="Planifiées" />
        <StatCard label="Réalisées" value="132" icon="SR" hint="84.6%" />
        <StatCard label="Pointages" value="118" icon="QR" hint="Validés" />
        <StatCard
          label={role === 'comptable' ? 'Montant' : 'Rapports'}
          value={role === 'comptable' ? '1.4M' : '9'}
          icon="RP"
          hint={role === 'comptable' ? 'FCFA' : 'Disponibles'}
        />
      </div>

      <div className="dashboard-grid">
        <div className="panel large">
          <div className="panel-header">
            <h3>Indicateurs mensuels</h3>
            <select>
              <option>Avril 2025</option>
              <option>Mars 2025</option>
            </select>
          </div>

          <ChartBars />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Exports disponibles</h3>
          </div>

          <Activity icon="RP" title="Rapport de présence" text="PDF / Excel" />
          <Activity icon="RP" title="Rapport vacations" text="PDF / Excel" />
          <Activity icon="RP" title="Rapport enseignants" text="PDF / Excel" />
        </div>
      </div>
    </div>
  )
}

export default App

