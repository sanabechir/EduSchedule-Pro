import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const sections = [
    {
      title: 'MODULES',
      items: [
        { path: '/dashboard',    icon: '🏠', label: 'Tableau de bord' },
        { path: '/emploi-temps', icon: '📅', label: 'Emploi du temps' },
        { path: '/pointage',     icon: '📱', label: 'Pointage QR-Code', roles: ['enseignant'] },
        { path: '/cahiers',      icon: '📖', label: 'Cahier de texte' },
        { path: '/vacations',    icon: '💰', label: 'Fiches de vacation' },
      ]
    },
    {
      title: 'RAPPORTS',
      items: [
        { path: '/stats',    icon: '📊', label: 'Tableau de bord' },
        { path: '/reports',  icon: '📑', label: 'Statistiques' },
        { path: '/exports',  icon: '📋', label: 'Rapports' },
      ]
    },
    {
      title: 'PARAMÈTRES',
      items: [
        { path: '/settings',  icon: '⚙️',  label: 'Paramètres' },
        { path: '/users',     icon: '👥', label: 'Utilisateurs' },
      ]
    }
  ]

  return (
    <div className="d-flex flex-column vh-100 text-white"
         style={{ width: '260px', background: '#1e1b4b', flexShrink: 0 }}>

      {/* Logo */}
      <div className="px-4 py-4 d-flex align-items-center gap-2"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          width: '32px', height: '32px',
          background: '#6366f1',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          🎓
        </div>
        <div>
          <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>EduSchedule Pro</h6>
        </div>
      </div>

      {/* Menu sections */}
      <nav className="flex-grow-1 px-3 py-3 overflow-auto">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            <p className="text-uppercase mb-2 px-2"
               style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
              {section.title}
            </p>
            {section.items
              .filter(item => !item.roles || item.roles.includes(user?.role))
              .map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="btn w-100 text-start mb-1 d-flex align-items-center gap-2 border-0"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isActive ? '#6366f1' : 'transparent',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'white'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                      }
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        © 2026 EduSchedule Pro
      </div>
    </div>
  )
}

export default Sidebar 