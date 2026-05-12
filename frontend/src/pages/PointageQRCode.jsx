import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './PointageQRCode.css'
import { DEFAULT_WEEK_KEY, WEEK_OPTIONS } from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'

const API_URL = 'http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function PointageQRCode({ user }) {
  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [networkMessage, setNetworkMessage] = useState('')

  const [creneaux, setCreneaux] = useState([])
  const [classes, setClasses] = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [presences, setPresences] = useState([])
  const [tokens, setTokens] = useState([])

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    role === 'delegue' && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedTeacher, setSelectedTeacher] = useState(
    role === 'enseignant' && teacherName ? teacherName : 'Tous',
  )
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate())
  const [selectedStatus, setSelectedStatus] = useState('Tous')

  const [scanBaseUrl, setScanBaseUrl] = useState('')
  const [detectedIp, setDetectedIp] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [scanUrl, setScanUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [generating, setGenerating] = useState(false)

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

  const canGenerateQr = ['admin', 'surveillant'].includes(role)

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const res = await fetch(`${API_URL}?action=list`)
      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Erreur lors du chargement.')
      }

      setCreneaux(json.data?.creneaux || [])
      setClasses(json.data?.classes || [])
      setEnseignants(json.data?.enseignants || [])
      setPresences(json.data?.presences || [])
      setTokens(json.data?.tokens || [])

      if (json.data?.network?.mobile_url) {
        setScanBaseUrl(json.data.network.mobile_url)
        setDetectedIp(json.data.network.ip || '')
      }
    } catch (err) {
      setMessage(err.message || 'Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  const refreshNetwork = async () => {
    try {
      setNetworkMessage('Détection de l’adresse IP en cours...')

      const res = await fetch(`${API_URL}?action=network`)
      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Impossible de détecter l’adresse IP.')
      }

      setDetectedIp(json.data?.ip || '')
      setScanBaseUrl(json.data?.mobile_url || '')

      setNetworkMessage(
        json.data?.ip
          ? `Adresse IP détectée : ${json.data.ip}`
          : 'URL mobile mise à jour.',
      )
    } catch (err) {
      setNetworkMessage(err.message || 'Impossible de détecter automatiquement l’IP.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    refreshNetwork()
  }, [])

  const classOptions = useMemo(() => {
    const names = uniqueValues(classes.map((classe) => classe.nom))
    return ['Toutes', ...names]
  }, [classes])

  const teacherOptions = useMemo(() => {
    const names = uniqueValues(
      enseignants.map(
        (teacher) =>
          teacher.nom_complet || `${teacher.nom || ''} ${teacher.prenom || ''}`.trim(),
      ),
    )

    return ['Tous', ...names]
  }, [enseignants])

  const filteredCourses = useMemo(() => {
    return creneaux
      .filter((course) => {
        if (role === 'enseignant' && teacherName) {
          return (
            course.enseignant === teacherName ||
            course.enseignant_email === user?.email
          )
        }

        if (role === 'delegue' && delegateClass) {
          return course.classe === delegateClass
        }

        return true
      })
      .filter((course) =>
        selectedClasse === 'Toutes' ? true : course.classe === selectedClasse,
      )
      .filter((course) =>
        selectedTeacher === 'Tous' ? true : course.enseignant === selectedTeacher,
      )
      .sort((a, b) => {
        const dayA = DAYS.indexOf(a.jour)
        const dayB = DAYS.indexOf(b.jour)

        if (dayA !== dayB) return dayA - dayB

        return compareHoraire(a.horaire, b.horaire)
      })
  }, [
    creneaux,
    selectedClasse,
    selectedTeacher,
    role,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const selectedCourse = useMemo(() => {
    return filteredCourses.find(
      (course) => Number(course.id) === Number(selectedCourseId),
    )
  }, [filteredCourses, selectedCourseId])

  useEffect(() => {
    if (!selectedCourseId && filteredCourses.length > 0) {
      const first = filteredCourses[0]
      setSelectedCourseId(String(first.id))
      setSelectedDate(getDateForCourse(week, selectedWeek, first.jour))
    }

    if (
      selectedCourseId &&
      filteredCourses.length > 0 &&
      !filteredCourses.some((course) => Number(course.id) === Number(selectedCourseId))
    ) {
      const first = filteredCourses[0]
      setSelectedCourseId(String(first.id))
      setSelectedDate(getDateForCourse(week, selectedWeek, first.jour))
      setQrDataUrl('')
      setScanUrl('')
      setExpiresAt('')
    }

    if (filteredCourses.length === 0) {
      setSelectedCourseId('')
      setQrDataUrl('')
      setScanUrl('')
      setExpiresAt('')
    }
  }, [filteredCourses, selectedCourseId, week, selectedWeek])

  useEffect(() => {
    if (selectedCourse) {
      setSelectedDate(getDateForCourse(week, selectedWeek, selectedCourse.jour))
    }
  }, [selectedCourseId, selectedWeek])

  const filteredPresences = useMemo(() => {
    const weekDates = getWeekDateRange(week, selectedWeek)

    return presences
      .filter((presence) => {
        if (role === 'enseignant' && teacherName) {
          return (
            presence.enseignant === teacherName ||
            presence.enseignant_email === user?.email
          )
        }

        if (role === 'delegue' && delegateClass) {
          return presence.classe === delegateClass
        }

        return true
      })
      .filter((presence) =>
        selectedClasse === 'Toutes' ? true : presence.classe === selectedClasse,
      )
      .filter((presence) =>
        selectedTeacher === 'Tous' ? true : presence.enseignant === selectedTeacher,
      )
      .filter((presence) => {
        if (!weekDates.start || !weekDates.end) return true
        return presence.date_cours >= weekDates.start && presence.date_cours <= weekDates.end
      })
      .filter((presence) =>
        selectedStatus === 'Tous' ? true : presence.statut === selectedStatus,
      )
  }, [
    presences,
    selectedClasse,
    selectedTeacher,
    selectedStatus,
    selectedWeek,
    week,
    role,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const generateQr = async () => {
    if (!canGenerateQr) {
      setMessage('Seul l’administrateur ou le surveillant peut générer un QR code.')
      return
    }

    if (!selectedCourseId || !selectedDate) {
      setMessage('Choisis un cours et une date avant de générer le QR code.')
      return
    }

    if (!scanBaseUrl) {
      setMessage('URL mobile absente. Clique sur “Actualiser IP”.')
      return
    }

    try {
      setGenerating(true)
      setMessage('')
      setQrDataUrl('')
      setScanUrl('')
      setExpiresAt('')

      const res = await fetch(`${API_URL}?action=generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creneau_id: Number(selectedCourseId),
          date_cours: selectedDate,
          minutes_valid: 240,
          scan_base_url: scanBaseUrl,
          created_by: user?.email || user?.nom || 'system',
        }),
      })

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Impossible de générer le QR code.')
      }

      const url = json.data?.scan_url || ''

      if (!url) {
        throw new Error('URL de scan absente dans la réponse API.')
      }

      const qr = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
      })

      setQrDataUrl(qr)
      setScanUrl(url)
      setExpiresAt(json.data?.expires_at || '')
      setMessage('QR code généré avec succès.')

      await loadData()
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la génération du QR code.')
    } finally {
      setGenerating(false)
    }
  }

  const resetFilters = () => {
    setSelectedWeek(DEFAULT_WEEK_KEY)
    setSelectedClasse(role === 'delegue' && delegateClass ? delegateClass : 'Toutes')
    setSelectedTeacher(role === 'enseignant' && teacherName ? teacherName : 'Tous')
    setSelectedStatus('Tous')
    setQrDataUrl('')
    setScanUrl('')
    setExpiresAt('')
    setMessage('')
  }

  return (
    <div className="page qr-page">
      <div className="page-heading">
        <div>
          <h1>Pointage QR Code</h1>
          <p>
            Génération de QR codes de pointage professeur avec filtres par
            semaine, classe, professeur et cours précis.
          </p>
        </div>

        <button className="primary-btn" onClick={refreshNetwork}>
          Actualiser IP
        </button>
      </div>

      {loading && <div className="qr-message">Chargement des données...</div>}

      {message && <div className="qr-message">{message}</div>}

      {networkMessage && (
        <div className="qr-message network-message">{networkMessage}</div>
      )}

      <section className="qr-layout">
        <div className="panel qr-control-panel">
          <div className="panel-header">
            <div>
              <h3>Générer un QR de cours</h3>
              <p>Choisis exactement le cours à pointer.</p>
            </div>
          </div>

          <div className="qr-filter-grid">
            <div className="qr-field">
              <label>Semaine</label>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  setSelectedWeek(e.target.value)
                  setQrDataUrl('')
                  setScanUrl('')
                  setExpiresAt('')
                }}
              >
                {WEEK_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label>Classe</label>
              <select
                value={selectedClasse}
                disabled={role === 'delegue'}
                onChange={(e) => {
                  setSelectedClasse(e.target.value)
                  setSelectedCourseId('')
                  setQrDataUrl('')
                  setScanUrl('')
                  setExpiresAt('')
                }}
              >
                {classOptions.map((classe) => (
                  <option key={classe} value={classe}>
                    {classe}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label>Professeur</label>
              <select
                value={selectedTeacher}
                disabled={role === 'enseignant'}
                onChange={(e) => {
                  setSelectedTeacher(e.target.value)
                  setSelectedCourseId('')
                  setQrDataUrl('')
                  setScanUrl('')
                  setExpiresAt('')
                }}
              >
                {teacherOptions.map((teacher) => (
                  <option key={teacher} value={teacher}>
                    {teacher === 'Tous' ? 'Tous les professeurs' : teacher}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label>Cours précis</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  const id = e.target.value
                  const course = filteredCourses.find(
                    (item) => Number(item.id) === Number(id),
                  )

                  setSelectedCourseId(id)

                  if (course) {
                    setSelectedDate(getDateForCourse(week, selectedWeek, course.jour))
                  }

                  setQrDataUrl('')
                  setScanUrl('')
                  setExpiresAt('')
                }}
              >
                {filteredCourses.length === 0 && (
                  <option value="">Aucun cours disponible</option>
                )}

                {filteredCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.jour} — {course.horaire} — {course.classe} —{' '}
                    {course.matiere} — {course.enseignant}
                  </option>
                ))}
              </select>
            </div>

            <div className="qr-field">
              <label>Date du cours</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setQrDataUrl('')
                  setScanUrl('')
                  setExpiresAt('')
                }}
              />
            </div>

            <div className="qr-field qr-url-field">
              <label>URL mobile de scan</label>
              <input
                value={scanBaseUrl}
                onChange={(e) => setScanBaseUrl(e.target.value)}
                placeholder="http://IP_DU_PC/EduSchedule-Pro/backend/api/teacher_qr.php"
              />
            </div>
          </div>

          {detectedIp && (
            <div className="qr-ip-card">
              <strong>IP détectée automatiquement</strong>
              <span>{detectedIp}</span>
              <small>
                Si ton téléphone ne scanne pas, vérifie qu’il est sur le même Wi-Fi
                que le PC.
              </small>
            </div>
          )}

          {selectedCourse && (
            <div className="qr-course-preview">
              <span>Cours sélectionné</span>
              <h3>{selectedCourse.matiere}</h3>

              <div>
                <p>
                  <strong>Classe :</strong> {selectedCourse.classe}
                </p>
                <p>
                  <strong>Professeur :</strong> {selectedCourse.enseignant}
                </p>
                <p>
                  <strong>Jour :</strong> {selectedCourse.jour}
                </p>
                <p>
                  <strong>Horaire :</strong> {selectedCourse.horaire}
                </p>
                <p>
                  <strong>Salle :</strong> {selectedCourse.salle}
                </p>
              </div>
            </div>
          )}

          <div className="qr-actions">
            <button
              className="primary-btn"
              onClick={generateQr}
              disabled={!canGenerateQr || generating || filteredCourses.length === 0}
            >
              {generating ? 'Génération...' : 'Générer le QR Code'}
            </button>

            <button className="qr-secondary-btn" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>

          {!canGenerateQr && (
            <div className="qr-warning">
              Ton rôle actuel ne permet pas de générer un QR code.
            </div>
          )}
        </div>

        <div className="panel qr-result-panel">
          <div className="panel-header">
            <div>
              <h3>QR Code généré</h3>
              <p>À scanner avec le téléphone du professeur.</p>
            </div>
          </div>

          {qrDataUrl ? (
            <div className="qr-result-box">
              <img src={qrDataUrl} alt="QR Code de pointage professeur" />

              <div className="qr-result-info">
                <span>URL du QR</span>
                <code>{scanUrl}</code>

                {expiresAt && (
                  <p>
                    Expire le : <strong>{formatDateTime(expiresAt)}</strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="qr-empty">
              Aucun QR généré pour le moment.
            </div>
          )}
        </div>
      </section>

      <section className="panel qr-history-panel">
        <div className="panel-header">
          <div>
            <h3>Historique des pointages</h3>
            <p>Filtré selon la semaine, la classe, le professeur et le statut.</p>
          </div>

          <div className="qr-history-filter">
            <label>Statut</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="Tous">Tous</option>
              <option value="present">Présent</option>
              <option value="retard">Retard</option>
            </select>
          </div>
        </div>

        <div className="qr-history-table-wrap">
          <table className="qr-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Classe</th>
                <th>Professeur</th>
                <th>Matière</th>
                <th>Horaire</th>
                <th>Salle</th>
                <th>Statut</th>
                <th>Scan</th>
              </tr>
            </thead>

            <tbody>
              {filteredPresences.map((presence) => (
                <tr key={presence.id}>
                  <td>{formatDate(presence.date_cours)}</td>
                  <td>{presence.classe}</td>
                  <td>{presence.enseignant}</td>
                  <td>{presence.matiere}</td>
                  <td>{presence.horaire}</td>
                  <td>{presence.salle}</td>
                  <td>
                    <span className={`qr-status ${presence.statut}`}>
                      {presence.statut === 'present' ? 'Présent' : 'Retard'}
                    </span>
                  </td>
                  <td>{formatDateTime(presence.scanned_at)}</td>
                </tr>
              ))}

              {filteredPresences.length === 0 && (
                <tr>
                  <td colSpan="8" className="qr-empty-row">
                    Aucun pointage trouvé pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel qr-token-panel">
        <div className="panel-header">
          <div>
            <h3>Derniers QR générés</h3>
            <p>Liste des derniers QR codes créés.</p>
          </div>
        </div>

        <div className="qr-token-list">
          {tokens.slice(0, 8).map((token) => (
            <div key={token.id} className="qr-token-card">
              <strong>{token.matiere}</strong>
              <span>{token.classe}</span>
              <small>
                {token.enseignant} · {token.jour} · {token.horaire}
              </small>
              <small>Date : {formatDate(token.date_cours)}</small>
              <small>Expire : {formatDateTime(token.expires_at)}</small>
            </div>
          ))}

          {tokens.length === 0 && (
            <div className="qr-empty">
              Aucun QR généré pour le moment.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function compareHoraire(a, b) {
  return getHoraireStart(a) - getHoraireStart(b)
}

function getHoraireStart(value) {
  const parsed = parseHoraire(value)
  return parsed ? parsed.start : 99999
}

function parseHoraire(value) {
  const text = String(value || '')
    .trim()
    .replaceAll('[', '')
    .replaceAll(']', '')
    .replaceAll('H', 'h')
    .replaceAll(' ', '')
    .replaceAll('à', '-')
    .replaceAll('–', '-')
    .replaceAll('—', '-')
    .replaceAll(':', '-')

  const match = text.match(/^(\d{1,2})h?(\d{2})?-(\d{1,2})h?(\d{2})?$/i)

  if (!match) return null

  const startHour = Number(match[1])
  const startMin = Number(match[2] || 0)
  const endHour = Number(match[3])
  const endMin = Number(match[4] || 0)

  const start = startHour * 60 + startMin
  const end = endHour * 60 + endMin

  if (end <= start) return null

  return { start, end }
}

function getTodayIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 10)
}

function getDateForCourse(week, selectedWeek, jour) {
  const dayIndex = DAYS.indexOf(jour)

  const fromWeekObject = week?.days?.find((day) => day.key === jour)

  const directDate =
    fromWeekObject?.date ||
    fromWeekObject?.isoDate ||
    fromWeekObject?.value ||
    fromWeekObject?.dateValue

  if (directDate && /^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
    return directDate
  }

  const monday = getWeekMonday(selectedWeek)

  if (!monday || dayIndex < 0) {
    return getTodayIsoDate()
  }

  const date = new Date(monday)
  date.setDate(date.getDate() + dayIndex)

  return toIsoDate(date)
}

function getWeekDateRange(week, selectedWeek) {
  const monday = getWeekMonday(selectedWeek)

  if (!monday) {
    return {
      start: null,
      end: null,
    }
  }

  const start = new Date(monday)
  const end = new Date(monday)
  end.setDate(end.getDate() + 5)

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  }
}

function getWeekMonday(selectedWeek) {
  const match = String(selectedWeek || '').match(/(\d{4}-\d{2}-\d{2})/)

  if (match) {
    return new Date(`${match[1]}T00:00:00`)
  }

  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day

  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  return monday
}

function toIsoDate(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('fr-FR')
}

function formatDateTime(value) {
  if (!value) return '—'

  const safe = String(value).replace(' ', 'T')
  const date = new Date(safe)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default PointageQRCode