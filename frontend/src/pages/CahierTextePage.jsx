import { useEffect, useMemo, useRef, useState } from 'react'
import './CahierTextePage.css'
import {
  DEFAULT_CLASSES,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'
import {
  buildCardsHtml,
  buildSignaturesHtml,
  buildTableHtml,
  exportHtmlToPdf,
} from '../services/pdfExport'
import { getHolidayForWeekDay } from '../services/burkinaHolidays'
import {
  canEditCahierTexte,
  canExportCahierPdf,
  canFillCahierTexte,
  canSignCahierAsDelegue,
  canSignCahierAsTeacher,
  canValidateCahierTexte,
  canViewAllCahiers,
  canViewCahierTexte,
  getRoleLabel,
} from '../services/permissions'

const API_BASE = 'http://127.0.0.1/EduSchedule-Pro/backend/api'
const SCHEDULE_API_URL = `${API_BASE}/schedule.php`
const POINTAGE_API_URL = `${API_BASE}/teacher_qr.php`
const CAHIER_API_URL = `${API_BASE}/cahiers_texte.php`

const EMPTY_FORM = {
  titre: '',
  contenu: '',
  travaux: '',
  observation: '',
}

function CahierTextePage({ user }) {
  const { actions } = useAppStore()

  const role = normalizeRole(user?.role || 'admin')
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const canViewPage = canViewCahierTexte(user)
  const canViewAll = canViewAllCahiers(user)
  const canFillPermission = canFillCahierTexte(user)
  const canEditPermission = canEditCahierTexte(user)
  const canValidatePermission = canValidateCahierTexte(user)
  const canSignDeleguePermission = canSignCahierAsDelegue(user)
  const canSignTeacherPermission = canSignCahierAsTeacher(user)
  const canExportPdf = canExportCahierPdf(user)

  const isAdminRole = ['admin', 'administrateur'].includes(role)
  const isTeacherRole = ['enseignant', 'professeur', 'teacher'].includes(role)
  const isDelegateRole = ['delegue', 'delegate'].includes(role)
  const isSurveillantRole = ['surveillant', 'surveillant_general'].includes(role)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    isDelegateRole && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pointageLoading, setPointageLoading] = useState(false)

  const [apiData, setApiData] = useState({
    seances: [],
    classes: [],
  })

  const [backendPointages, setBackendPointages] = useState([])
  const [backendCahiers, setBackendCahiers] = useState([])

  const week = getWeek(selectedWeek)

  const loadSchedule = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(
        `${SCHEDULE_API_URL}?action=list&week=${encodeURIComponent(selectedWeek)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      )

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse schedule.php invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Impossible de charger les séances.')
      }

      const seances = (json.data?.seances || []).map((item) => ({
        ...item,
        id: Number(item.id),
        weekKey: item.weekKey || item.week_key || selectedWeek,
      }))

      setApiData({
        seances,
        classes: json.data?.classes || [],
      })

      if (typeof actions.syncBackendSeances === 'function') {
        actions.syncBackendSeances(seances)
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger les séances.')
      setApiData({
        seances: [],
        classes: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBackendPointages = async ({ silent = true } = {}) => {
    try {
      if (!silent) setPointageLoading(true)

      const res = await fetch(`${POINTAGE_API_URL}?action=history&limit=300`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse teacher_qr.php invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Impossible de charger les pointages.')
      }

      setBackendPointages(json.data?.presences || [])
    } catch (err) {
      if (!silent) {
        setMessage(err.message || 'Impossible de charger les pointages.')
      }
    } finally {
      if (!silent) setPointageLoading(false)
    }
  }

  const loadBackendCahiers = async ({ silent = true } = {}) => {
    try {
      const res = await fetch(
        `${CAHIER_API_URL}?action=list&week=${encodeURIComponent(selectedWeek)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      )

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse cahiers_texte.php invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Impossible de charger les cahiers.')
      }

      setBackendCahiers(json.data?.cahiers || [])
    } catch (err) {
      if (!silent) {
        setMessage(err.message || 'Impossible de charger les cahiers.')
      }
    }
  }

  const loadEverything = async () => {
    await Promise.all([
      loadSchedule(),
      loadBackendPointages({ silent: true }),
      loadBackendCahiers({ silent: true }),
    ])
  }

  useEffect(() => {
    loadEverything()
    setSelectedSeanceId(null)
    setMessage('')
  }, [selectedWeek])

  useEffect(() => {
    const interval = setInterval(() => {
      loadBackendPointages({ silent: true })
      loadBackendCahiers({ silent: true })
    }, 3000)

    const refreshOnFocus = () => {
      loadBackendPointages({ silent: true })
      loadBackendCahiers({ silent: true })
    }

    const refreshOnPointage = () => {
      loadBackendPointages({ silent: true })
    }

    const refreshOnStorage = (event) => {
      if (event.key === 'eduschedule_pointage_updated_at') {
        loadBackendPointages({ silent: true })
      }

      if (event.key === 'eduschedule_cahier_updated_at') {
        loadBackendCahiers({ silent: true })
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    window.addEventListener('storage', refreshOnStorage)
    window.addEventListener('eduschedule-pointage-updated', refreshOnPointage)
    window.addEventListener('eduschedule-cahier-updated', refreshOnFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
      window.removeEventListener('storage', refreshOnStorage)
      window.removeEventListener('eduschedule-pointage-updated', refreshOnPointage)
      window.removeEventListener('eduschedule-cahier-updated', refreshOnFocus)
    }
  }, [selectedWeek])

  const classes = useMemo(() => {
    const names = [
      ...new Set([
        ...DEFAULT_CLASSES,
        ...(apiData.classes || []).map((item) => item.nom).filter(Boolean),
        ...(apiData.seances || []).map((item) => item.classe).filter(Boolean),
      ]),
    ]

    if (isDelegateRole && delegateClass) {
      const matchedClass = names.find((classe) => classMatches(classe, delegateClass))
      return [matchedClass || delegateClass]
    }

    if (!canViewAll && isTeacherRole) {
      const teacherClasses = [
        ...new Set(
          (apiData.seances || [])
            .filter((seance) => {
              return (
                seance.enseignant === teacherName ||
                seance.enseignant_email === user?.email
              )
            })
            .map((seance) => seance.classe)
            .filter(Boolean),
        ),
      ]

      return teacherClasses.length > 0 ? ['Toutes', ...teacherClasses] : ['Toutes']
    }

    return ['Toutes', ...names]
  }, [
    apiData.classes,
    apiData.seances,
    canViewAll,
    isDelegateRole,
    isTeacherRole,
    delegateClass,
    teacherName,
    user?.email,
  ])

  const seances = useMemo(() => {
    return (apiData.seances || [])
      .filter((item) => item.weekKey === selectedWeek)
      .filter((item) => {
        const dayIndex = week.days.findIndex((day) => day.key === item.jour)
        if (dayIndex < 0) return true

        const holiday = getHolidayForWeekDay(week, selectedWeek, dayIndex)
        return !holiday
      })
      .filter((item) =>
        selectedClasse === 'Toutes' ? true : classMatches(item.classe, selectedClasse),
      )
      .filter((item) => {
        if (isTeacherRole && teacherName) {
          return (
            item.enseignant === teacherName ||
            item.enseignant_email === user?.email
          )
        }

        return true
      })
      .filter((item) => {
        if (isDelegateRole && delegateClass) {
          return classMatches(item.classe, delegateClass)
        }

        return true
      })
      .sort((a, b) => {
        const dayA = week.days.findIndex((day) => day.key === a.jour)
        const dayB = week.days.findIndex((day) => day.key === b.jour)

        if (dayA !== dayB) return dayA - dayB

        return String(a.horaire || '').localeCompare(String(b.horaire || ''))
      })
  }, [
    apiData.seances,
    selectedWeek,
    selectedClasse,
    week,
    isTeacherRole,
    isDelegateRole,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const selectedSeance = useMemo(() => {
    if (!selectedSeanceId) return seances[0] || null

    return (
      seances.find((item) => sameId(item.id, selectedSeanceId)) ||
      seances[0] ||
      null
    )
  }, [selectedSeanceId, seances])

  const cahier = useMemo(() => {
    if (!selectedSeance) return null

    return (
      backendCahiers.find((item) => sameId(item.seanceId, selectedSeance.id)) ||
      backendCahiers.find((item) => sameId(item.creneau_id, selectedSeance.id)) ||
      null
    )
  }, [backendCahiers, selectedSeance])

  const pointage = useMemo(() => {
    if (!selectedSeance) return null

    return getPointageForSeance({
      seance: selectedSeance,
      backendPointages,
      week,
      selectedWeek,
    })
  }, [backendPointages, selectedSeance, week, selectedWeek])

  useEffect(() => {
    if (!cahier) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      titre: cahier.titre || '',
      contenu: cahier.contenu || '',
      travaux: cahier.travaux || '',
      observation: cahier.observation || '',
    })
  }, [cahier, selectedSeance])

  const stats = useMemo(() => {
    const seanceIds = seances.map((item) => Number(item.id))

    const cahiersForFilter = backendCahiers.filter((item) =>
      seanceIds.includes(Number(item.seanceId || item.creneau_id)),
    )

    const pointagesForFilter = seances
      .map((seance) =>
        getPointageForSeance({
          seance,
          backendPointages,
          week,
          selectedWeek,
        }),
      )
      .filter(Boolean)

    return {
      seances: seances.length,
      pointages: pointagesForFilter.length,
      renseignes: cahiersForFilter.length,
      signesDelegue: cahiersForFilter.filter((item) => item.signatureDelegue)
        .length,
      clotures: cahiersForFilter.filter((item) => item.locked).length,
    }
  }, [seances, backendCahiers, backendPointages, week, selectedWeek])

  const canFillCurrent =
    selectedSeance &&
    !cahier?.locked &&
    (isAdminRole ||
      isTeacherRole ||
      isSurveillantRole ||
      canFillPermission ||
      canEditPermission ||
      canValidatePermission) &&
    (!isTeacherRole ||
      !teacherName ||
      selectedSeance.enseignant === teacherName ||
      selectedSeance.enseignant_email === user?.email)

  const canSignDelegue =
    selectedSeance &&
    cahier &&
    !cahier.signatureDelegue &&
    !cahier.locked &&
    (isDelegateRole || isAdminRole || canSignDeleguePermission) &&
    (!isDelegateRole || !delegateClass || classMatches(selectedSeance.classe, delegateClass))

  const canSignTeacher =
    selectedSeance &&
    cahier &&
    cahier.signatureDelegue &&
    !cahier.signatureEnseignant &&
    !cahier.locked &&
    (isTeacherRole || isAdminRole || canSignTeacherPermission) &&
    (!isTeacherRole ||
      !teacherName ||
      selectedSeance.enseignant === teacherName ||
      selectedSeance.enseignant_email === user?.email)

  const saveCahier = async () => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!canFillCurrent) {
      setMessage('Vous n’avez pas le droit de remplir ce cahier de texte.')
      return
    }

    if (cahier?.locked) {
      setMessage('Ce cahier est clôturé. Il ne peut plus être modifié.')
      return
    }

    if (!form.titre.trim() || !form.contenu.trim()) {
      setMessage('Le titre et le contenu de la séance sont obligatoires.')
      return
    }

    try {
      setSaving(true)
      setMessage('Enregistrement du cahier...')

      const res = await fetch(`${CAHIER_API_URL}?action=save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          creneau_id: Number(selectedSeance.id),
          titre: form.titre,
          contenu: form.contenu,
          travaux: form.travaux,
          observation: form.observation,
          created_by: user?.email || user?.nom || user?.name || 'system',
          updated_by: user?.email || user?.nom || user?.name || 'system',
        }),
      })

      const json = await parseJsonResponse(res, 'cahiers_texte.php')

      if (!json.success) {
        throw new Error(json.message || 'Erreur lors de l’enregistrement.')
      }

      upsertCahier(json.data?.cahier)
      notifyCahierUpdated()

      setSelectedSeanceId(Number(selectedSeance.id))
      setMessage('Cahier de texte enregistré avec succès.')
    } catch (err) {
      setMessage(err.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const signDelegue = async (signatureImage) => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli avant signature.')
      return
    }

    if (!canSignDelegue) {
      setMessage('Votre rôle ne permet pas de signer côté délégué.')
      return
    }

    if (!signatureImage) {
      setMessage('Veuillez dessiner la signature du délégué.')
      return
    }

    try {
      setSaving(true)
      setMessage('Enregistrement de la signature du délégué...')

      const res = await fetch(`${CAHIER_API_URL}?action=sign_delegue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          creneau_id: Number(selectedSeance.id),
          signature: signatureImage,
          updated_by: user?.email || user?.nom || user?.name || 'delegue',
        }),
      })

      const json = await parseJsonResponse(res, 'cahiers_texte.php')

      if (!json.success) {
        throw new Error(json.message || 'Erreur lors de la signature du délégué.')
      }

      upsertCahier(json.data?.cahier)
      notifyCahierUpdated()

      setSelectedSeanceId(Number(selectedSeance.id))
      setMessage('Signature du délégué enregistrée avec succès.')
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la signature du délégué.')
    } finally {
      setSaving(false)
    }
  }

  const signTeacher = async (signatureImage) => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli.')
      return
    }

    if (!canSignTeacher) {
      setMessage('Le délégué doit signer avant l’enseignant.')
      return
    }

    if (!signatureImage) {
      setMessage('Veuillez dessiner la signature de l’enseignant.')
      return
    }

    try {
      setSaving(true)
      setMessage('Enregistrement de la signature enseignant...')

      const res = await fetch(`${CAHIER_API_URL}?action=sign_enseignant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          creneau_id: Number(selectedSeance.id),
          signature: signatureImage,
          updated_by: user?.email || user?.nom || user?.name || 'enseignant',
        }),
      })

      const json = await parseJsonResponse(res, 'cahiers_texte.php')

      if (!json.success) {
        throw new Error(json.message || 'Erreur lors de la signature enseignant.')
      }

      upsertCahier(json.data?.cahier)
      notifyCahierUpdated()

      if (typeof actions.generateVacation === 'function') {
        actions.generateVacation(Number(selectedSeance.id))
      }

      setSelectedSeanceId(Number(selectedSeance.id))
      setMessage(
        'Signature enseignant enregistrée. Le cahier est clôturé et la vacation est générée.',
      )
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la signature enseignant.')
    } finally {
      setSaving(false)
    }
  }

  const upsertCahier = (nextCahier) => {
    if (!nextCahier) return

    setBackendCahiers((current) => {
      const filtered = current.filter(
        (item) =>
          !sameId(item.seanceId || item.creneau_id, nextCahier.seanceId || nextCahier.creneau_id),
      )

      return [nextCahier, ...filtered]
    })
  }

  const exportCahierPdf = () => {
    if (!selectedSeance || !cahier) {
      setMessage('Aucun cahier à exporter.')
      return
    }

    if (!canExportPdf) {
      setMessage('Votre rôle ne permet pas d’exporter ce cahier.')
      return
    }

    const contentHtml = `
      <div class="pdf-page">
        ${buildCardsHtml([
          { label: 'Semaine', value: week.label },
          { label: 'Classe', value: selectedSeance.classe },
          { label: 'Matière', value: selectedSeance.matiere },
          { label: 'Enseignant', value: selectedSeance.enseignant },
          { label: 'Jour', value: selectedSeance.jour },
          { label: 'Horaire', value: formatSlot(selectedSeance.horaire) },
          { label: 'Salle', value: selectedSeance.salle },
          { label: 'Pointage', value: pointage ? formatPointage(pointage.statut) : 'Non pointée' },
          { label: 'Statut', value: cahier.locked ? 'Clôturé' : 'Ouvert' },
          {
            label: 'Signatures',
            value:
              cahier.signatureDelegue && cahier.signatureEnseignant
                ? 'Complètes'
                : 'Incomplètes',
          },
        ])}

        <div class="pdf-section">
          <h2>Informations de la séance</h2>
          ${buildTableHtml(
            ['Champ', 'Contenu'],
            [
              ['Titre de la séance', cahier.titre || 'Non renseigné'],
              ['Contenu réalisé', cahier.contenu || 'Non renseigné'],
              ['Travaux demandés', cahier.travaux || 'Non renseigné'],
              ['Observations', cahier.observation || 'Aucune observation'],
            ],
          )}
        </div>

        <div class="pdf-section">
          <h2>Validation du cahier</h2>
          ${buildTableHtml(
            ['Acteur', 'Statut'],
            [
              [
                'Délégué de classe',
                cahier.signatureDelegue ? 'Signé' : 'En attente',
              ],
              [
                'Enseignant',
                cahier.signatureEnseignant ? 'Signé' : 'En attente',
              ],
              [
                'Verrouillage',
                cahier.locked ? 'Cahier clôturé' : 'Cahier ouvert',
              ],
            ],
          )}
        </div>

        <div class="pdf-section">
          <h2>Signatures</h2>
          ${buildSignaturesHtml([
            {
              label: 'Signature du délégué',
              image: cahier.signatureDelegueImage,
            },
            {
              label: 'Signature de l’enseignant',
              image: cahier.signatureEnseignantImage,
            },
          ])}
        </div>
      </div>
    `

    exportHtmlToPdf({
      title: 'Cahier de texte',
      subtitle: `${selectedSeance.classe} - ${selectedSeance.matiere}`,
      filename: makePdfFilename(
        `cahier-${selectedWeek}-${selectedSeance.classe}-${selectedSeance.matiere}.pdf`,
      ),
      contentHtml,
    })

    setMessage('PDF du cahier de texte généré.')
  }

  if (!canViewPage) {
    return (
      <div className="page cahier-page">
        <div className="page-heading">
          <div>
            <h1>Accès non autorisé</h1>
            <p>Votre rôle ne permet pas de consulter le cahier de texte.</p>
          </div>
        </div>

        <section className="panel cahier-empty-state">
          Cette page n’est pas disponible pour votre profil.
        </section>
      </div>
    )
  }

  return (
    <div className="page cahier-page">
      <div className="page-heading">
        <div>
          <h1>Cahier de texte</h1>
          <p>
            Suivi pédagogique synchronisé avec MySQL : séances, pointages,
            signatures et clôture.
          </p>
        </div>

        {selectedSeance && canFillCurrent && (
          <button className="primary-btn" onClick={saveCahier} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer le cahier'}
          </button>
        )}
      </div>

      <div className="cahier-role-note">
        <strong>{getRoleLabel(user)}</strong>
        <span>{getRoleDescription(role)}</span>
      </div>

      <div className="stats-grid">
        <StatBox label="Séances" value={stats.seances} code="SE" />
        <StatBox label="Pointées" value={stats.pointages} code="QR" />
        <StatBox label="Renseignés" value={stats.renseignes} code="CT" />
        <StatBox label="Clôturés" value={stats.clotures} code="OK" />
      </div>

      <div className="cahier-toolbar">
        <div className="isge-filter">
          <label>Semaine</label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value)
              setSelectedSeanceId(null)
              setMessage('')
            }}
          >
            {WEEK_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="isge-filter">
          <label>Classe</label>
          <select
            value={selectedClasse}
            disabled={isDelegateRole}
            onChange={(e) => {
              setSelectedClasse(e.target.value)
              setSelectedSeanceId(null)
              setMessage('')
            }}
          >
            {classes.map((classe) => (
              <option key={classe} value={classe}>
                {classe}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="isge-secondary-btn"
          onClick={() => {
            loadBackendPointages({ silent: false })
            loadBackendCahiers({ silent: false })
          }}
          disabled={pointageLoading}
        >
          {pointageLoading ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {loading && (
        <div className="cahier-message">Chargement des séances de la semaine...</div>
      )}

      {error && <div className="cahier-message error">{error}</div>}

      {message && <div className="cahier-message">{message}</div>}

      <div className="cahier-grid">
        <section className="panel large">
          <div className="panel-header">
            <h3>Séances</h3>
            <button>{seances.length} séance(s)</button>
          </div>

          <div className="cahier-session-list">
            {!loading && seances.length === 0 && (
              <div className="cahier-empty-state">
                Aucune séance disponible pour cette semaine ou ce filtre.
              </div>
            )}

            {seances.map((seance) => {
              const itemCahier =
                backendCahiers.find((item) =>
                  sameId(item.seanceId || item.creneau_id, seance.id),
                ) || null

              const itemPointage = getPointageForSeance({
                seance,
                backendPointages,
                week,
                selectedWeek,
              })

              return (
                <button
                  key={seance.id}
                  className={
                    selectedSeance?.id === seance.id
                      ? 'cahier-session-card active'
                      : 'cahier-session-card'
                  }
                  onClick={() => {
                    setSelectedSeanceId(seance.id)
                    setMessage('')
                  }}
                >
                  <div>
                    <strong>{seance.matiere}</strong>
                    <span>
                      {seance.classe} • {seance.jour} •{' '}
                      {formatSlot(seance.horaire)}
                    </span>
                    <small>
                      {seance.enseignant} — {seance.salle}
                    </small>
                  </div>

                  <div className="cahier-badges">
                    <CahierStatus cahier={itemCahier} />
                    <PointageStatus pointage={itemPointage} />
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="panel cahier-editor-panel">
          <div className="panel-header">
            <h3>Détails du cahier</h3>
            <button>{cahier ? formatCahierStatus(cahier) : 'Non renseigné'}</button>
          </div>

          {!selectedSeance ? (
            <div className="cahier-empty-state">
              Sélectionnez une séance pour remplir ou consulter le cahier.
            </div>
          ) : (
            <>
              <div className="cahier-selected-info">
                <strong>{selectedSeance.matiere}</strong>
                <span>{selectedSeance.classe}</span>
                <small>
                  {selectedSeance.jour} • {formatSlot(selectedSeance.horaire)} •{' '}
                  {selectedSeance.salle}
                </small>
              </div>

              <div className="cahier-status-line">
                <div>
                  <span>Pointage</span>
                  <strong>{pointage ? formatPointage(pointage.statut) : 'Non pointée'}</strong>
                </div>

                <div>
                  <span>Délégué</span>
                  <strong>{cahier?.signatureDelegue ? 'Signé' : 'En attente'}</strong>
                </div>

                <div>
                  <span>Enseignant</span>
                  <strong>
                    {cahier?.signatureEnseignant ? 'Signé' : 'En attente'}
                  </strong>
                </div>

                <div>
                  <span>Verrouillage</span>
                  <strong>{cahier?.locked ? 'Clôturé' : 'Ouvert'}</strong>
                </div>
              </div>

              <div className="cahier-signature-grid">
                <SignatureBox
                  title="Délégué de classe"
                  subtitle="Signature côté classe"
                  signed={!!cahier?.signatureDelegue}
                  image={cahier?.signatureDelegueImage}
                  canSign={!!canSignDelegue}
                  disabled={saving}
                  blockedText={
                    !cahier
                      ? 'Cahier non renseigné'
                      : cahier.locked
                        ? 'Cahier clôturé'
                        : 'Signature en attente'
                  }
                  onSign={signDelegue}
                />

                <SignatureBox
                  title="Enseignant"
                  subtitle="Validation pédagogique"
                  signed={!!cahier?.signatureEnseignant}
                  image={cahier?.signatureEnseignantImage}
                  canSign={!!canSignTeacher}
                  disabled={saving}
                  blockedText={
                    !cahier
                      ? 'Cahier non renseigné'
                      : !cahier.signatureDelegue
                        ? 'Signature délégué requise'
                        : cahier.locked
                          ? 'Cahier clôturé'
                          : 'Signature en attente'
                  }
                  onSign={signTeacher}
                />
              </div>

              <div className="cahier-form">
                <div className="cahier-form-group">
                  <label>Titre de la séance</label>
                  <input
                    value={form.titre}
                    disabled={!canFillCurrent || saving}
                    placeholder="Ex : Introduction aux formulaires HTML"
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        titre: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="cahier-form-group">
                  <label>Contenu réalisé</label>
                  <textarea
                    value={form.contenu}
                    disabled={!canFillCurrent || saving}
                    placeholder="Décris les points vus pendant la séance..."
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        contenu: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="cahier-form-group">
                  <label>Travaux demandés</label>
                  <textarea
                    value={form.travaux}
                    disabled={!canFillCurrent || saving}
                    placeholder="Exercices, recherches ou devoirs donnés..."
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        travaux: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="cahier-form-group">
                  <label>Observations</label>
                  <textarea
                    value={form.observation}
                    disabled={!canFillCurrent || saving}
                    placeholder="Retard, absence, progression, remarques..."
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        observation: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="cahier-actions">
                {canFillCurrent && (
                  <button className="primary-btn" onClick={saveCahier} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                )}

                {cahier && canExportPdf && (
                  <button className="isge-secondary-btn" onClick={exportCahierPdf}>
                    Exporter PDF
                  </button>
                )}

                {!canFillCurrent &&
                  !canSignDelegue &&
                  !canSignTeacher && (
                    <div className="cahier-readonly">
                      Consultation uniquement pour ce rôle ou étape de signature
                      non disponible.
                    </div>
                  )}

                {cahier?.locked && (
                  <div className="cahier-locked">
                    Cahier clôturé : modification impossible.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function SignatureBox({
  title,
  subtitle,
  signed,
  image,
  canSign,
  blockedText,
  disabled,
  onSign,
}) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canSign || signed || disabled) return

    const canvas = canvasRef.current
    if (!canvas) return

    const timer = setTimeout(() => {
      prepareCanvas(canvas)
    }, 80)

    return () => clearTimeout(timer)
  }, [canSign, signed, disabled])

  const startDrawing = (event) => {
    if (!canSign || signed || disabled) return

    event.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = getCanvasPoint(event, canvas)

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)

    setIsDrawing(true)
    setHasInk(true)
    setError('')
  }

  const draw = (event) => {
    if (!isDrawing || !canSign || signed || disabled) return

    event.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = getCanvasPoint(event, canvas)

    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    prepareCanvas(canvas)
    setHasInk(false)
    setError('')
  }

  const submitSignature = () => {
    if (disabled) return

    if (!hasInk) {
      setError('Dessinez la signature avant de valider.')
      return
    }

    const canvas = canvasRef.current
    const imageData = canvas.toDataURL('image/png')

    onSign(imageData)
  }

  return (
    <div className={signed ? 'signature-box signed' : 'signature-box'}>
      <div>
        <span>{subtitle}</span>
        <strong>{title}</strong>
      </div>

      <div className="signature-area">
        {signed ? (
          image ? (
            <img className="signature-image" src={image} alt={`Signature ${title}`} />
          ) : (
            <span className="signature-written">Signé</span>
          )
        ) : canSign && !disabled ? (
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        ) : (
          <span className="signature-empty">{blockedText || 'Signature en attente'}</span>
        )}
      </div>

      {error && <div className="signature-error">{error}</div>}

      {canSign && !signed && !disabled && (
        <div className="signature-tools">
          <button type="button" className="cahier-sign-btn" onClick={submitSignature}>
            Valider la signature
          </button>

          <button type="button" className="signature-clear-btn" onClick={clearSignature}>
            Effacer
          </button>
        </div>
      )}
    </div>
  )
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1

  canvas.width = Math.max(1, rect.width * ratio)
  canvas.height = Math.max(1, rect.height * ratio)

  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#0f172a'
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect()
  const source = event.touches ? event.touches[0] : event

  return {
    x: source.clientX - rect.left,
    y: source.clientY - rect.top,
  }
}

function StatBox({ label, value, code }) {
  return (
    <div className="stat-card">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>Cahier de texte</span>
      </div>

      <div className="stat-icon">{code}</div>
    </div>
  )
}

function CahierStatus({ cahier }) {
  return (
    <div className={`cahier-status ${getCahierStatusClass(cahier)}`}>
      {cahier ? formatCahierStatus(cahier) : 'Non renseigné'}
    </div>
  )
}

function PointageStatus({ pointage }) {
  return (
    <div className={`pointage-mini ${pointage?.statut || 'non_pointe'}`}>
      {pointage ? formatPointage(pointage.statut) : 'Non pointée'}
    </div>
  )
}

function getRoleDescription(role) {
  const descriptions = {
    admin:
      'Vous pouvez consulter, corriger et valider tous les cahiers de texte.',
    administrateur:
      'Vous pouvez consulter, corriger et valider tous les cahiers de texte.',
    delegue:
      'Vous consultez les séances de votre classe et signez côté classe.',
    enseignant:
      'Vous voyez vos cours, remplissez ou vérifiez le contenu, puis signez pour clôturer.',
    surveillant:
      'Vous contrôlez les cahiers renseignés, signés ou en attente.',
    comptable:
      'Vous consultez les cahiers clôturés utiles aux fiches de vacation.',
  }

  return descriptions[role] || 'Accès limité au cahier de texte.'
}

function formatCahierStatus(cahier) {
  if (!cahier) return 'Non renseigné'
  if (cahier.locked) return 'Clôturé'
  if (cahier.signatureDelegue && !cahier.signatureEnseignant) {
    return 'Signé délégué'
  }
  if (cahier.signatureEnseignant) return 'Signé enseignant'

  return 'Brouillon'
}

function getCahierStatusClass(cahier) {
  if (!cahier) return 'none'
  if (cahier.locked) return 'locked'
  if (cahier.signatureDelegue) return 'delegue'

  return 'draft'
}

function formatPointage(status) {
  const labels = {
    present: 'Présent',
    retard: 'Retard',
    absent: 'Absent',
    non_pointe: 'Non pointée',
  }

  return labels[status] || status || 'Non pointée'
}

function getWeek(weekKey) {
  return WEEK_OPTIONS.find((item) => item.key === weekKey) || WEEK_OPTIONS[0]
}

function getPointageForSeance({ seance, backendPointages, week, selectedWeek }) {
  if (!seance) return null

  const expectedDate = getDateForSeance(week, selectedWeek, seance.jour)

  const fromBackend =
    backendPointages.find((item) => {
      const itemSeanceId =
        item.seanceId || item.seance_id || item.creneau_id || item.creneauId

      const itemDate = item.date_cours || item.date || item.dateCours || ''

      const sameSeance = sameId(itemSeanceId, seance.id)
      const sameDate = expectedDate ? itemDate === expectedDate : true

      return sameSeance && sameDate
    }) ||
    backendPointages.find((item) => {
      const itemSeanceId =
        item.seanceId || item.seance_id || item.creneau_id || item.creneauId

      return sameId(itemSeanceId, seance.id)
    }) ||
    null

  if (fromBackend) {
    return {
      ...fromBackend,
      seanceId:
        fromBackend.seanceId ||
        fromBackend.seance_id ||
        fromBackend.creneau_id ||
        fromBackend.creneauId,
      statut: fromBackend.statut || fromBackend.status || 'present',
    }
  }

  return null
}

function getDateForSeance(week, selectedWeek, jour) {
  const fromWeek = week?.days?.find((day) => day.key === jour)
  const directDate = fromWeek?.date || fromWeek?.isoDate

  if (directDate) return directDate

  const dayIndex = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].indexOf(jour)

  if (dayIndex < 0) return null

  const monday = new Date(`${selectedWeek}T00:00:00`)

  if (Number.isNaN(monday.getTime())) return null

  monday.setDate(monday.getDate() + dayIndex)

  const offset = monday.getTimezoneOffset()
  const local = new Date(monday.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 10)
}

async function parseJsonResponse(res, sourceName) {
  const text = await res.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Réponse ${sourceName} invalide : ${text.slice(0, 180)}`)
  }
}

