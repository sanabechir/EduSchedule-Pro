import { useState } from 'react'
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

        {/* Colonne gauche — Infos séance */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                📋 Séance en cours
              </h6>
            </div>
            <div className="card-body px-4">
              {result?.creneau ? (
                <>
                  <InfoRow label="Matière" value={result.creneau.matiere} />
                  <InfoRow label="Classe" value={result.creneau.classe || '—'} />
                  <InfoRow label="Salle" value={result.creneau.salle} />
                  <InfoRow label="Horaire" value={`${result.creneau.heure_debut?.slice(0,5)} - ${result.creneau.heure_fin?.slice(0,5)}`} />
                  <InfoRow label="Enseignant" value={result.creneau.enseignant} />
                  <InfoRow label="Jour" value={result.creneau.jour} />
                  <InfoRow label="Heure pointage" value={result.creneau.heure_reelle} last />
                </>
              ) : (
                <div className="text-center py-5">
                  <div style={{ fontSize: '3rem' }} className="mb-3">📱</div>
                  <p className="text-muted">Scannez un QR-Code pour voir les détails de la séance</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite — Scanner */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                📷 Scanner le QR-Code
              </h6>
              <p className="text-muted small mt-1 mb-0">
                Placez le QR-Code de la séance dans le cadre ou saisissez le code manuellement
              </p>
            </div>
            <div className="card-body px-4">

              {/* Zone de scan visuelle */}
              <div className="text-center mb-4">
                <div style={{
                  width: '250px', height: '250px',
                  border: '3px dashed #6366f1',
                  borderRadius: '16px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8f9fc'
                }}>
                  <div className="text-center">
                    <div style={{ fontSize: '3rem' }}>📷</div>
                    <p className="text-muted small mt-2 mb-0">Zone de scan QR</p>
                    <small className="text-muted">(Caméra désactivée — saisie manuelle)</small>
                  </div>
                </div>
              </div>

              {/* Saisie manuelle */}
              <div className="mb-3">
                <label className="form-label fw-semibold small" style={{ color: '#1e1b4b' }}>
                  Code QR (saisie manuelle)
                </label>
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

          {/* Historique */}
          <div className="card border-0 shadow-sm mt-3" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center"
                 style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                📜 Historique des pointages
              </h6>
            </div>
            <div className="card-body px-4">
              <div className="text-center py-3">
                <p className="text-muted small mb-0">
                  L'historique sera disponible après vos premiers pointages
                </p>
              </div>
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