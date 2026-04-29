import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const API_URL = 'http://localhost/EduSchedule-Pro/backend/api'

function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard.php?role=${user?.role}`)
      if (res.data.success) setStats(res.data.data)
    } catch (err) {
      console.error('Erreur dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const roleLabels = {
    admin: 'Administrateur',
    enseignant: 'Enseignant',
    delegue: 'Délégué de classe',
    surveillant: 'Surveillant Général',
    comptable: 'Responsable Comptable'
  }

  if (loading) {
    return (
      <DashboardLayout title="Tableau de bord" subtitle="Vue d'ensemble de l'activité académique">
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: '#6366f1' }} />
          <p className="mt-3 text-muted">Chargement...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Tableau de bord" subtitle="Vue d'ensemble de l'activité académique">

      {/* Welcome */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#1e1b4b' }}>
          Bonjour, {roleLabels[user?.role] || user?.role} 👋
        </h4>
        <p className="text-muted mb-0">Voici un aperçu global de l'activité académique.</p>
      </div>

      {/* KPIs */}
      {user?.role === 'admin' && stats && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <KpiCard
                title="Classes"
                value={stats.total_classes}
                subtitle="Total des classes"
                icon="🏫"
                bgIcon="#ede9fe"
                colorIcon="#6366f1"
              />
            </div>
            <div className="col-md-3">
              <KpiCard
                title="Enseignants"
                value={stats.total_enseignants}
                subtitle="Total des enseignants"
                icon="👨‍🏫"
                bgIcon="#fef3c7"
                colorIcon="#f59e0b"
              />
            </div>
            <div className="col-md-3">
              <KpiCard
                title="Séances aujourd'hui"
                value={stats.seances_aujourd_hui?.length || 0}
                subtitle="Séances planifiées"
                icon="📚"
                bgIcon="#dbeafe"
                colorIcon="#3b82f6"
              />
            </div>
            <div className="col-md-3">
              <KpiCard
                title="Taux pointage"
                value={`${stats.taux_pointage}%`}
                subtitle="Rapport séances"
                icon="✅"
                bgIcon="#d1fae5"
                colorIcon="#10b981"
                showProgress={true}
                progress={stats.taux_pointage}
              />
            </div>
          </div>

          {/* Séances + Activités */}
          <div className="row g-3 mb-4">

            {/* Séances du jour */}
            <div className="col-md-7">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center"
                     style={{ borderRadius: '12px 12px 0 0' }}>
                  <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                    Séances du jour
                  </h6>
                  <a href="/emploi-temps" className="text-decoration-none small"
                     style={{ color: '#6366f1' }}>
                    Voir tout l'emploi du temps →
                  </a>
                </div>
                <div className="card-body p-0 px-2">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        <th className="fw-semibold border-0 ps-4 py-2">Heure</th>
                        <th className="fw-semibold border-0 py-2">Matière</th>
                        <th className="fw-semibold border-0 py-2">Classe</th>
                        <th className="fw-semibold border-0 py-2">Salle</th>
                        <th className="fw-semibold border-0 py-2">Enseignant</th>
                        <th className="fw-semibold border-0 pe-4 py-2 text-end">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.seances_aujourd_hui?.length > 0 ? (
                        stats.seances_aujourd_hui.map(s => (
                          <tr key={s.id} style={{ fontSize: '0.85rem' }}>
                            <td className="ps-4 py-3">
                              <span className="fw-semibold" style={{ color: '#1e1b4b' }}>
                                {s.heure_debut?.slice(0, 5)} - {s.heure_fin?.slice(0, 5)}
                              </span>
                            </td>
                            <td className="py-3" style={{ color: '#374151' }}>{s.matiere}</td>
                            <td className="py-3">
                              <span className="badge"
                                    style={{ background: '#f3f4f6', color: '#4b5563', fontWeight: 500 }}>
                                {s.classe}
                              </span>
                            </td>
                            <td className="py-3 text-muted">{s.salle}</td>
                            <td className="py-3" style={{ color: '#374151' }}>
                              {s.enseignant_prenom} {s.enseignant_nom}
                            </td>
                            <td className="pe-4 py-3 text-end">
                              <StatusBadge status={s.statut_pointage} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            Aucune séance prévue aujourd'hui
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Activités récentes */}
            <div className="col-md-5">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white border-0 pt-4 px-4"
                     style={{ borderRadius: '12px 12px 0 0' }}>
                  <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                    Activités récentes
                  </h6>
                </div>
                <div className="card-body px-4">
                  {/* Activités basées sur les alertes et stats */}
                  <ActivityItem
                    icon="📱"
                    iconBg="#d1fae5"
                    title="Pointage effectué"
                    subtitle={`${stats.taux_pointage}% des séances pointées`}
                    time="Aujourd'hui"
                    color="#10b981"
                  />
                  <ActivityItem
                    icon="📖"
                    iconBg="#dbeafe"
                    title="Cahiers de texte"
                    subtitle={`${stats.cahiers_non_signes} cahier(s) en attente de signature`}
                    time="À traiter"
                    color="#3b82f6"
                  />
                  <ActivityItem
                    icon="💰"
                    iconBg="#fef3c7"
                    title="Fiches de vacation"
                    subtitle={`${stats.vacations_en_attente} fiche(s) en attente de validation`}
                    time="À valider"
                    color="#f59e0b"
                  />
                  <ActivityItem
                    icon="📊"
                    iconBg="#ede9fe"
                    title="Séances cette semaine"
                    subtitle={`${stats.semaine?.seances_realisees || 0} séance(s) réalisée(s)`}
                    time="7 derniers jours"
                    color="#6366f1"
                    last
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alertes */}
          {stats.alertes?.length > 0 && (
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white border-0 pt-4 px-4"
                   style={{ borderRadius: '12px 12px 0 0' }}>
                <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                  🚨 Alertes ({stats.alertes.length})
                </h6>
              </div>
              <div className="card-body px-4">
                <div className="row g-2">
                  {stats.alertes.map((alert, i) => (
                    <div key={i} className="col-md-6">
                      <div className="d-flex align-items-start gap-3 p-3 rounded-3"
                           style={{
                             background: alert.type === 'absence' ? '#fef2f2' : '#fffbeb',
                             border: `1px solid ${alert.type === 'absence' ? '#fecaca' : '#fde68a'}`
                           }}>
                        <span style={{ fontSize: '1.3rem' }}>
                          {alert.type === 'absence' ? '❌' : '⏰'}
                        </span>
                        <div>
                          <p className="mb-0 fw-semibold small" style={{ color: '#1e1b4b' }}>
                            {alert.type === 'absence' ? 'Absence détectée' : 'Retard signalé'}
                          </p>
                          <p className="mb-0 text-muted small">{alert.message}</p>
                          <small className="text-muted">Prévu à {alert.heure?.slice(0, 5)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Autres rôles */}
      {user?.role !== 'admin' && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body text-center py-5">
            <div style={{ fontSize: '3rem' }} className="mb-3">🎓</div>
            <h5 className="fw-bold" style={{ color: '#1e1b4b' }}>
              Bienvenue, {roleLabels[user?.role]}
            </h5>
            <p className="text-muted">
              Votre tableau de bord personnalisé est en cours de développement.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ============================================================
//  Composants réutilisables
// ============================================================

function KpiCard({ title, value, subtitle, icon, bgIcon, colorIcon, showProgress, progress }) {
  return (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted small mb-2">{title}</p>
            <h3 className="fw-bold mb-1" style={{ color: '#1e1b4b' }}>{value}</h3>
            <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{subtitle}</p>
          </div>
          <div className="rounded-circle d-flex align-items-center justify-content-center"
               style={{
                 width: '48px', height: '48px',
                 background: bgIcon,
                 fontSize: '1.4rem'
               }}>
            {icon}
          </div>
        </div>
        {showProgress && (
          <div className="mt-3">
            <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
              <div className="progress-bar" role="progressbar"
                   style={{ width: `${progress}%`, background: colorIcon, borderRadius: '3px' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    valide:  { bg: '#d1fae5', color: '#065f46', label: '✅ Réalisée' },
    retard:  { bg: '#fef3c7', color: '#92400e', label: '⏰ Retard' },
    default: { bg: '#f3f4f6', color: '#4b5563', label: '⏳ À venir' }
  }
  const s = styles[status] || styles.default
  return (
    <span className="badge px-3 py-2" style={{ background: s.bg, color: s.color, fontWeight: 500, fontSize: '0.78rem' }}>
      {s.label}
    </span>
  )
}

function ActivityItem({ icon, iconBg, title, subtitle, time, color, last }) {
  return (
    <div className={`d-flex align-items-start gap-3 py-3 ${!last ? 'border-bottom' : ''}`}>
      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
           style={{ width: '40px', height: '40px', background: iconBg, fontSize: '1.1rem' }}>
        {icon}
      </div>
      <div className="flex-grow-1">
        <p className="mb-0 fw-semibold small" style={{ color: '#1e1b4b' }}>{title}</p>
        <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>{subtitle}</p>
      </div>
      <small className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem' }}>{time}</small>
    </div>
  )
}

export default DashboardPage