function notifyCahierUpdated() {
  const value = String(Date.now())

  try {
    localStorage.setItem('eduschedule_cahier_updated_at', value)
  } catch {
    // Ignore localStorage errors.
  }

  window.dispatchEvent(new CustomEvent('eduschedule-cahier-updated'))
}

function normalizeRole(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeClassName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/réseaux/g, 'reseaux')
    .replace(/securite/g, 'securite')
    .replace(/informatique/g, 'informatique')
    .replace(/\s+/g, ' ')
}

function classMatches(a, b) {
  const left = normalizeClassName(a)
  const right = normalizeClassName(b)

  if (!left || !right) return false
  if (left === right) return true

  const aliases = [
    ['master 1 rsi', 'master 1 reseaux et securite informatique'],
    ['master 2 rsi', 'master 2 reseaux et securite informatique'],
    ['m1 rsi', 'master 1 reseaux et securite informatique'],
    ['m2 rsi', 'master 2 reseaux et securite informatique'],
    ['licence 1 rit', 'l1 rit'],
    ['licence 2 rit', 'l2 rit'],
    ['licence 3 rit', 'l3 rit'],
  ]

  return aliases.some(([shortName, longName]) => {
    return (
      (left === shortName && right === longName) ||
      (left === longName && right === shortName)
    )
  })
}

function sameId(a, b) {
  return String(a) === String(b) || Number(a) === Number(b)
}

function makePdfFilename(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
}

export default CahierTextePage