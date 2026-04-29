import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

function DashboardLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth()

  const roleLabels = {
    admin: 'Administrateur',
    enseignant: 'Enseignant',
    delegue: 'Délégué de classe',
    surveillant: 'Surveillant Général',
    comptable: 'Responsable Comptable'
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <Sidebar />

      <div className="flex-grow-1 d-flex flex-column overflow-auto">
        {/* Topbar */}
        <header className="bg-white px-4 py-3 d-flex justify-content-between align-items-center"
                style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: '#6366f1', fontSize: '1.1rem' }}>●</span>
              <h5 className="mb-0 fw-bold" style={{ color: '#1e1b4b' }}>{title}</h5>
            </div>
            {subtitle && <p className="mb-0 text-muted small mt-1">{subtitle}</p>}
          </div>

          <div className="d-flex align-items-center gap-4">
            {/* Notifications */}
            <button className="btn btn-light btn-sm position-relative rounded-circle"
                    style={{ width: '40px', height: '40px' }}>
              🔔
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.6rem' }}>
                3
              </span>
            </button>

            {/* Profil */}
            <div className="d-flex align-items-center gap-2 dropdown">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{
                     width: '38px', height: '38px',
                     background: '#6366f1',
                     color: 'white',
                     fontWeight: 'bold',
                     fontSize: '0.9rem'
                   }}>
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="d-none d-md-block">
                <p className="mb-0 fw-semibold small" style={{ color: '#1e1b4b' }}>
                  {roleLabels[user?.role] || user?.role}
                </p>
                <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{user?.email}</p>
              </div>
              <button onClick={logout}
                      className="btn btn-link text-muted p-0 ms-2"
                      title="Déconnexion"
                      style={{ fontSize: '1.1rem', textDecoration: 'none' }}>
                ↗️
              </button>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-grow-1 p-4">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout