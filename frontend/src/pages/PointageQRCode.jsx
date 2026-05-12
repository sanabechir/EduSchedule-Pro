import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './PointageQRCode.css'
import { DEFAULT_WEEK_KEY, WEEK_OPTIONS } from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'

const API_URL = 'http://127.0.0.1/EduSchedule-Pro/backend/api/teacher_qr.php'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function PointageQRCode({ user }) {
  const role = String(user?.role || 'admin').toLowerCase()
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const isAdmin = role === 'admin' || role === 'administrateur'
  const isSurveillant = role === 'surveillant'
  const isTeacher = role === 'enseignant'
  const isDelegue = role === 'delegue'

  const canGenerateQr = isAdmin || isSurveillant || isTeacher
  const canManualPointage = isAdmin || isSurveillant
  const canSeeTechnicalInfo = isAdmin
  const canSeeAllCourses = isAdmin || isSurveillant

  const [loading, setLoading] = useState(true)
  const [refreshingHistory, setRefreshingHistory] = useState(false)
  const [message, setMessage] = useState('')
  const [networkMessage, setNetworkMessage] = useState('')

  const [creneaux, setCreneaux] = useState([])
  const [classes, setClasses] = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [presences, setPresences] = useState([])
  const [tokens, setTokens] = useState([])

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    isDelegue && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedTeacher, setSelectedTeacher] = useState(
    isTeacher && teacherName ? teacherName : 'Tous',
  )
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate())
  const [selectedStatus, setSelectedStatus] = useState('Tous')

  const [manualStatus, setManualStatus] = useState('present')
  const [manualSaving, setManualSaving] = useState(false)

  const [scanBaseUrl, setScanBaseUrl] = useState('')
  const [detectedIp, setDetectedIp] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [scanUrl, setScanUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [generating, setGenerating] = useState(false)

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

  const pageTitle = useMemo(() => {
    if (isTeacher) return 'Mes pointages'
    if (isSurveillant) return 'Contrôle pointage'
    if (isDelegue) return 'Suivi pointage'
    return 'Administration pointage'
  }, [isTeacher, isSurveillant, isDelegue])

  const pageDescription = useMemo(() => {
    if (isTeacher) {
      return 'Générez le QR de vos cours et scannez-le avec votre téléphone pour marquer votre présence.'
    }

    if (isSurveillant) {
      return 'Contrôlez les présences, générez un QR si nécessaire et effectuez un pointage manuel.'
    }

    if (isDelegue) {
      return 'Consultez les pointages liés à votre classe.'
    }

    return 'Gestion complète des QR codes, pointages manuels, historiques et paramètres techniques.'
  }, [isTeacher, isSurveillant, isDelegue])

  const loadData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)

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
        setScanBaseUrl((currentUrl) => currentUrl || json.data.network.mobile_url)
        setDetectedIp(json.data.network.ip || '')
      }

      if (!silent) setMessage('')
    } catch (err) {
      if (!silent) {
        setMessage(err.message || 'Impossible de charger les données.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const refreshHistory = async () => {
    try {
      setRefreshingHistory(true)
      await loadData({ silent: true })
      setMessage('Historique actualisé.')
    } catch {
      setMessage('Impossible d’actualiser l’historique.')
    } finally {
      setRefreshingHistory(false)
    }
  }

  const refreshNetwork = async ({ silent = false } = {}) => {
    try {
      if (!silent && canSeeTechnicalInfo) {
        setNetworkMessage('Détection de l’adresse IP en cours...')
      }

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

      if (!silent && canSeeTechnicalInfo) {
        setNetworkMessage(
          json.data?.ip
            ? `Adresse IP détectée : ${json.data.ip}`
            : 'URL mobile mise à jour.',
        )
      }
    } catch (err) {
      if (!silent && canSeeTechnicalInfo) {
        setNetworkMessage(
          err.message || 'Impossible de détecter automatiquement l’IP.',
        )
      }
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    refreshNetwork({ silent: !canSeeTechnicalInfo })
  }, [canSeeTechnicalInfo])

  useEffect(() => {
    const interval = setInterval(() => {
      loadData({ silent: true })
    }, 5000)

    return () => clearInterval(interval)
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
        if (isTeacher && teacherName) {
          return (
            course.enseignant === teacherName ||
            course.enseignant_email === user?.email
          )
        }

        if (isDelegue && delegateClass) {
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
    isTeacher,
    isDelegue,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const todayCourses = useMemo(() => {
    const today = getTodayIsoDate()

    return filteredCourses.filter((course) => {
      const courseDate = getDateForCourse(week, selectedWeek, course.jour)
      return courseDate === today
    })
  }, [filteredCourses, week, selectedWeek])

  const selectedCourse = useMemo(() => {
    return filteredCourses.find(
      (course) => Number(course.id) === Number(selectedCourseId),
    )
  }, [filteredCourses, selectedCourseId])

  const selectedCourseTiming = useMemo(() => {
    if (!selectedCourse || !selectedDate) return null
    return getCourseTimingStatus(selectedDate, selectedCourse.horaire)
  }, [selectedCourse, selectedDate])

  useEffect(() => {
    if (!selectedCourseId && filteredCourses.length > 0) {
      const priorityCourse = isTeacher && todayCourses.length > 0 ? todayCourses[0] : filteredCourses[0]

      setSelectedCourseId(String(priorityCourse.id))
      setSelectedDate(getDateForCourse(week, selectedWeek, priorityCourse.jour))
    }

    if (
      selectedCourseId &&
      filteredCourses.length > 0 &&
      !filteredCourses.some((course) => Number(course.id) === Number(selectedCourseId))
    ) {
      const first = isTeacher && todayCourses.length > 0 ? todayCourses[0] : filteredCourses[0]

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
  }, [
    filteredCourses,
    selectedCourseId,
    week,
    selectedWeek,
    isTeacher,
    todayCourses,
  ])

  useEffect(() => {
    if (selectedCourse) {
      setSelectedDate(getDateForCourse(week, selectedWeek, selectedCourse.jour))
    }
  }, [selectedCourseId, selectedWeek])

  const filteredPresences = useMemo(() => {
    const weekDates = getWeekDateRange(selectedWeek)

    return presences
      .filter((presence) => {
        if (isTeacher && teacherName) {
          return (
            presence.enseignant === teacherName ||
            presence.enseignant_email === user?.email
          )
        }

        if (isDelegue && delegateClass) {
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
    isTeacher,
    isDelegue,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const generateQr = async () => {
    if (!canGenerateQr) {
      setMessage('Votre rôle ne permet pas de générer un QR code.')
      return
    }

    if (!selectedCourseId || !selectedDate) {
      setMessage('Choisis un cours et une date avant de générer le QR code.')
      return
    }

    if (!scanBaseUrl) {
      await refreshNetwork({ silent: true })
    }

    const finalScanBaseUrl = scanBaseUrl

    if (!finalScanBaseUrl) {
      setMessage('Lien de scan indisponible. Vérifie que WAMP est démarré.')
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
          scan_base_url: finalScanBaseUrl,
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

      if (isTeacher) {
        setMessage('QR généré. Scannez-le avec votre téléphone pour pointer.')
      } else {
        setMessage('QR code généré avec succès.')
      }

      await loadData({ silent: true })
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la génération du QR code.')
    } finally {
      setGenerating(false)
    }
  }

  const saveManualPointage = async () => {
    if (!canManualPointage) {
      setMessage('Votre rôle ne permet pas de faire un pointage manuel.')
      return
    }

    if (!selectedCourseId || !selectedDate || !manualStatus) {
      setMessage('Choisis un cours, une date et un statut.')
      return
    }

    try {
      setManualSaving(true)
      setMessage('')

      const res = await fetch(`${API_URL}?action=manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creneau_id: Number(selectedCourseId),
          date_cours: selectedDate,
          statut: manualStatus,
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
        throw new Error(json.message || 'Impossible d’enregistrer le pointage manuel.')
      }

      setMessage('Pointage manuel enregistré.')
      await loadData({ silent: true })
    } catch (err) {
      setMessage(err.message || 'Erreur lors du pointage manuel.')
    } finally {
      setManualSaving(false)
    }
  }

  const resetFilters = () => {
    setSelectedWeek(DEFAULT_WEEK_KEY)
    setSelectedClasse(isDelegue && delegateClass ? delegateClass : 'Toutes')
    setSelectedTeacher(isTeacher && teacherName ? teacherName : 'Tous')
    setSelectedStatus('Tous')
    setManualStatus('present')
    setQrDataUrl('')
    setScanUrl('')
    setExpiresAt('')
    setMessage('')
  }

  return (
    <div className={`page qr-page role-${role}`}>
      <div className="page-heading qr-heading">
        <div>
          <span className="qr-role-badge">{getRoleLabel(role)}</span>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>

        {canSeeTechnicalInfo && (
          <button className="primary-btn" onClick={() => refreshNetwork()}>
            Actualiser IP
          </button>
        )}
      </div>

      {loading && <div className="qr-message">Chargement des données...</div>}
      {message && <div className="qr-message">{message}</div>}

      {canSeeTechnicalInfo && networkMessage && (
        <div className="qr-message network-message">{networkMessage}</div>
      )}

      {isTeacher && (
        <section className="panel qr-teacher-focus">
          <div className="panel-header">
            <div>
              <h3>Mes cours du jour</h3>
              <p>
                Le QR peut être généré depuis cette page. Le pointage réel ouvre
                automatiquement 10 minutes avant le début du cours.
              </p>
            </div>
            <span className="qr-count-pill">{todayCourses.length} cours</span>
          </div>

          <div className="qr-teacher-course-list">
            {todayCourses.length > 0 ? (
              todayCourses.map((course) => {
                const courseDate = getDateForCourse(week, selectedWeek, course.jour)
                const timing = getCourseTimingStatus(courseDate, course.horaire)

                return (
                  <button
                    key={course.id}
                    className={`qr-teacher-course-card ${
                      Number(course.id) === Number(selectedCourseId) ? 'active' : ''
                    }`}
                    onClick={() => {
                      setSelectedCourseId(String(course.id))
                      setSelectedDate(courseDate)
                      setQrDataUrl('')
                      setScanUrl('')
                      setExpiresAt('')
                    }}
                  >
                    <strong>{course.matiere}</strong>
                    <span>
                      {course.classe} · {course.jour} · {course.horaire} ·{' '}
                      {course.salle}
                    </span>
                    <small className={`timing ${timing.type}`}>
                      {timing.label}
                    </small>
                  </button>
                )
              })
            ) : (
              <div className="qr-empty">
                Aucun cours aujourd’hui pour la semaine sélectionnée.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="qr-layout">
        <div className="panel qr-control-panel">
          <div className="panel-header">
            <div>
              <h3>{isTeacher ? 'Générer mon QR de présence' : 'Générer un QR de cours'}</h3>
              <p>
                {isTeacher
                  ? 'Sélectionnez un de vos cours, générez le QR, puis scannez-le avec votre téléphone.'
                  : 'Choisissez exactement le cours à pointer.'}
              </p>
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

            {canSeeAllCourses && (
              <div className="qr-field">
                <label>Classe</label>
                <select
                  value={selectedClasse}
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
            )}

            {!isTeacher && canSeeAllCourses && (
              <div className="qr-field">
                <label>Professeur</label>
                <select
                  value={selectedTeacher}
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
            )}

            {isTeacher && (
              <div className="qr-field">
                <label>Professeur</label>
                <input value={teacherName || 'Enseignant'} disabled />
              </div>
            )}

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

            {canSeeTechnicalInfo && (
              <div className="qr-field qr-url-field">
                <label>URL mobile de scan</label>
                <input
                  value={scanBaseUrl}
                  onChange={(e) => setScanBaseUrl(e.target.value)}
                  placeholder="http://IP_DU_PC/EduSchedule-Pro/backend/api/teacher_qr.php"
                />
              </div>
            )}
          </div>

          {canSeeTechnicalInfo && detectedIp && (
            <div className="qr-ip-card">
              <strong>IP détectée automatiquement</strong>
              <span>{detectedIp}</span>
              <small>
                Si le téléphone ne scanne pas, vérifiez qu’il est sur le même Wi-Fi
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

              {selectedCourseTiming && (
                <div className={`qr-timing-alert ${selectedCourseTiming.type}`}>
                  {selectedCourseTiming.label}
                </div>
              )}
            </div>
          )}

          <div className="qr-actions">
            <button
              className="primary-btn"
              onClick={generateQr}
              disabled={!canGenerateQr || generating || filteredCourses.length === 0}
            >
              {generating
                ? 'Génération...'
                : isTeacher
                  ? 'Générer mon QR'
                  : 'Générer le QR Code'}
            </button>

            <button className="qr-secondary-btn" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>

          {!canGenerateQr && (
            <div className="qr-warning">
              Votre rôle actuel ne permet pas de générer un QR code.
            </div>
          )}
        </div>

        <div className="panel qr-result-panel">
          <div className="panel-header">
            <div>
              <h3>{isTeacher ? 'Mon QR à scanner' : 'QR Code généré'}</h3>
              <p>
                {isTeacher
                  ? 'Scannez ce QR avec votre téléphone pour confirmer votre présence.'
                  : 'À scanner avec le téléphone du professeur.'}
              </p>
            </div>
          </div>

          {qrDataUrl ? (
            <div className="qr-result-box">
              <img src={qrDataUrl} alt="QR Code de pointage professeur" />

              <div className="qr-result-info">
                {canSeeTechnicalInfo && (
                  <>
                    <span>URL du QR</span>
                    <code>{scanUrl}</code>
                  </>
                )}

                {expiresAt && (
                  <p>
                    Expire le : <strong>{formatDateTime(expiresAt)}</strong>
                  </p>
                )}

                {!canSeeTechnicalInfo && scanUrl && (
                  <button
                    type="button"
                    className="qr-secondary-btn"
                    onClick={() => window.open(scanUrl, '_blank')}
                  >
                    Ouvrir le pointage sur ce navigateur
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="qr-empty">Aucun QR généré pour le moment.</div>
          )}
        </div>
      </section>

      {canManualPointage && (
        <section className="panel qr-manual-panel">
          <div className="panel-header">
            <div>
              <h3>Pointage manuel</h3>
              <p>
                Permet à l’administrateur ou au surveillant de marquer un
                professeur présent, en retard ou absent sans QR code.
              </p>
            </div>
          </div>

          <div className="qr-manual-content">
            {selectedCourse ? (
              <div className="qr-manual-summary">
                <strong>{selectedCourse.matiere}</strong>
                <span>
                  {selectedCourse.classe} · {selectedCourse.enseignant} ·{' '}
                  {selectedCourse.jour} · {selectedCourse.horaire} ·{' '}
                  {selectedCourse.salle}
                </span>
                <small>Date : {formatDate(selectedDate)}</small>
              </div>
            ) : (
              <div className="qr-empty">Aucun cours sélectionné.</div>
            )}

            <div className="qr-manual-form">
              <div className="qr-field">
                <label>Statut manuel</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                >
                  <option value="present">Présent</option>
                  <option value="retard">Retard</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <button
                className="primary-btn"
                onClick={saveManualPointage}
                disabled={
                  !canManualPointage ||
                  manualSaving ||
                  !selectedCourseId ||
                  filteredCourses.length === 0
                }
              >
                {manualSaving ? 'Enregistrement...' : 'Enregistrer le pointage'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="panel qr-history-panel">
        <div className="panel-header">
          <div>
            <h3>{isTeacher ? 'Mes pointages récents' : 'Historique des pointages'}</h3>
            <p>
              {isTeacher
                ? 'Retrouvez vos pointages de la semaine sélectionnée.'
                : 'Filtré selon la semaine, la classe, le professeur et le statut. Actualisation automatique toutes les 5 secondes.'}
            </p>
          </div>

          <div className="qr-history-actions">
            <button
              className="qr-secondary-btn"
              onClick={refreshHistory}
              disabled={refreshingHistory}
            >
              {refreshingHistory ? 'Actualisation...' : 'Actualiser l’historique'}
            </button>

            <div className="qr-history-filter">
              <label>Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Tous">Tous</option>
                <option value="present">Présent</option>
                <option value="retard">Retard</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="qr-history-table-wrap">
          <table className="qr-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Classe</th>
                {!isTeacher && <th>Professeur</th>}
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
                  {!isTeacher && <td>{presence.enseignant}</td>}
                  <td>{presence.matiere}</td>
                  <td>{presence.horaire}</td>
                  <td>{presence.salle}</td>
                  <td>
                    <span className={`qr-status ${presence.statut}`}>
                      {getStatusLabel(presence.statut)}
                    </span>
                  </td>
                  <td>{formatDateTime(presence.scanned_at)}</td>
                </tr>
              ))}

              {filteredPresences.length === 0 && (
                <tr>
                  <td colSpan={isTeacher ? 7 : 8} className="qr-empty-row">
                    Aucun pointage trouvé pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canSeeTechnicalInfo && (
        <section className="panel qr-token-panel">
          <div className="panel-header">
            <div>
              <h3>Derniers QR générés</h3>
              <p>Liste technique des derniers QR codes créés.</p>
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
              <div className="qr-empty">Aucun QR généré pour le moment.</div>
            )}
          </div>
        </section>
      )}
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

function getWeekDateRange(selectedWeek) {
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

function getStatusLabel(status) {
  if (status === 'present') return 'Présent'
  if (status === 'retard') return 'Retard'
  if (status === 'absent') return 'Absent'

  return status || '—'
}

function getRoleLabel(role) {
  if (role === 'admin' || role === 'administrateur') return 'Administrateur'
  if (role === 'surveillant') return 'Surveillant'
  if (role === 'enseignant') return 'Enseignant'
  if (role === 'delegue') return 'Délégué'

  return role || 'Utilisateur'
}

function getCourseTimingStatus(dateCours, horaire) {
  const parsed = parseHoraire(horaire)

  if (!parsed || !dateCours) {
    return {
      type: 'neutral',
      label: 'Horaire non vérifiable',
    }
  }

  const now = new Date()
  const start = new Date(`${dateCours}T${minutesToTime(parsed.start)}`)
  const end = new Date(`${dateCours}T${minutesToTime(parsed.end)}`)

  const open = new Date(start.getTime() - 10 * 60 * 1000)
  const late = new Date(start.getTime() + 15 * 60 * 1000)
  const close = new Date(end.getTime() + 30 * 60 * 1000)

  if (now < open) {
    return {
      type: 'soon',
      label: `Pointage ouvrira à ${formatTime(open)}`,
    }
  }

  if (now >= open && now <= late) {
    return {
      type: 'open',
      label: 'Pointage ouvert : présence possible',
    }
  }

  if (now > late && now <= close) {
    return {
      type: 'late',
      label: 'Pointage ouvert : retard possible',
    }
  }

  return {
    type: 'closed',
    label: 'Pointage fermé ou hors période',
  }
}

function minutesToTime(total) {
  const h = Math.floor(total / 60)
  const m = total % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default PointageQRCode