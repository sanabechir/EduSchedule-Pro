import { useMemo, useState } from 'react'
import {
  DEFAULT_CLASSES,
  DEFAULT_MODULES,
  DEFAULT_ROOMS,
  DEFAULT_SLOTS,
  DEFAULT_TEACHERS,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
  normalizeSlot,
  sortSlots,
  useAppStore,
} from '../services/appStore'

const EMPTY_FORM = {
  classe: 'Licence 1 RIT',
  jour: 'Lundi',
  horaire: '07h30-09h30',
  matiere: 'Programmation Web',
  enseignant: 'TRAORE Jean',
  salle: 'A101',
  type: 'cours',
  groupe: '',
}

function EmploiTempsISGE() {
  const { store, actions } = useAppStore()

  const [classe, setClasse] = useState('Toutes')
  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [conflicts, setConflicts] = useState([])

  const week = getWeek(selectedWeek)

  const weekItems = useMemo(() => {
    return store.seances.filter((item) => item.weekKey === selectedWeek)
  }, [store.seances, selectedWeek])

  const classes = useMemo(() => {
    const unique = [
      ...new Set([
        ...DEFAULT_CLASSES,
        ...store.seances.map((item) => item.classe).filter(Boolean),
      ]),
    ]

    return ['Toutes', ...unique]
  }, [store.seances])

  const modules = useMemo(() => {
    return [
      ...new Set([
        ...DEFAULT_MODULES,
        ...store.seances.map((item) => item.matiere).filter(Boolean),
      ]),
    ]
  }, [store.seances])

  const teachers = useMemo(() => {
    return [
      ...new Set([
        ...DEFAULT_TEACHERS,
        ...store.seances.map((item) => item.enseignant).filter(Boolean),
      ]),
    ]
  }, [store.seances])

  const rooms = useMemo(() => {
    return [
      ...new Set([
        ...DEFAULT_ROOMS,
        ...store.seances.map((item) => item.salle).filter(Boolean),
      ]),
    ]
  }, [store.seances])

  const filteredItems = useMemo(() => {
    if (classe === 'Toutes') return weekItems
    return weekItems.filter((item) => item.classe === classe)
  }, [weekItems, classe])

  const slots = useMemo(() => {
    const dynamicSlots = [
      ...new Set(filteredItems.map((item) => item.horaire).filter(Boolean)),
    ]

    const merged = [...DEFAULT_SLOTS]

    dynamicSlots.forEach((slot) => {
      if (!merged.some((existing) => normalizeSlot(existing) === normalizeSlot(slot))) {
        merged.push(slot)
      }
    })

    return merged.sort(sortSlots)
  }, [filteredItems])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setConflicts([])
  }

  const submitCourse = (event) => {
    event.preventDefault()

    const candidate = {
      weekKey: selectedWeek,
      classe: form.classe.trim(),
      jour: form.jour.trim(),
      horaire: form.horaire.trim(),
      matiere: form.matiere.trim(),
      enseignant: form.enseignant.trim(),
      salle: form.salle.trim(),
      type: form.type.trim(),
      groupe: form.groupe.trim() || null,
      statut: 'planifiee',
      createdBy: 'frontend',
    }

    const requiredFields = [
      'classe',
      'jour',
      'horaire',
      'matiere',
      'enseignant',
      'salle',
      'type',
    ]

    const missing = requiredFields.filter((field) => !candidate[field])

    if (missing.length > 0) {
      setConflicts([
        {
          type: 'missing',
          message: 'Veuillez remplir tous les champs obligatoires.',
        },
      ])
      return
    }

    const result = actions.addSeance(candidate)

    if (!result.success) {
      setConflicts(result.conflicts || [{ message: result.message }])
      return
    }

    setForm(EMPTY_FORM)
    setConflicts([])
    setShowForm(false)
    setClasse(candidate.classe)
  }

  const deleteCourse = (course) => {
    const ok = window.confirm(
      `Supprimer la séance "${course.matiere}" de ${course.classe} ?`,
    )

    if (!ok) return

    actions.deleteSeance(course.id)
  }

  const resetPlanning = () => {
    const ok = window.confirm(
      'Réinitialiser toutes les données frontend ? Les séances ajoutées, pointages, cahiers et vacations de test seront remis à zéro.',
    )

    if (!ok) return

    actions.resetStore()
    setClasse('Toutes')
    setSelectedWeek(DEFAULT_WEEK_KEY)
    setShowForm(false)
    setConflicts([])
  }

  return (
    <div className="page isge-schedule-page">
      <div className="page-heading">
        <div>
          <h1>Emploi du temps</h1>
          <p>Vue hebdomadaire structurée par classe, jour et horaire.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setShowForm((value) => !value)
            setConflicts([])
          }}
        >
          {showForm ? 'Fermer le formulaire' : '+ Nouvelle séance'}
        </button>
      </div>

      {showForm && (
        <section className="isge-add-panel">
          <div className="isge-add-header">
            <div>
              <span>Planification</span>
              <h2>Ajouter une séance</h2>
              <p className="isge-week-helper">
                La séance sera ajoutée à la semaine : <strong>{week.label}</strong>
              </p>
            </div>

            <div className="isge-conflict-status">
              {conflicts.length > 0 ? 'Conflit détecté' : 'Aucun conflit'}
            </div>
          </div>

          <form className="isge-course-form" onSubmit={submitCourse}>
            <FormSelect
              label="Classe"
              value={form.classe}
              onChange={(value) => updateField('classe', value)}
              options={classes.filter((item) => item !== 'Toutes')}
            />

            <FormSelect
              label="Jour"
              value={form.jour}
              onChange={(value) => updateField('jour', value)}
              options={week.days.map((day) => day.key)}
            />

            <FormSelect
              label="Horaire"
              value={form.horaire}
              onChange={(value) => updateField('horaire', value)}
              options={DEFAULT_SLOTS}
            />

            <FormSelect
              label="Module"
              value={form.matiere}
              onChange={(value) => updateField('matiere', value)}
              options={modules}
            />

            <FormSelect
              label="Enseignant"
              value={form.enseignant}
              onChange={(value) => updateField('enseignant', value)}
              options={teachers}
            />

            <FormSelect
              label="Salle"
              value={form.salle}
              onChange={(value) => updateField('salle', value)}
              options={rooms}
            />

            <FormSelect
              label="Type"
              value={form.type}
              onChange={(value) => updateField('type', value)}
              options={['cours', 'td', 'tp', 'ds']}
            />

            <div className="isge-form-group">
              <label>Groupe</label>
              <input
                value={form.groupe}
                placeholder="Ex : GP1, GP2, vide si cours commun"
                onChange={(e) => updateField('groupe', e.target.value)}
              />
            </div>

            {conflicts.length > 0 && (
              <div className="isge-conflict-box">
                <strong>Impossible d’ajouter cette séance :</strong>

                <ul>
                  {conflicts.map((conflict, index) => (
                    <li key={`${conflict.type || 'conflict'}-${index}`}>
                      {conflict.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="isge-form-actions">
              <button
                type="button"
                className="isge-secondary-btn"
                onClick={() => {
                  setForm(EMPTY_FORM)
                  setConflicts([])
                }}
              >
                Réinitialiser
              </button>

              <button type="submit" className="primary-btn">
                Ajouter la séance
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="isge-schedule-toolbar">
        <div className="isge-filter">
          <label>Classe</label>
          <select value={classe} onChange={(e) => setClasse(e.target.value)}>
            {classes.map((name) => (
              <option key={name} value={name}>
                {name}
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
              setConflicts([])
            }}
          >
            {WEEK_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button className="isge-secondary-btn" onClick={resetPlanning}>
          Réinitialiser
        </button>

        <button className="isge-export-btn">Exporter PDF</button>
      </div>

      <section className="isge-document">
        <div className="isge-document-header">
          <div>
            <span className="isge-small-title">EduSchedule Pro</span>
            <h2>{week.title}</h2>
          </div>

          <div className="isge-class-badge">
            {classe === 'Toutes' ? 'Toutes les classes' : classe}
          </div>
        </div>

        <div className="isge-demo-note">
          Les données de cette page viennent maintenant du store central frontend.
          Les prochaines pages QR-Code, Cahier, Vacations et Rapports utiliseront
          les mêmes séances.
        </div>

        <div className="isge-table-wrap">
          <table className="isge-table">
            <thead>
              <tr>
                <th className="isge-time-head">Horaire</th>
                {week.days.map((day) => (
                  <th key={day.key}>{day.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {slots.map((slot) => (
                <tr key={slot}>
                  <td className="isge-time-cell">{formatSlot(slot)}</td>

                  {week.days.map((day) => {
                    const courses = filteredItems.filter(
                      (item) =>
                        item.jour === day.key &&
                        normalizeSlot(item.horaire) === normalizeSlot(slot),
                    )

                    return (
                      <td key={`${day.key}-${slot}`}>
                        {courses.length === 0 ? (
                          <div className="isge-empty">—</div>
                        ) : (
                          courses.map((course) => (
                            <CourseBlock
                              key={course.id}
                              course={course}
                              showClass={classe === 'Toutes'}
                              onDelete={deleteCourse}
                            />
                          ))
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="isge-document-footer">
          <span>EduSchedule Pro</span>
          <span>Gestion académique intelligente</span>
        </div>
      </section>
    </div>
  )
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div className="isge-form-group">
      <label>{label}</label>

      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

function CourseBlock({ course, showClass, onDelete }) {
  return (
    <div className={`isge-course ${course.type || 'cours'}`}>
      <div className="isge-course-meta">
        {showClass && <div className="isge-course-class">{course.classe}</div>}

        {course.createdBy === 'frontend' && (
          <div className="isge-local-badge">Ajouté</div>
        )}
      </div>

      <div className="isge-course-top">
        <strong>{course.matiere}</strong>
        <span>{course.type || 'cours'}</span>
      </div>

      <p>{course.enseignant}</p>
      <small>{course.salle}</small>

      {course.groupe && <em>{course.groupe}</em>}

      <button
        type="button"
        className="isge-delete-course"
        onClick={() => onDelete(course)}
      >
        Supprimer
      </button>
    </div>
  )
}

function getWeek(weekKey) {
  return WEEK_OPTIONS.find((item) => item.key === weekKey) || WEEK_OPTIONS[0]
}

function formatOption(value) {
  if (value === 'td') return 'TD'
  if (value === 'tp') return 'TP'
  if (value === 'ds') return 'DS'
  if (value === 'cours') return 'Cours'
  return value
}

export default EmploiTempsISGE