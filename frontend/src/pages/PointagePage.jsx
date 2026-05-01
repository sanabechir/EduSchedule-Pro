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

  const fetchSeances = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard.php?role=admin`)
      if (res.data.success) {
        setSeances(res.data.data.seances_aujourd_hui || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const genererQR = async (seance) => {
    setQrLoading(true)
    setQrData(null)
    setResult(null)
    setError('')
    setSelectedSeance(seance.id)

    try {
      const res = await axios.get(`${API_URL}/creneaux.php?id=${seance.id}&action=qr`)
      if (res.data.success) {
        setQrData({
          token: res.data.token,
          qr_svg: res.data.qr_svg,
          seance: seance
        })
        setToken(res.data.token)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur génération QR')
    } finally {
      setQrLoading(false)
    }
  }

  const handlePointage = async () => {
    if (!token.trim()) {
      setError('Token QR requis')
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
      setError(err.response?.data?.message || 'Erreur lors du pointage')
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

        {/* Séances du jour */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h6 className="fw-bold mb-1" style={{ color: '#1e1b4b' }}>📚 Séances du jour</h6>
              <p className="text-muted small mb-0">Cliquez pour afficher le QR-Code</p>
            </div>
            <div className="card-body px-3 py-2">
              {seances.length === 0 ? (
                <p className="text-muted small text-center py-4">Aucune séance aujourd'hui</p>
              ) : (
                seances.map(s => (
                  <div
                    key={s.id}
                    onClick={() => genererQR(s)}
                    className="p-3 mb-2 rounded-3"
                    style={{
                      cursor: 'pointer',
                      background: selectedSeance === s.id ? '#ede9fe' : '#f8f9fc',
                      border: `2px solid ${selectedSeance === s.id ? '#6366f1' : 'transparent'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <p className="mb-1 fw-semibold small" style={{ color: '#1e1b4b' }}>
                      {s.matiere}
                    </p>
                    <p className="mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
                      🕐 {s.heure_debut?.slice(0,5)} - {s.heure_fin?.slice(0,5)}
                    </p>
                    <p className="mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
                      👥 {s.classe} | 📍 {s.salle}
                    </p>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                      👨‍🏫 {s.enseignant_prenom} {s.enseignant_nom}
                    </p>
                    <div className="mt-2">
                      {s.statut_pointage === 'valide' && (
                        <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.7rem' }}>✅ Pointé</span>
                      )}
                      {s.statut_pointage === 'retard' && (
                        <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>⏰ Retard</span>
                      )}
                      {!s.statut_pointage && (
                        <span className="badge" style={{ background: '#ede9fe', color: '#6366f1', fontSize: '0.7rem' }}>⏳ En attente</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* QR-Code + Pointage */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 pt-4 px-4">
              <h6 className="fw-bold mb-1" style={{ color: '#1e1b4b' }}>📷 QR-Code de la séance</h6>
              <p className="text-muted small mb-0">
                Placez le QR-Code dans la salle ou validez via le token
              </p>
            </div>
            <div className="card-body px-4">

              {/* État initial */}
              {!qrData && !qrLoading && (
                <div className="text-center py-5">
                  <div style={{
                    width: '200px', height: '200px',
                    border: '3px dashed #d1d5db',
                    borderRadius: '16px',
                    margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f8f9fc'
                  }}>
                    <div>
                      <div style={{ fontSize: '3rem' }}>📱</div>
                      <p className="text-muted small mt-2 mb-0">Sélectionnez</p>
                      <p className="text-muted small mb-0">une séance</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chargement */}
              {qrLoading && (
                <div className="text-center py-5">
                  <div className="spinner-border" style={{ color: '#6366f1' }} />
                  <p className="mt-3 text-muted small">Génération du QR-Code...</p>
                </div>
              )}

              {/* QR-Code affiché */}
              {qrData && !qrLoading && (
                <div className="row g-4">
                  <div className="col-md-6 text-center">
                    {/* QR Image */}
                    <div style={{
                      width: '220px', height: '220px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      margin: '0 auto',
                      padding: '8px',
                      background: 'white'
                    }}>
                      <img
                        src={qrData.qr_svg}
                        alt="QR-Code"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Boutons */}
                    <div className="d-flex gap-2 justify-content-center mt-3">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        style={{ borderRadius: '8px' }}
                        onClick={() => window.print()}
                      >
                        🖨️ Imprimer
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    {/* Infos séance */}
                    <div className="p-3 rounded-3 mb-3" style={{ background: '#f8f9fc' }}>
                      <p className="fw-bold mb-2" style={{ color: '#1e1b4b', fontSize: '0.9rem' }}>
                        {qrData.seance?.matiere}
                      </p>
                      <p className="text-muted small mb-1">
                        🕐 {qrData.seance?.heure_debut?.slice(0,5)} - {qrData.seance?.heure_fin?.slice(0,5)}
                      </p>
                      <p className="text-muted small mb-1">
                        👥 {qrData.seance?.classe}
                      </p>
                      <p className="text-muted small mb-1">
                        📍 {qrData.seance?.salle}
                      </p>
                      <p className="text-muted small mb-0">
                        👨‍🏫 {qrData.seance?.enseignant_prenom} {qrData.seance?.enseignant_nom}
                      </p>
                    </div>

                    {/* Bouton pointer */}
                    <button
                      onClick={handlePointage}
                      disabled={loading}
                      className="btn w-100 text-white fw-semibold"
                      style={{
                        background: '#6366f1',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '0.9rem'
                      }}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2" />
                      ) : '✅ Valider le pointage'}
                    </button>

                    {/* Token */}
                    <div className="mt-3 p-2 rounded" style={{ background: '#f3f4f6' }}>
                      <p className="mb-1 text-muted" style={{ fontSize: '0.7rem' }}>Token QR :</p>
                      <p className="mb-0" style={{
                        fontSize: '0.6rem',
                        fontFamily: 'monospace',
                        color: '#374151',
                        wordBreak: 'break-all'
                      }}>
                        {qrData.token}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Résultat pointage */}
              {result && (
                <div className={`alert mt-4 d-flex align-items-start gap-3 ${result.statut === 'retard' ? 'alert-warning' : 'alert-success'}`}
                     style={{ borderRadius: '10px', border: 'none' }}>
                  <span style={{ fontSize: '2rem' }}>
                    {result.statut === 'retard' ? '⏰' : '✅'}
                  </span>
                  <div>
                    <h6 className="fw-bold mb-1">{result.message}</h6>
                    <p className="mb-0 small">
                      Pointé à <strong>{result.creneau?.heure_reelle}</strong>
                      {result.statut === 'retard' && ' — Retard signalé au surveillant'}
                    </p>
                  </div>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="alert alert-danger mt-4 d-flex align-items-start gap-3"
                     style={{ borderRadius: '10px', border: 'none' }}>
                  <span style={{ fontSize: '2rem' }}>❌</span>
                  <div>
                    <h6 className="fw-bold mb-1">Échec</h6>
                    <p className="mb-0 small">{error}</p>
                  </div>
                </div>
              )}

              {/* Saisie manuelle */}
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                <p className="text-muted small fw-semibold mb-2">⌨️ Saisie manuelle (problème technique)</p>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Collez le token QR ici..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePointage()}
                    style={{ borderRadius: '8px 0 0 8px', border: '1px solid #d1d5db' }}
                  />
                  <button
                    onClick={handlePointage}
                    disabled={loading}
                    className="btn btn-sm text-white"
                    style={{ background: '#6366f1', borderRadius: '0 8px 8px 0' }}
                  >
                    Valider
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default PointagePage