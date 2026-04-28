import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-vh-100 bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <span className="navbar-brand fw-bold">📅 EduSchedule Pro</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-white small">
            👤 {user?.email} — <span className="badge bg-light text-primary">{user?.role}</span>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Contenu */}
      <div className="container py-4">
        <h4 className="fw-bold mb-4">Tableau de bord</h4>

        <div className="row g-3">
          <div className="col-md-3">
            <div className="card text-white bg-primary">
              <div className="card-body">
                <h6 className="card-title">Rôle</h6>
                <h4>{user?.role}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success">
              <div className="card-body">
                <h6 className="card-title">Statut</h6>
                <h4>✅ Connecté</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="list-group">
            <a href="/emploi-temps" className="list-group-item list-group-item-action">
              📅 Emploi du temps
            </a>
            <a href="/cahiers" className="list-group-item list-group-item-action">
              📖 Cahiers de texte
            </a>
            <a href="/vacations" className="list-group-item list-group-item-action">
              💰 Vacations
            </a>
            {user?.role === 'enseignant' && (
              <a href="/pointage" className="list-group-item list-group-item-action">
                📱 Pointage QR
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage