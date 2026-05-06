import { useEffect, useMemo, useState } from 'react'
import './EmploiTempsISGE.css'
import {
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'
import { exportHtmlToPdf } from '../services/pdfExport'

const API_BASE = 'http://localhost/EduSchedule-Pro/backend/api'

const EMPTY_FORM = {
  classe: '',
  matiere: '',
  enseignant: '',
  jour: 'Lundi',
  horaire: '',
  salle: '',
  type: 'cours',
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function EmploiTempsISGE({ user }) {
  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    role === 'delegue' && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedTeacher, setSelectedTeacher] = useState(
    role === 'enseignant' && teacherName ? teacherName : 'Tous',
  )

  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [apiData, setApiData] = useState({
    seances: [],
    classes: [],
    enseignants: [],
    matieres: [],
    salles: [],
    horaires: [],
  })

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

  const canManage = role === 'admin'

  const loadSchedule = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${API_BASE}/schedule.php?action=list`, {
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
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        throw new Error(json.message || 'Erreur lors du chargement.')
      }

      setApiData({
        seances: json.data?.seances || [],
        classes: json.data?.classes || [],
        enseignants: json.data?.enseignants || [],
        matieres: json.data?.matieres || [],
        salles: json.data?.salles || [],
        horaires: json.data?.horaires || [],
      })
    } catch (err) {
      setError(err.message || 'Impossible de charger l’emploi du temps.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  const classes = useMemo(() => {
    const names = uniqueValues(apiData.classes.map((item) => item.nom))
    return ['Toutes', ...names]
  }, [apiData.classes])

  const teachers = useMemo(() => {
    const names = uniqueValues(
      apiData.enseignants.map(
        (item) => item.nom_complet || `${item.nom} ${item.prenom}`,
      ),
    )

    return ['Tous', ...names]
  }, [apiData.enseignants])

  const subjects = useMemo(() => {
    const selectedClass = apiData.classes.find(
      (item) => item.nom === form.classe,
    )

    const filtered = apiData.matieres.filter((item) => {
      if (!selectedClass) return true
      return Number(item.classe_id) === Number(selectedClass.id)
    })

    return uniqueValues(filtered.map((item) => item.nom))
  }, [apiData.matieres, apiData.classes, form.classe])

  const rooms = useMemo(() => {
    return uniqueValues(apiData.salles.map((item) => item.nom))
  }, [apiData.salles])

  const horaires = useMemo(() => {
    const all = uniqueValues(apiData.horaires.map((item) => item.label))
    return sortHoraires(all)
  }, [apiData.horaires])

  const filteredSeances = useMemo(() => {
    return (apiData.seances || [])
      .filter((seance) => {
        if (role === 'enseignant' && teacherName) {
          return (
            seance.enseignant === teacherName ||
            seance.enseignant_email === user?.email
          )
        }

        if (role === 'delegue' && delegateClass) {
          return seance.classe === delegateClass
        }

        return true
      })
      .filter((seance) =>
        selectedClasse === 'Toutes' ? true : seance.classe === selectedClasse,
      )
      .filter((seance) =>
        selectedTeacher === 'Tous'
          ? true
          : seance.enseignant === selectedTeacher,
      )
      .sort((a, b) => {
        const dayA = DAYS.indexOf(a.jour)
        const dayB = DAYS.indexOf(b.jour)

        if (dayA !== dayB) return dayA - dayB

        return compareHoraire(a.horaire, b.horaire)
      })
  }, [
    apiData.seances,
    selectedClasse,
    selectedTeacher,
    role,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const visibleClasses = useMemo(() => {
    const filteredClassNames = uniqueValues(
      filteredSeances.map((item) => item.classe),
    )

    if (selectedClasse !== 'Toutes') {
      return [selectedClasse]
    }

    if (selectedTeacher !== 'Tous' || role === 'enseignant') {
      return filteredClassNames
    }

    return uniqueValues(apiData.classes.map((item) => item.nom))
  }, [
    filteredSeances,
    selectedClasse,
    selectedTeacher,
    role,
    apiData.classes,
  ])

  const visibleHoraires = useMemo(() => {
    const used = uniqueValues(filteredSeances.map((item) => item.horaire))
    const merged = uniqueValues([...horaires, ...used])

    return sortHoraires(merged)
  }, [filteredSeances, horaires])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateClasseInForm = (classeName) => {
    const selectedClass = apiData.classes.find(
      (classe) => classe.nom === classeName,
    )

    const firstSubject =
      apiData.matieres.find((item) => item.classe === classeName)?.nom ||
      apiData.matieres.find(
        (item) => selectedClass && Number(item.classe_id) === Number(selectedClass.id),
      )?.nom ||
      ''

    setForm((current) => ({
      ...current,
      classe: classeName,
      matiere: firstSubject,
    }))
  }

  const resetFilters = () => {
    setSelectedWeek(DEFAULT_WEEK_KEY)
    setSelectedClasse(role === 'delegue' && delegateClass ? delegateClass : 'Toutes')
    setSelectedTeacher(role === 'enseignant' && teacherName ? teacherName : 'Tous')
    setMessage('')
  }

  const openAddForm = () => {
    if (!canManage) {
      setMessage('Seul l’administrateur peut ajouter une séance.')
      return
    }

    const firstClass =
      selectedClasse !== 'Toutes'
        ? selectedClasse
        : apiData.classes[0]?.nom || ''

    const selectedClass = apiData.classes.find(
      (classe) => classe.nom === firstClass,
    )

    const firstTeacher =
      selectedTeacher !== 'Tous'
        ? selectedTeacher
        : teachers.find((item) => item !== 'Tous') || ''

    const firstSubject =
      apiData.matieres.find((item) => item.classe === firstClass)?.nom ||
      apiData.matieres.find(
        (item) => selectedClass && Number(item.classe_id) === Number(selectedClass.id),
      )?.nom ||
      ''

    setForm({
      classe: firstClass,
      matiere: firstSubject,
      enseignant: firstTeacher,
      jour: week.days[0]?.key || 'Lundi',
      horaire: horaires[0] || '07h30-09h30',
      salle: rooms[0] || '',
      type: 'cours',
    })

    setShowForm(true)
    setMessage('')
  }

  const submitSeance = async () => {
    if (!canManage) {
      setMessage('Action non autorisée.')
      return
    }

    if (
      !form.classe ||
      !form.matiere ||
      !form.enseignant ||
      !form.jour ||
      !form.horaire ||
      !form.salle
    ) {
      setMessage('Tous les champs de la séance sont obligatoires.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/schedule.php?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        setMessage(json.message || 'Impossible d’ajouter la séance.')
        return
      }

      setShowForm(false)
      setMessage('Séance ajoutée avec succès.')
      await loadSchedule()
    } catch (err) {
      setMessage(err.message || 'Erreur lors de l’ajout de la séance.')
    }
  }

  const deleteSeance = async (seanceId) => {
    if (!canManage) {
      setMessage('Seul l’administrateur peut supprimer une séance.')
      return
    }

    const confirmed = window.confirm('Supprimer cette séance ?')

    if (!confirmed) return

    try {
      const res = await fetch(`${API_BASE}/schedule.php?action=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: seanceId }),
      })

      const text = await res.text()

      let json

      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`Réponse API invalide : ${text.slice(0, 180)}`)
      }

      if (!json.success) {
        setMessage(json.message || 'Impossible de supprimer la séance.')
        return
      }

      setMessage('Séance supprimée.')
      await loadSchedule()
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la suppression.')
    }
  }

  const getSeancesForCell = (classe, jour, horaire) => {
    return filteredSeances.filter(
      (seance) =>
        seance.classe === classe &&
        seance.jour === jour &&
        seance.horaire === horaire,
    )
  }

  const exportSchedulePdf = () => {
    const contentHtml = `
      ${visibleClasses
        .map(
          (classe) => `
            <div class="pdf-page">
              ${buildClassSchedulePdf(
                classe,
                week,
                visibleHoraires,
                getSeancesForCell,
              )}
            </div>
          `,
        )
        .join('')}
    `

    exportHtmlToPdf({
      title: 'Emploi du temps',
      subtitle: week.label,
      filename: `emploi-du-temps-${selectedWeek}.pdf`,
      contentHtml,
    })

    setMessage('PDF de l’emploi du temps généré.')
  }

  return (
    <div className="page emploi-page">
      <div className="page-heading">
        <div>
          <h1>Emploi du temps</h1>
          <p>
            Données chargées depuis MySQL : classes, professeurs, modules,
            salles et horaires.
          </p>
        </div>

        {canManage && (
          <button className="primary-btn" onClick={openAddForm}>
            + Nouvelle séance
          </button>
        )}
      </div>

      <div className="emploi-toolbar">
        <div className="isge-filter">
          <label>Classe</label>
          <select
            value={selectedClasse}
            disabled={role === 'delegue'}
            onChange={(e) => {
              setSelectedClasse(e.target.value)
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

        <div className="isge-filter">
          <label>Professeur</label>
          <select
            value={selectedTeacher}
            disabled={role === 'enseignant'}
            onChange={(e) => {
              setSelectedTeacher(e.target.value)
              setMessage('')
            }}
          >
            {teachers.map((teacher) => (
              <option key={teacher} value={teacher}>
                {teacher === 'Tous' ? 'Tous les professeurs' : teacher}
              </option>
            ))}
          </select>
        </div>

        <div className="isge-filter">
          <label>Semaine</label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value)
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

        <button className="isge-secondary-btn" onClick={resetFilters}>
          Réinitialiser
        </button>

        <button className="isge-secondary-btn pdf-btn" onClick={exportSchedulePdf}>
          Exporter PDF
        </button>
      </div>

      {loading && <div className="emploi-message">Chargement depuis MySQL...</div>}

      {error && <div className="emploi-message error">{error}</div>}

      {message && <div className="emploi-message">{message}</div>}

      {showForm && (
        <section className="panel emploi-form-panel">
          <div className="panel-header">
            <h3>Nouvelle séance</h3>
            <button onClick={() => setShowForm(false)}>Fermer</button>
          </div>

          <div className="emploi-form-grid">
            <div className="isge-filter">
              <label>Classe</label>
              <select
                value={form.classe}
                onChange={(e) => updateClasseInForm(e.target.value)}
              >
                <option value="">Choisir une classe</option>
                {apiData.classes.map((classe) => (
                  <option key={classe.id} value={classe.nom}>
                    {classe.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Matière</label>
              <select
                value={form.matiere}
                onChange={(e) => updateForm('matiere', e.target.value)}
              >
                <option value="">Choisir une matière</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Professeur</label>
              <select
                value={form.enseignant}
                onChange={(e) => updateForm('enseignant', e.target.value)}
              >
                <option value="">Choisir un professeur</option>
                {teachers
                  .filter((teacher) => teacher !== 'Tous')
                  .map((teacher) => (
                    <option key={teacher} value={teacher}>
                      {teacher}
                    </option>
                  ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Jour</label>
              <select
                value={form.jour}
                onChange={(e) => updateForm('jour', e.target.value)}
              >
                {week.days.map((day) => (
                  <option key={day.key} value={day.key}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Horaire</label>
              <select
                value={form.horaire}
                onChange={(e) => updateForm('horaire', e.target.value)}
              >
                <option value="">Choisir un horaire</option>
                {horaires.map((horaire) => (
                  <option key={horaire} value={horaire}>
                    {formatSlot(horaire)}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Salle</label>
              <select
                value={form.salle}
                onChange={(e) => updateForm('salle', e.target.value)}
              >
                <option value="">Choisir une salle</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                <option value="cours">Cours</option>
                <option value="td">TD</option>
                <option value="tp">TP</option>
              </select>
            </div>
          </div>

          <div className="emploi-form-actions">
            <button className="primary-btn" onClick={submitSeance}>
              Ajouter la séance
            </button>

            <button className="isge-secondary-btn" onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </section>
      )}

      <div className="emploi-class-list">
        {visibleClasses.map((classe) => (
          <ClassScheduleTable
            key={classe}
            classe={classe}
            week={week}
            horaires={visibleHoraires}
            canManage={canManage}
            getSeancesForCell={getSeancesForCell}
            onDelete={deleteSeance}
          />
        ))}

        {!loading && visibleClasses.length === 0 && (
          <section className="panel emploi-empty-panel">
            Aucun emploi du temps disponible pour ce filtre.
          </section>
        )}
      </div>
    </div>
  )
}

function ClassScheduleTable({
  classe,
  week,
  horaires,
  canManage,
  getSeancesForCell,
  onDelete,
}) {
  return (
    <section className="panel emploi-class-board">
      <div className="emploi-class-header">
        <div>
          <span>Emploi du temps</span>
          <h2>{classe}</h2>
        </div>

        <div className="emploi-class-badge">{week.label}</div>
      </div>

      <div className="emploi-table-wrap">
        <table className="emploi-table">
          <thead>
            <tr>
              <th>Horaire</th>
              {week.days.map((day) => (
                <th key={day.key}>{day.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {horaires.map((horaire) => (
              <tr key={`${classe}-${horaire}`}>
                <td className="horaire-cell">{formatSlot(horaire)}</td>

                {week.days.map((day) => {
                  const seances = getSeancesForCell(classe, day.key, horaire)

                  return (
                    <td key={`${classe}-${day.key}-${horaire}`}>
                      <div className="emploi-cell-stack">
                        {seances.map((seance) => (
                          <div key={seance.id} className="emploi-course-card">
                            <strong>{seance.matiere}</strong>
                            <small>{seance.enseignant}</small>
                            <small>{seance.salle}</small>
                            <em>{seance.type?.toUpperCase() || 'COURS'}</em>

                            {canManage && (
                              <button onClick={() => onDelete(seance.id)}>
                                Supprimer
                              </button>
                            )}
                          </div>
                        ))}

                        {seances.length === 0 && (
                          <div className="emploi-empty-cell">—</div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function buildClassSchedulePdf(classe, week, horaires, getSeancesForCell) {
  return `
    <style>
      .pdf-class-block {
        margin-top: 8px;
      }

      .pdf-class-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        padding: 12px 16px;
        border-radius: 14px;
        background: #f4f0ff;
        color: #312e81;
      }

      .pdf-class-title strong {
        font-size: 20px;
        font-weight: 900;
      }

      .pdf-class-title span {
        font-size: 12px;
        font-weight: 800;
        color: #4f46e5;
      }

      .pdf-schedule-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 10.5px;
      }

      .pdf-schedule-table th {
        background: #eef2ff;
        color: #3730a3;
        text-align: center;
        font-size: 10px;
        font-weight: 900;
        padding: 8px;
        border: 1px solid #dbe3f1;
      }

      .pdf-schedule-table td {
        height: 70px;
        padding: 7px;
        border: 1px solid #e5e7eb;
        vertical-align: top;
        background: #ffffff;
      }

      .pdf-schedule-table .time-cell {
        width: 92px;
        background: #f8fafc;
        color: #0f172a;
        font-weight: 900;
        text-align: center;
      }

      .pdf-course {
        padding: 7px 8px;
        border-left: 4px solid #4f46e5;
        border-radius: 10px;
        background: #f8fafc;
        margin-bottom: 5px;
      }

      .pdf-course strong {
        display: block;
        color: #0f172a;
        font-size: 10.5px;
        line-height: 1.25;
        font-weight: 900;
      }

      .pdf-course span {
        display: block;
        margin-top: 3px;
        color: #475569;
        font-size: 9px;
        line-height: 1.2;
        font-weight: 700;
      }

      .pdf-course small {
        display: block;
        margin-top: 3px;
        color: #4f46e5;
        font-size: 8.5px;
        line-height: 1.2;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pdf-empty {
        color: #cbd5e1;
        text-align: center;
        font-weight: 900;
      }
    </style>

    <div class="pdf-class-block">
      <div class="pdf-class-title">
        <strong>${escapeHtml(classe)}</strong>
        <span>${escapeHtml(week.label)}</span>
      </div>

      <table class="pdf-schedule-table">
        <thead>
          <tr>
            <th>Horaire</th>
            ${week.days.map((day) => `<th>${escapeHtml(day.label)}</th>`).join('')}
          </tr>
        </thead>

        <tbody>
          ${horaires.map((horaire) => {
            return `
              <tr>
                <td class="time-cell">${escapeHtml(formatSlot(horaire))}</td>
                ${week.days
                  .map((day) => {
                    const seances = getSeancesForCell(classe, day.key, horaire)

                    return `
                      <td>
                        ${
                          seances.length > 0
                            ? seances
                                .map(
                                  (seance) => `
                                    <div class="pdf-course">
                                      <strong>${escapeHtml(seance.matiere)}</strong>
                                      <span>${escapeHtml(seance.enseignant)}</span>
                                      <span>${escapeHtml(seance.salle)}</span>
                                      <small>${escapeHtml(
                                        seance.type?.toUpperCase() || 'COURS',
                                      )}</small>
                                    </div>
                                  `,
                                )
                                .join('')
                            : '<div class="pdf-empty">—</div>'
                        }
                      </td>
                    `
                  })
                  .join('')}
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function compareHoraire(a, b) {
  return getHoraireStart(a) - getHoraireStart(b)
}

function sortHoraires(values) {
  return [...values].sort(compareHoraire)
}

function getHoraireStart(value) {
  const match = String(value || '').match(/^(\d{1,2})h?(\d{2})?/)
  if (!match) return 9999

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)

  return hours * 60 + minutes
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default EmploiTempsISGE