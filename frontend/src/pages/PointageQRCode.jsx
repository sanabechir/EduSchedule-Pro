import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './PointageQRCode.css'
import { getTeacherNameFromUser } from '../services/userScope'

const API_URL = 'http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php'

function PointageQRCode({ user }) {
  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const canGenerate = ['admin', 'surveillant'].includes(role)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState([])
  const [tokens, setTokens] = useState([])

  const [form, setForm] = useState({
    creneau_id: '',
    date_cours: todayIso(),
    minutes_valid: 180,
    scan_base_url:
      localStorage.getItem('teacherQrScanBaseUrl') ||
      'http://192.168.1.10/EduSchedule-Pro/backend/api/teacher_qr.php',
  })

  const [qrResult, setQrResult] = useState(null)
  const [qrImage, setQrImage] = useState('')

  const visiblePresences = useMemo(() => {
    if (role !== 'enseignant' || !teacherName) {
      return presences
    }

    return presences.filter((item) => item.enseignant === teacherName)
  }, [presences, role, teacherName])

  const selectedCreneau = useMemo(() => {
    return creneaux.find((item) => String(item.id) === String(form.creneau_id))
  }, [creneaux, form.creneau_id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${API_URL}?action=list`)
      const text = await res.text()
      const json = JSON.parse(text)

      if (!json.success) {
        throw new Error(json.message || 'Erreur de chargement.')
      }

      const data = json.data || {}

      setCreneaux(data.creneaux || [])
      setPresences(data.presences || [])
      setTokens(data.tokens || [])

      if (!form.creneau_id && data.creneaux?.[0]?.id) {
        setForm((current) => ({
          ...current,
          creneau_id: String(data.creneaux[0].id),
        }))
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger le pointage QR.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (field === 'scan_base_url') {
      localStorage.setItem('teacherQrScanBaseUrl', value)
    }
  }

  const generateQr = async () => {
    if (!canGenerate) {
      setMessage('Seul l’administrateur ou le surveillant peut générer un QR code.')
      return
    }

    if (!form.creneau_id || !form.date_cours || !form.scan_base_url) {
      setMessage('Choisis un cours, une date et une URL mobile.')
      return
    }

    try {
      setMessage('')
      setError('')
      setQrResult(null)
      setQrImage('')

      const res = await fetch(`${API_URL}?action=generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          created_by: user?.email || user?.role || 'admin',
        }),
      })

      const text = await res.text()
      const json = JSON.parse(text)

      if (!json.success) {
        setMessage(json.message || 'Impossible de générer le QR code.')
        return
      }

      const scanUrl = json.data.scan_url

      const image = await QRCode.toDataURL(scanUrl, {
        width: 320,
        margin: 2,
      })

      setQrResult(json.data)
      setQrImage(image)
      setMessage('QR code généré. Le professeur peut le scanner avec son téléphone.')

      await loadData()
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la génération du QR code.')
    }
  }

  const copyLink = async () => {
    if (!qrResult?.scan_url) return

    await navigator.clipboard.writeText(qrResult.scan_url)
    setMessage('Lien copié.')
  }

  return (
    <div className="page qr-page">
      <div className="page-heading">
        <div>
          <h1>Pointage QR professeur</h1>
          <p>
            Génère un QR code de cours. Le professeur le scanne avec son téléphone
            pour marquer sa présence ou son retard.
          </p>
        </div>

        <button className="primary-btn" onClick={loadData}>
          Actualiser
        </button>
      </div>

      <div className="qr-warning">
        <strong>Important téléphone</strong>
        <span>
          Pour scanner avec un téléphone, l’URL mobile ne doit pas être
          <b> localhost</b>. Utilise l’adresse IP du PC sur le Wi-Fi, par exemple
          <b> http://192.168.1.10/EduSchedule-Pro/backend/api/teacher_qr.php</b>.
        </span>
      </div>

      {loading && <div className="qr-message">Chargement...</div>}
      {error && <div className="qr-message error">{error}</div>}
      {message && <div className="qr-message">{message}</div>}

      <div className="qr-grid">
        <section className="panel qr-generator">
          <div className="panel-header">
            <h3>Générer un QR de cours</h3>
            <button>{canGenerate ? 'Autorisé' : 'Consultation'}</button>
          </div>

          {!canGenerate && (
            <div className="qr-readonly">
              Ton rôle ne permet pas de générer un QR code. Le professeur scanne
              normalement le QR affiché par le surveillant ou l’administration.
            </div>
          )}

          <div className="qr-form">
            <div className="qr-field">
              <label>Cours</label>
              <select
                value={form.creneau_id}
                disabled={!canGenerate}
                onChange={(e) => updateForm('creneau_id', e.target.value)}
              >
                <option value="">Choisir un cours</option>
                {creneaux.map((creneau) => (
                  <option key={creneau.id} value={creneau.id}>
                    {creneau.jour} — {creneau.horaire} — {creneau.classe} —{' '}
                    {creneau.matiere} — {creneau.enseignant}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label>Date du cours</label>
              <input
                type="date"
                value={form.date_cours}
                disabled={!canGenerate}
                onChange={(e) => updateForm('date_cours', e.target.value)}
              />
            </div>

            <div className="qr-field">
              <label>Durée de validité</label>
              <select
                value={form.minutes_valid}
                disabled={!canGenerate}
                onChange={(e) => updateForm('minutes_valid', Number(e.target.value))}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 heure</option>
                <option value={120}>2 heures</option>
                <option value={180}>3 heures</option>
                <option value={360}>6 heures</option>
                <option value={1440}>24 heures</option>
              </select>
            </div>

            <div className="qr-field wide">
              <label>URL mobile de scan</label>
              <input
                value={form.scan_base_url}
                disabled={!canGenerate}
                onChange={(e) => updateForm('scan_base_url', e.target.value)}
                placeholder="http://IP-DU-PC/EduSchedule-Pro/backend/api/teacher_qr.php"
              />
            </div>
          </div>

          {selectedCreneau && (
            <div className="qr-course-preview">
              <strong>{selectedCreneau.matiere}</strong>
              <span>
                {selectedCreneau.classe} • {selectedCreneau.enseignant}
              </span>
              <small>
                {selectedCreneau.jour} • {selectedCreneau.horaire} •{' '}
                {selectedCreneau.salle}
              </small>
            </div>
          )}

          {canGenerate && (
            <div className="qr-actions">
              <button className="primary-btn" onClick={generateQr}>
                Générer le QR code
              </button>
            </div>
          )}
        </section>

        <section className="panel qr-result-panel">
          <div className="panel-header">
            <h3>QR code à scanner</h3>
            <button>{qrResult ? 'Prêt' : 'En attente'}</button>
          </div>

          {!qrResult ? (
            <div className="qr-empty">
              Génère un QR code pour qu’il apparaisse ici.
            </div>
          ) : (
            <div className="qr-result">
              <div className="qr-image-box">
                {qrImage && <img src={qrImage} alt="QR code professeur" />}
              </div>

              <div className="qr-result-info">
                <strong>{qrResult.creneau?.matiere}</strong>
                <span>{qrResult.creneau?.enseignant}</span>
                <small>
                  Expire le {formatDateTime(qrResult.expires_at)}
                </small>
              </div>

              <button className="qr-copy-btn" onClick={copyLink}>
                Copier le lien
              </button>

              <a
                className="qr-open-link"
                href={qrResult.scan_url}
                target="_blank"
                rel="noreferrer"
              >
                Tester le scan sur ce PC
              </a>
            </div>
          )}
        </section>
      </div>

      <section className="panel qr-presence-panel">
        <div className="panel-header">
          <h3>Présences professeurs</h3>
          <button>{visiblePresences.length} pointage(s)</button>
        </div>

        <div className="qr-table-wrap">
          <table className="qr-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Professeur</th>
                <th>Classe</th>
                <th>Matière</th>
                <th>Horaire</th>
                <th>Salle</th>
                <th>Statut</th>
                <th>Scanné à</th>
              </tr>
            </thead>

            <tbody>
              {visiblePresences.map((presence) => (
                <tr key={presence.id}>
                  <td>{formatDate(presence.date_cours)}</td>
                  <td>{presence.enseignant}</td>
                  <td>{presence.classe}</td>
                  <td>{presence.matiere}</td>
                  <td>{presence.horaire}</td>
                  <td>{presence.salle}</td>
                  <td>
                    <span className={`qr-status ${presence.statut}`}>
                      {formatStatus(presence.statut)}
                    </span>
                  </td>
                  <td>{formatDateTime(presence.scanned_at)}</td>
                </tr>
              ))}

              {visiblePresences.length === 0 && (
                <tr>
                  <td colSpan="8" className="qr-empty-cell">
                    Aucun pointage professeur pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatStatus(status) {
  const labels = {
    present: 'Présent',
    retard: 'Retard',
    absent: 'Absent',
  }

  return labels[status] || status
}

function formatDate(value) {
  if (!value) return '—'

  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR')
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Date(String(value).replace(' ', 'T')).toLocaleString('fr-FR')
}

export default PointageQRCode