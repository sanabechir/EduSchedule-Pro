import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const API_URL = 'http://localhost/EduSchedule-Pro/backend/api'

function EmploiTempsPage() {
  const { user } = useAuth()
  const [classes, setClasses]     = useState([])
  const [classeId, setClasseId]   = useState('')
  const [creneaux, setCreneaux]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [semaine, setSemaine]     = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  })

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  const plagesHoraires = [
  { label: '7h30',  sublabel: 'à', label2: '9h30',  debutMin: 450, finMin: 570 },
  { label: '10h',   sublabel: 'à', label2: '12h15', debutMin: 600, finMin: 735 },
  { label: '13h',   sublabel: 'à', label2: '15h',   debutMin: 780, finMin: 900 },
  { label: '15h',   sublabel: 'à', label2: '18h',   debutMin: 900, finMin: 1080 },
]

  useEffect(() => { fetchClasses() }, [])
  useEffect(() => { if (classeId) fetchEmplois() }, [classeId])

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_URL}/classes.php`)
      if (res.data.success) {
        setClasses(res.data.data)
        if (res.data.data.length > 0) setClasseId(res.data.data[0].id)
      }
    } catch (err) { console.error(err) }
  }

  const fetchEmplois = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/emploi_temps.php?id_classe=${classeId}`)
      if (res.data.success && res.data.data.length > 0) {
        setCreneaux(res.data.data[0].creneaux || [])
      } else {
        setCreneaux([])
      }
    } catch (err) {
      console.error(err)
      setCreneaux([])
    } finally {
      setLoading(false)
    }
  }

  const toMinutes = (time) => {
    if (!time) return 0
    const parts = time.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }

  const formatHeure = (time) => {
    if (!time) return ''
    const parts = time.split(':')
    const h = parseInt(parts[0])
    const m = parseInt(parts[1])
    return m === 0 ? `${h}H00` : `${h}H${m.toString().padStart(2, '0')}`
  }

  const getCreneauxAt = (jour, plage) => {
    return creneaux.filter(c => {
      if (c.jour !== jour) return false
      const cDebut = toMinutes(c.heure_debut)
      const cFin = toMinutes(c.heure_fin)
      return cDebut < plage.finMin && cFin > plage.debutMin
    })
  }

  const getDateForJour = (jourIndex) => {
    const d = new Date(semaine)
    d.setDate(d.getDate() + jourIndex)
    return d.getDate().toString().padStart(2, '0')
  }

  const getMoisAnnee = () => {
    const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const d = new Date(semaine)
    const fin = new Date(semaine)
    fin.setDate(fin.getDate() + 5)
    return `${d.getDate()} ${mois[d.getMonth()]} au ${fin.getDate()} ${mois[fin.getMonth()]} ${fin.getFullYear()}`
  }

  const selectedClasse = classes.find(c => c.id == classeId)

  const getColor = (matiere) => {
    const colors = [
      { bg: '#e8eaf6', border: '#5c6bc0', text: '#283593' },
      { bg: '#e3f2fd', border: '#42a5f5', text: '#1565c0' },
      { bg: '#e8f5e9', border: '#66bb6a', text: '#2e7d32' },
      { bg: '#fff3e0', border: '#ffa726', text: '#e65100' },
      { bg: '#fce4ec', border: '#ef5350', text: '#c62828' },
      { bg: '#f3e5f5', border: '#ab47bc', text: '#6a1b9a' },
      { bg: '#e0f2f1', border: '#26a69a', text: '#00695c' },
      { bg: '#fff8e1', border: '#ffca28', text: '#f57f17' },
    ]
    let hash = 0
    for (let i = 0; i < (matiere || '').length; i++) {
      hash = matiere.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const changerSemaine = (delta) => {
    const d = new Date(semaine)
    d.setDate(d.getDate() + delta * 7)
    setSemaine(d)
  }

  return (
    <DashboardLayout
      title="Emploi du temps"
      subtitle="Gestion et planification des emplois du temps par classe"
    >
      {/* Filtres */}
      <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-end gap-3">
          <div>
            <label className="form-label small text-muted mb-1 fw-semibold">Classe</label>
            <select
              className="form-select"
              value={classeId}
              onChange={e => setClasseId(e.target.value)}
              style={{ borderRadius: '8px', minWidth: '220px', border: '1px solid #d1d5db' }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.libelle}</option>
              ))}
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button onClick={() => changerSemaine(-1)}
                    className="btn btn-outline-secondary btn-sm px-3"
                    style={{ borderRadius: '8px' }}>◀</button>
            <span className="fw-semibold" style={{ color: '#1e1b4b', minWidth: '300px', textAlign: 'center' }}>
              Semaine du {getMoisAnnee()}
            </span>
            <button onClick={() => changerSemaine(1)}
                    className="btn btn-outline-secondary btn-sm px-3"
                    style={{ borderRadius: '8px' }}>▶</button>
          </div>
        </div>

        {user?.role === 'admin' && (
          <button className="btn text-white d-flex align-items-center gap-2"
                  style={{ background: '#6366f1', borderRadius: '8px', padding: '10px 20px' }}>
            + Nouvelle séance
          </button>
        )}
      </div>

      {/* Emploi du temps */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>

        {/* Titre */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3"
             style={{ background: '#f8f9fc', borderBottom: '2px solid #e5e7eb' }}>
          <h6 className="mb-0 fw-bold text-uppercase"
              style={{ color: '#374151', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
            Emploi du temps du {getMoisAnnee()}
          </h6>
          <h4 className="mb-0 fw-bold" style={{ color: '#6366f1', fontSize: '1.5rem' }}>
            {selectedClasse?.libelle || '—'}
          </h4>
        </div>

        {/* Grille */}
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#6366f1' }} />
            </div>
          ) : (
            <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed', borderColor: '#d1d5db' }}>
              <thead>
                <tr>
                  <th style={{
                    width: '90px', background: '#f3f4f6', textAlign: 'center',
                    fontSize: '0.8rem', color: '#6b7280', fontWeight: 600,
                    verticalAlign: 'middle', padding: '14px 8px', borderColor: '#d1d5db'
                  }}>
                    Horaire
                  </th>
                  {jours.map((jour, i) => (
                    <th key={jour} className="text-center" style={{
                      background: '#f3f4f6', padding: '10px 8px', borderColor: '#d1d5db'
                    }}>
                      <div className="fw-bold" style={{ color: '#1e1b4b', fontSize: '0.9rem' }}>
                        {jour} {getDateForJour(i)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plagesHoraires.map((plage, pIdx) => (
                  <tr key={pIdx}>
                    {/* Horaire */}
                    <td className="text-center" style={{
                      background: '#f9fafb', verticalAlign: 'middle',
                      padding: '10px 6px', borderColor: '#d1d5db', height: '130px'
                    }}>
                      <div className="fw-bold" style={{ color: '#1e1b4b', fontSize: '0.95rem' }}>
                        {plage.label}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{plage.sublabel}</div>
                      <div className="fw-bold" style={{ color: '#1e1b4b', fontSize: '0.95rem' }}>
                        {plage.label2}
                      </div>
                    </td>

                    {/* Jours */}
                    {jours.map(jour => {
                      const items = getCreneauxAt(jour, plage)
                      return (
                        <td key={jour} style={{
                          borderColor: '#d1d5db', padding: '5px',
                          verticalAlign: 'top', height: '130px', background: 'white'
                        }}>
                          {items.map((c, idx) => {
                            const color = getColor(c.matiere_libelle)
                            const cDebut = toMinutes(c.heure_debut)
                            const cFin = toMinutes(c.heure_fin)
                            const diffDebut = Math.abs(cDebut - plage.debutMin)
                            const diffFin = Math.abs(cFin - plage.finMin)
                            const horaireSpecial = diffDebut > 30 || diffFin > 30

                            return (
                              <div key={idx} style={{
                                background: color.bg,
                                borderLeft: `4px solid ${color.border}`,
                                borderRadius: '6px',
                                padding: '10px 12px',
                                marginBottom: items.length > 1 ? '4px' : 0,
                                height: items.length > 1 ? 'auto' : '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                              >
                                {/* Horaire spécial */}
                                {horaireSpecial && (
                                  <p className="mb-1 fw-bold" style={{
                                    fontSize: '0.7rem', color: color.text
                                  }}>
                                    [{formatHeure(c.heure_debut)} : {formatHeure(c.heure_fin)}]
                                  </p>
                                )}

                                {/* Matière */}
                                <p className="mb-1 fw-bold" style={{
                                  fontSize: '0.82rem', color: color.text, lineHeight: 1.3
                                }}>
                                  {c.matiere_libelle}
                                </p>

                                {/* Enseignant */}
                                <p className="mb-1" style={{
                                  fontSize: '0.73rem', color: color.text, opacity: 0.85
                                }}>
                                  {c.enseignant_prenom} {c.enseignant_nom}
                                </p>

                                {/* Salle */}
                                <p className="mb-0 fst-italic fw-semibold" style={{
                                  fontSize: '0.7rem', color: color.text, opacity: 0.7
                                }}>
                                  {c.salle_libelle}
                                </p>
                              </div>
                            )
                          })}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 d-flex justify-content-between align-items-center">
        <small className="text-muted fst-italic">
          © 2026 EduSchedule Pro
        </small>
        <div className="d-flex gap-3 align-items-center">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  style={{ borderRadius: '8px', fontSize: '0.8rem' }}>
            📥 Télécharger l'emploi du temps (PDF)
          </button>
          <small className="text-muted">
            {creneaux.length} créneau(x) — {selectedClasse?.libelle || '—'}
          </small>
        </div>
      </div>

    </DashboardLayout>
  )
}

export default EmploiTempsPage