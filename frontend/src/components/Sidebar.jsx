import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard',    icon: '📊', label: 'Tableau de bord' },
    { path: '/emploi-temps', icon: '📅', label: 'Emploi du temps' },
    { path: '/pointage',     icon: '📱', label: 'Pointage QR-Code', roles: ['enseignant', 'admin'] },
    { path: '/cahiers',      icon: '📖', label: 'Cahier de texte', roles: ['admin', 'delegue', 'surveillant', 'enseignant'] },
    { path: '/vacations',    icon: '💰', label: 'Fiches de vacation', roles: ['admin', 'enseignant', 'surveillant', 'comptable'] },
  ]

  const filteredMenu = menuItems.filter(item => !item.roles || item.roles.includes(user?.role))

  return (
    <div className="d-flex flex-column vh-100 text-white"
         style={{ width: '260px', background: '#1e1b4b', flexShrink: 0 }}>

      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="d-flex align-items-center gap-2">
          <div style={{
            width: '36px', height: '36px',
            background: '#6366f1',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem'
          }}>
            🎓
          </div>
          <div>
            <h6 className="fw-bold mb-0" style={{ fontSize: '1rem' }}>EduSchedule Pro</h6>
            <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Gestion pédagogique</small>
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-circle d-flex align-items-center justify-content-center"
               style={{
                 width: '42px', height: '42px',
                 background: '#6366f1',
                 fontSize: '1rem', fontWeight: 'bold'
               }}>
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="mb-0 text-truncate fw-semibold" style={{ fontSize: '0.85rem' }}>
              {user?.email}
            </p>
            <span className="badge text-capitalize" style={{ 
              background: 'rgba(255,255,255,0.15)', 
              fontSize: '0.65rem',
              fontWeight: 500
            }}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-grow-1 px-3 py-4">
        <p className="text-uppercase mb-3 px-2"
           style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', fontWeight: 600 }}>
          MODULES
        </p>
        {filteredMenu.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="btn w-100 text-start mb-1 d-flex align-items-center gap-3 border-0"
              style={{
                padding: '11px 14px',
                borderRadius: '10px',
                background: isActive ? '#6366f1' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                fontSize: '0.88rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                }
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Déconnexion */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={logout}
          className="btn w-100 text-start d-flex align-items-center gap-3 border-0"
          style={{
            padding: '11px 14px',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.88rem',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
            e.currentTarget.style.color = '#fca5a5'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🚪</span>
          <span>Déconnexion</span>
        </button>
        <p className="text-center mt-3 mb-0" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 EduSchedule Pro
        </p>
      </div>
    </div>
  )
}

export default Sidebar