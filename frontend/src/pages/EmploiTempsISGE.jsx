import { useMemo, useState } from 'react'
import './EmploiTempsISGE.css'
import {
  DEFAULT_CLASSES,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'
import { exportHtmlToPdf } from '../services/pdfExport'

const EMPTY_FORM = {
  classe: 'Licence 1 RIT',
  matiere: 'Programmation Web',
  enseignant: 'TRAORE Jean',
  jour: 'Lundi',
  horaire: '07h30-09h30',
  salle: 'A101',
  type: 'cours',
}

const HORAIRES = [
  '07h30-09h30',
  '10h00-12h15',
  '13h00-16h00',
  '15h00-18h00',
]

function EmploiTempsISGE({ user }) {
  const { store, actions } = useAppStore()

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

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

  const canManage = role === 'admin'

  const seancesData = store.seances || []

  const classes = useMemo(() => {
    const unique = [
      ...new Set([
        ...DEFAULT_CLASSES,
        ...seancesData.map((item) => item.classe).filter(Boolean),
      ]),
    ]

    return ['Toutes', ...unique]
  }, [seancesData])

  const teachers = useMemo(() => {
    const unique = [
      ...new Set(seancesData.map((item) => item.enseignant).filter(Boolean)),
    ]

    return ['Tous', ...unique]
  }, [seancesData])

  const subjects = useMemo(() => {
    return [
      ...new Set(seancesData.map((item) => item.matiere).filter(Boolean)),
    ]
  }, [seancesData])

  const rooms = useMemo(() => {
    return [
      ...new Set(seancesData.map((item) => item.salle).filter(Boolean)),
    ]
  }, [seancesData])

  const filteredSeances = useMemo(() => {
    return seancesData
      .filter((seance) => seance.weekKey === selectedWeek)
      .filter((seance) => {
        if (role === 'enseignant' && teacherName) {
          return seance.enseignant === teacherName
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
        const dayA = week.days.findIndex((day) => day.key === a.jour)
        const dayB = week.days.findIndex((day) => day.key === b.jour)

        if (dayA !== dayB) return dayA - dayB

        return a.horaire.localeCompare(b.horaire)
      })
  }, [
    seancesData,
    selectedWeek,
    selectedClasse,
    selectedTeacher,
    role,
    teacherName,
    delegateClass,
    week.days,
  ])

  const visibleClasses = useMemo(() => {
    const filteredClassNames = [
      ...new Set(filteredSeances.map((item) => item.classe).filter(Boolean)),
    ]

    if (selectedClasse !== 'Toutes') {
      return [selectedClasse]
    }

    if (selectedTeacher !== 'Tous' || role === 'enseignant') {
      return filteredClassNames
    }

    const extraClasses = filteredClassNames.filter(
      (classe) => !DEFAULT_CLASSES.includes(classe),
    )

    return [...DEFAULT_CLASSES, ...extraClasses]
  }, [filteredSeances, selectedClasse, selectedTeacher, role])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
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

    setForm({
      ...EMPTY_FORM,
      classe:
        selectedClasse !== 'Toutes'
          ? selectedClasse
          : EMPTY_FORM.classe,
      enseignant:
        selectedTeacher !== 'Tous'
          ? selectedTeacher
          : EMPTY_FORM.enseignant,
      jour: week.days[0]?.key || 'Lundi',
    })

    setShowForm(true)
    setMessage('')
  }

  const hasConflict = (payload) => {
    return seancesData.some((seance) => {
      if (seance.weekKey !== payload.weekKey) return false
      if (seance.jour !== payload.jour) return false
      if (seance.horaire !== payload.horaire) return false

      const sameRoom = seance.salle === payload.salle
      const sameTeacher = seance.enseignant === payload.enseignant
      const sameClass = seance.classe === payload.classe

      return sameRoom || sameTeacher || sameClass
    })
  }

  const submitSeance = () => {
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

    const payload = {
      ...form,
      weekKey: selectedWeek,
      type: form.type || 'cours',
    }

    if (hasConflict(payload)) {
      setMessage(
        'Conflit détecté : même classe, même professeur ou même salle sur ce créneau.',
      )
      return
    }

    if (actions.addSeance) {
      const result = actions.addSeance(payload)

      if (result && result.success === false) {
        setMessage(result.message || 'Impossible d’ajouter la séance.')
        return
      }
    } else if (actions.createSeance) {
      const result = actions.createSeance(payload)

      if (result && result.success === false) {
        setMessage(result.message || 'Impossible d’ajouter la séance.')
        return
      }
    } else {
      setMessage('Action addSeance introuvable dans appStore.')
      return
    }

    setShowForm(false)
    setMessage('Séance ajoutée avec succès.')
  }

  const deleteSeance = (seanceId) => {
    if (!canManage) {
      setMessage('Seul l’administrateur peut supprimer une séance.')
      return
    }

    const confirmed = window.confirm('Supprimer cette séance ?')

    if (!confirmed) return

    if (actions.deleteSeance) {
      const result = actions.deleteSeance(seanceId)

      if (result && result.success === false) {
        setMessage(result.message || 'Impossible de supprimer la séance.')
        return
      }
    } else if (actions.removeSeance) {
      const result = actions.removeSeance(seanceId)

      if (result && result.success === false) {
        setMessage(result.message || 'Impossible de supprimer la séance.')
        return
      }
    } else {
      setMessage('Action deleteSeance introuvable dans appStore.')
      return
    }

    setMessage('Séance supprimée.')
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
              ${buildClassSchedulePdf(classe, week, getSeancesForCell)}
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
            Vue hebdomadaire par classe, jour et horaire.
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
                onChange={(e) => updateForm('classe', e.target.value)}
              >
                {DEFAULT_CLASSES.map((classe) => (
                  <option key={classe} value={classe}>
                    {classe}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Matière</label>
              <input
                value={form.matiere}
                list="matiere-list"
                onChange={(e) => updateForm('matiere', e.target.value)}
              />
              <datalist id="matiere-list">
                {subjects.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </div>

            <div className="isge-filter">
              <label>Professeur</label>
              <input
                value={form.enseignant}
                list="teacher-list"
                onChange={(e) => updateForm('enseignant', e.target.value)}
              />
              <datalist id="teacher-list">
                {teachers
                  .filter((teacher) => teacher !== 'Tous')
                  .map((teacher) => (
                    <option key={teacher} value={teacher} />
                  ))}
              </datalist>
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
                {HORAIRES.map((horaire) => (
                  <option key={horaire} value={horaire}>
                    {formatSlot(horaire)}
                  </option>
                ))}
              </select>
            </div>

            <div className="isge-filter">
              <label>Salle</label>
              <input
                value={form.salle}
                list="room-list"
                onChange={(e) => updateForm('salle', e.target.value)}
              />
              <datalist id="room-list">
                {rooms.map((room) => (
                  <option key={room} value={room} />
                ))}
              </datalist>
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
                <option value="examen">Examen</option>
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
            canManage={canManage}
            getSeancesForCell={getSeancesForCell}
            onDelete={deleteSeance}
          />
        ))}

        {visibleClasses.length === 0 && (
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

        <div className="emploi-class-badge">
          {week.label}
        </div>
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
            {HORAIRES.map((horaire) => (
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

function buildClassSchedulePdf(classe, week, getSeancesForCell) {
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
        height: 82px;
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
          ${HORAIRES.map((horaire) => {
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default EmploiTempsISGE