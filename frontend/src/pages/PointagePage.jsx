import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const API_URL = 'http://localhost/EduSchedule-Pro/backend/api'

function PointagePage() {
  const { user } = useAuth()
  const [token, setToken]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [seances, setSeances]     = useState([])
  const [qrData, setQrData]       = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [selectedSeance, setSelectedSeance] = useState(null)

  useEffect(() => { fetchSeances() }, [])

  // Récupérer les séances du jour via le dashboard
  const fetchSeances = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard.php?role=${user?.role}`)
      if (res.data.success) {
        if (user?.role === 'admin' || user?.role === 'surveillant') {
          setSeances(res.data.data.seances_aujourd_hui || [])
        } else if (res.data.data.mes_seances) {
          setSeances(res.data.data.mes_seances || [])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Générer / afficher le QR-Code d'un créneau
  const genererQR = async (creneauId) => {
    setQrLoading(true)
    setQrData(null)
    setSelectedSeance(creneauId)
    try {
      const res = await axios.get(`${API_URL}/creneaux.php?id=${creneauId}&action=qr`)
      if (res.data.success) {
        setQrData(res.data)
        setToken(res.data.token)
      }
    } catch (err) {
      console.error('Erreur QR:', err)
      setError(err.response?.data?.message || 'Erreur génération QR')
    } finally {
      setQrLoading(false)
    }
  }

  // Scanner / valider le pointage
  const handleScan = async () => {
    if (!token.trim()) {
      setError('Veuillez entrer ou scanner le code QR')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await axios.post(`${API_URL}/pointages.php?action=scan`, {
        token_qr: token.trim()
      })
      setResult(res.data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du pointage'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout
      title="Pointage QR-Code"
      subtitle="Scanner le QR-Code de la séance pour pointer votre présence"
    >
      <div className="row g-4">

        {/* Colonne gauche — Séances du jour + infos */}
        <div className="col-md-5">

          {/* Séances du jour */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                📚 Séances du jour
              </h6>
              <p className="text-muted small mb-0 mt-1">
                Cliquez sur une séance pour afficher son QR-Code
              </p>
            </div>
            <div className="card-body px-4 pt-2">
              {seances.length > 0 ? (
                seances.map((s) => (
                  <div
                    key={s.id}
                    className="d-flex justify-content-between align-items-center py-3 border-bottom"
                    style={{
                      cursor: 'pointer',
                      background: selectedSeance === s.id ? '#f0f0ff' : 'transparent',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => genererQR(s.id)}
                    onMouseEnter={e => {
                      if (selectedSeance !== s.id) e.currentTarget.style.background = '#f8f9fc'
                    }}
                    onMouseLeave={e => {
                      if (selectedSeance !== s.id) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div>
                      <p className="mb-0 fw-semibold small" style={{ color: '#1e1b4b' }}>
                        {s.matiere || s.matiere_libelle || '—'}
                      </p>
                      <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                        {s.heure_debut?.slice(0, 5)} - {s.heure_fin?.slice(0, 5)} | {s.classe || s.classe_libelle || '—'} | {s.salle || s.salle_libelle || '—'}
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {s.statut_pointage === 'valide' && (
                        <span className="badge px-2 py-1" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem' }}>✅ Pointé</span>
                      )}
                      {s.statut_pointage === 'retard' && (
                        <span className="badge px-2 py-1" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>⏰ Retard</span>
                      )}
                      {!s.statut_pointage && (
                        <span className="badge px-2 py-1" style={{ background: '#ede9fe', color: '#6366f1', fontSize: '0.7rem' }}>📱 QR</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted small mb-0">Aucune séance prévue aujourd'hui</p>
                </div>
              )}
            </div>
          </div>

          {/* Détails de la séance pointée */}
          {result?.creneau && (
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white border-0 pt-4 px-4"
                   style={{ borderRadius: '12px 12px 0 0' }}>
                <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                  📋 Détails du pointage
                </h6>
              </div>
              <div className="card-body px-4">
                <InfoRow label="Matière" value={result.creneau.matiere} />
                <InfoRow label="Salle" value={result.creneau.salle} />
                <InfoRow label="Horaire" value={`${result.creneau.heure_debut?.slice(0,5)} - ${result.creneau.heure_fin?.slice(0,5)}`} />
                <InfoRow label="Enseignant" value={result.creneau.enseignant} />
                <InfoRow label="Jour" value={result.creneau.jour} />
                <InfoRow label="Heure pointage" value={result.creneau.heure_reelle} last />
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite — QR-Code + Scanner */}
        <div className="col-md-7">

          {/* Affichage QR-Code */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                📷 QR-Code de la séance
              </h6>
            </div>
            <div className="card-body px-4 text-center">

              {qrLoading && (
                <div className="py-5">
                  <div className="spinner-border" style={{ color: '#6366f1' }} />
                  <p className="mt-2 text-muted small">Génération du QR-Code...</p>
                </div>
              )}

              {!qrLoading && qrData && (
                <div>
                  {/* QR-Code SVG */}
                  <div className="d-flex justify-content-center mb-3">
                    <div style={{
                      width: '250px', height: '250px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: 'white',
                      padding: '10px'
                    }}>
                      <img
                        src={qrData.qr_svg}
                        alt="QR-Code"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>

                  {/* Infos créneau */}
                  <p className="fw-semibold mb-1" style={{ color: '#1e1b4b' }}>
                    {qrData.creneau?.matiere}
                  </p>
                  <p className="text-muted small mb-1">
                    {qrData.creneau?.enseignant} — {qrData.creneau?.salle}
                  </p>
                  <p className="text-muted small mb-3">
                    {qrData.creneau?.jour} {qrData.creneau?.heure_debut?.slice(0,5)} - {qrData.creneau?.heure_fin?.slice(0,5)}
                  </p>

                  {/* Token affiché */}
                  <div className="p-2 rounded" style={{ background: '#f3f4f6', wordBreak: 'break-all' }}>
                    <small className="text-muted" style={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>
                      Token : {qrData.token}
                    </small>
                  </div>

                  {/* Boutons */}
                  <div className="d-flex gap-2 justify-content-center mt-3">
                    <button className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: '8px' }}
                            onClick={() => window.print()}>
                      🖨️ Imprimer
                    </button>
                    <button className="btn text-white btn-sm"
                            style={{ background: '#6366f1', borderRadius: '8px' }}
                            onClick={handleScan}>
                      ✅ Valider le pointage
                    </button>
                  </div>
                </div>
              )}

              {!qrLoading && !qrData && (
                <div className="py-5">
                  <div style={{
                    width: '200px', height: '200px',
                    border: '3px dashed #d1d5db',
                    borderRadius: '16px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8f9fc'
                  }}>
                    <div className="text-center">
                      <div style={{ fontSize: '3rem' }}>📱</div>
                      <p className="text-muted small mt-2 mb-0">Sélectionnez une séance</p>
                      <p className="text-muted small mb-0">pour afficher le QR-Code</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saisie manuelle */}
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                ⌨️ Saisie manuelle du code
              </h6>
              <p className="text-muted small mb-0 mt-1">
                En cas de problème technique, saisissez le code manuellement
              </p>
            </div>
            <div className="card-body px-4">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Collez le token QR ici..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  style={{ borderRadius: '8px 0 0 8px', border: '1px solid #d1d5db' }}
                />
                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="btn text-white"
                  style={{ background: '#6366f1', borderRadius: '0 8px 8px 0', padding: '0 24px' }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : '✅ Valider'}
                </button>
              </div>

              {/* Résultat */}
              {result && (
                <div className={`alert ${result.statut === 'retard' ? 'alert-warning' : 'alert-success'} d-flex align-items-start gap-3 mt-3`}
                     style={{ borderRadius: '10px', border: 'none' }}>
                  <span style={{ fontSize: '2rem' }}>
                    {result.statut === 'retard' ? '⏰' : '✅'}
                  </span>
                  <div>
                    <h6 className="fw-bold mb-1">{result.message}</h6>
                    <p className="mb-0 small">
                      Statut : <span className="fw-semibold">{result.statut === 'retard' ? 'En retard' : 'Validé'}</span>
                    </p>
                    {result.creneau && (
                      <p className="mb-0 small text-muted mt-1">
                        Pointé à {result.creneau.heure_reelle}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="alert alert-danger d-flex align-items-start gap-3 mt-3"
                     style={{ borderRadius: '10px', border: 'none' }}>
                  <span style={{ fontSize: '2rem' }}>❌</span>
                  <div>
                    <h6 className="fw-bold mb-1">Échec du pointage</h6>
                    <p className="mb-0 small">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}

function InfoRow({ label, value, last }) {
  return (
    <div className={`d-flex justify-content-between py-3 ${!last ? 'border-bottom' : ''}`}>
      <span className="text-muted small">{label}</span>
      <span className="fw-semibold small" style={{ color: '#1e1b4b' }}>{value}</span>
    </div>
  )
}

export default PointagePage