import { useMemo, useState } from 'react'
import {
  DEFAULT_CLASSES,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
  parseSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'

function PointageQRCode({ user }) {
  const { store, actions } = useAppStore()

  const role = user?.role || 'admin'
  const permissions = getPermissions(role)
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    role === 'delegue' && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedDay, setSelectedDay] = useState('Tous')
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [message, setMessage] = useState('')
  const [generatedQr, setGeneratedQr] = useState({})

  const week = getWeek(selectedWeek)

  const classes = useMemo(() => {
    const unique = [
      ...new Set([
        ...DEFAULT_CLASSES,
        ...store.seances.map((item) => item.classe).filter(Boolean),
      ]),
    ]

    return ['Toutes', ...unique]
  }, [store.seances])

  const seances = useMemo(() => {
    return store.seances
      .filter((item) => item.weekKey === selectedWeek)
      .filter((item) =>
        selectedClasse === 'Toutes' ? true : item.classe === selectedClasse,
      )
      .filter((item) =>
        selectedDay === 'Tous' ? true : item.jour === selectedDay,
      )
      .filter((item) =>
        role === 'enseignant' && teacherName
          ? item.enseignant === teacherName
          : true,
      )
      .filter((item) =>
        role === 'delegue' && delegateClass ? item.classe === delegateClass : true,
      )
      .sort((a, b) => {
        const dayA = week.days.findIndex((day) => day.key === a.jour)
        const dayB = week.days.findIndex((day) => day.key === b.jour)

        if (dayA !== dayB) return dayA - dayB

        return a.horaire.localeCompare(b.horaire)
      })
  }, [
    store.seances,
    selectedWeek,
    selectedClasse,
    selectedDay,
    week.days,
    role,
    teacherName,
    delegateClass,
  ])

  const selectedSeance = useMemo(() => {
    if (!selectedSeanceId) return seances[0] || null

    return (
      store.seances.find((item) => item.id === selectedSeanceId) ||
      seances[0] ||
      null
    )
  }, [selectedSeanceId, store.seances, seances])

  const pointage = selectedSeance
    ? store.pointages.find((item) => item.seanceId === selectedSeance.id)
    : null

  const stats = useMemo(() => {
    const total = seances.length

    const pointes = seances.filter((seance) =>
      store.pointages.some((item) => item.seanceId === seance.id),
    ).length

    const presents = seances.filter((seance) =>
      store.pointages.some(
        (item) => item.seanceId === seance.id && item.statut === 'present',
      ),
    ).length

    const retards = seances.filter((seance) =>
      store.pointages.some(
        (item) => item.seanceId === seance.id && item.statut === 'retard',
      ),
    ).length

    const absents = seances.filter((seance) =>
      store.pointages.some(
        (item) => item.seanceId === seance.id && item.statut === 'absent',
      ),
    ).length

    return {
      total,
      pointes,
      presents,
      retards,
      absents,
      restants: Math.max(0, total - pointes),
    }
  }, [seances, store.pointages])

  const handleGenerateQR = (seance) => {
    if (!permissions.canGenerateQR) {
      setMessage('Vous n’avez pas le droit de générer un QR-Code.')
      return
    }

    setGeneratedQr((current) => ({
      ...current,
      [seance.id]: true,
    }))

    setSelectedSeanceId(seance.id)
    setMessage(`QR-Code généré pour ${seance.matiere} (${seance.classe}).`)
  }

  const handleTeacherScan = () => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!permissions.canTeacherScan) {
      setMessage('Seul l’enseignant peut scanner pour valider sa présence.')
      return
    }

    const autoStatus = detectTeacherScanStatus(selectedSeance)

    const result = actions.markPointage(
      selectedSeance.id,
      autoStatus,
      teacherName || getRoleLabel(role),
    )

    if (!result.success) {
      setMessage(result.message || 'Erreur lors du pointage.')
      return
    }

    if (autoStatus === 'retard') {
      setMessage(
        'Présence enregistrée, mais marquée en retard automatiquement selon l’horaire.',
      )
    } else {
      setMessage('Présence enseignant validée avec succès.')
    }
  }

  const handleManualPointage = (status) => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!permissions.canManualControl) {
      setMessage('Seul l’administrateur ou le surveillant peut corriger ce statut.')
      return
    }

    const result = actions.markPointage(
      selectedSeance.id,
      status,
      getRoleLabel(role),
    )

    if (!result.success) {
      setMessage(result.message || 'Erreur lors du pointage.')
      return
    }

    if (status === 'present') {
      setMessage('Présence confirmée.')
    }

    if (status === 'retard') {
      setMessage('Retard confirmé.')
    }

    if (status === 'absent') {
      setMessage('Absence confirmée.')
    }
  }

  const handleDelegateReport = (type) => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!permissions.canReport) {
      setMessage('Seul le délégué peut signaler une anomalie de cours.')
      return
    }

    const title =
      type === 'absence'
        ? 'Absence professeur signalée'
        : 'Retard professeur signalé'

    actions.addActivity({
      type: 'alerte',
      title,
      text: `${selectedSeance.matiere} - ${selectedSeance.classe}`,
    })

    setMessage(
      type === 'absence'
        ? 'Signalement envoyé : professeur absent.'
        : 'Signalement envoyé : professeur en retard.',
    )
  }

  if (permissions.restricted) {
    return (
      <div className="page">
        <div className="placeholder">
          <div>
            <div className="placeholder-icon">QR</div>
            <h1>Accès non autorisé</h1>
            <p>
              Le module Pointage QR-Code n’est pas disponible pour le rôle
              comptable.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page qr-page">
      <div className="page-heading">
        <div>
          <h1>Pointage QR-Code</h1>
          <p>
            Génération, scan et contrôle des présences à partir des séances
            planifiées.
          </p>
        </div>

        {selectedSeance && permissions.canGenerateQR && (
          <button
            className="primary-btn"
            onClick={() => handleGenerateQR(selectedSeance)}
          >
            Générer QR-Code
          </button>
        )}
      </div>

      <div className="qr-role-note">
        <strong>{getRoleLabel(role)}</strong>
        <span>{getRoleDescription(role)}</span>
      </div>

      <div className="stats-grid">
        <StatBox label="Séances" value={stats.total} code="SE" />
        <StatBox label="Pointées" value={stats.pointes} code="OK" />
        <StatBox label="Retards" value={stats.retards} code="RT" />
        <StatBox label="Absences" value={stats.absents} code="AB" />
      </div>

      <div className="qr-toolbar">
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
            disabled={role === 'delegue'}
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

        <div className="isge-filter">
          <label>Jour</label>
          <select
            value={selectedDay}
            onChange={(e) => {
              setSelectedDay(e.target.value)
              setSelectedSeanceId(null)
              setMessage('')
            }}
          >
            <option value="Tous">Tous les jours</option>
            {week.days.map((day) => (
              <option key={day.key} value={day.key}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && <div className="qr-message">{message}</div>}

      <div className="qr-grid">
        <section className="panel large">
          <div className="panel-header">
            <h3>Séances à pointer</h3>
            <button>{stats.restants} restante(s)</button>
          </div>

          <div className="qr-session-list">
            {seances.length === 0 && (
              <div className="qr-empty-state">
                Aucune séance disponible pour ce filtre.
              </div>
            )}

            {seances.map((seance) => {
              const itemPointage = store.pointages.find(
                (item) => item.seanceId === seance.id,
              )

              return (
                <button
                  key={seance.id}
                  className={
                    selectedSeance?.id === seance.id
                      ? 'qr-session-card active'
                      : 'qr-session-card'
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

                  <StatusBadge status={itemPointage?.statut || 'non_pointe'} />
                </button>
              )
            })}
          </div>
        </section>

        <section className="panel qr-panel">
          <div className="panel-header">
            <h3>
              {role === 'delegue'
                ? 'Signalement du cours'
                : role === 'enseignant'
                  ? 'Scan enseignant'
                  : 'Contrôle du pointage'}
            </h3>
            <button>{getRoleLabel(role)}</button>
          </div>

          {!selectedSeance ? (
            <div className="qr-empty-state">
              Sélectionnez une séance pour continuer.
            </div>
          ) : (
            <>
              <div className="qr-selected-info">
                <strong>{selectedSeance.matiere}</strong>
                <span>{selectedSeance.classe}</span>
                <small>
                  {selectedSeance.jour} • {formatSlot(selectedSeance.horaire)} •{' '}
                  {selectedSeance.salle}
                </small>
              </div>

              {role !== 'delegue' && (
                <>
                  <FakeQRCode
                    seance={selectedSeance}
                    active={generatedQr[selectedSeance.id]}
                  />

                  <div className="qr-token-box">
                    QR-{selectedSeance.id}-{selectedSeance.weekKey}
                  </div>
                </>
              )}

              {role === 'delegue' && (
                <div className="qr-current-status">
                  <strong>Rôle du délégué</strong>
                  <span>
                    Le délégué ne valide pas officiellement une absence. Il
                    signale seulement un retard ou une absence de professeur au
                    surveillant.
                  </span>
                </div>
              )}

              {pointage && (
                <div className="qr-current-status">
                  <strong>Dernier pointage</strong>
                  <span>
                    {formatStatus(pointage.statut)} à {pointage.heureScan} par{' '}
                    {pointage.validePar}
                  </span>
                </div>
              )}

              <div className="qr-actions">
                {permissions.canGenerateQR && (
                  <button
                    className="isge-secondary-btn"
                    onClick={() => handleGenerateQR(selectedSeance)}
                  >
                    Générer / régénérer QR
                  </button>
                )}

                {permissions.canTeacherScan && (
                  <button className="primary-btn" onClick={handleTeacherScan}>
                    Scanner / valider ma présence
                  </button>
                )}

                {permissions.canManualControl && (
                  <>
                    <button
                      className="primary-btn"
                      onClick={() => handleManualPointage('present')}
                    >
                      Confirmer présent
                    </button>

                    <button
                      className="qr-warning-btn"
                      onClick={() => handleManualPointage('retard')}
                    >
                      Confirmer retard
                    </button>

                    <button
                      className="qr-danger-btn"
                      onClick={() => handleManualPointage('absent')}
                    >
                      Confirmer absence
                    </button>
                  </>
                )}

                {permissions.canReport && (
                  <>
                    <button
                      className="qr-report-btn"
                      onClick={() => handleDelegateReport('retard')}
                    >
                      Signaler retard professeur
                    </button>

                    <button
                      className="qr-danger-btn"
                      onClick={() => handleDelegateReport('absence')}
                    >
                      Signaler absence professeur
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function StatBox({ label, value, code }) {
  return (
    <div className="stat-card">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>Pointage QR-Code</span>
      </div>

      <div className="stat-icon">{code}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  return <div className={`qr-status ${status}`}>{formatStatus(status)}</div>
}

function FakeQRCode({ seance, active }) {
  const seed = getSeed(seance.id + seance.matiere + seance.classe)

  return (
    <div className={active ? 'qr-code-box active' : 'qr-code-box'}>
      {Array.from({ length: 81 }).map((_, index) => {
        const pixelActive =
          index < 9 ||
          index % 10 === 0 ||
          ((index + seed) * 7) % 5 !== 0

        return (
          <span
            key={index}
            className={pixelActive ? 'qr-pixel active' : 'qr-pixel'}
          />
        )
      })}
    </div>
  )
}

function getPermissions(role) {
  if (role === 'comptable') {
    return {
      restricted: true,
      canGenerateQR: false,
      canTeacherScan: false,
      canManualControl: false,
      canReport: false,
    }
  }

  if (role === 'admin') {
    return {
      restricted: false,
      canGenerateQR: true,
      canTeacherScan: false,
      canManualControl: true,
      canReport: false,
    }
  }

  if (role === 'surveillant') {
    return {
      restricted: false,
      canGenerateQR: true,
      canTeacherScan: false,
      canManualControl: true,
      canReport: false,
    }
  }

  if (role === 'enseignant') {
    return {
      restricted: false,
      canGenerateQR: false,
      canTeacherScan: true,
      canManualControl: false,
      canReport: false,
    }
  }

  if (role === 'delegue') {
    return {
      restricted: false,
      canGenerateQR: false,
      canTeacherScan: false,
      canManualControl: false,
      canReport: true,
    }
  }

  return {
    restricted: false,
    canGenerateQR: false,
    canTeacherScan: false,
    canManualControl: false,
    canReport: false,
  }
}

function detectTeacherScanStatus(seance) {
  const parsed = parseSlot(seance.horaire)

  if (!parsed) return 'present'

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const lateLimit = parsed.start + 15

  if (currentMinutes > lateLimit) {
    return 'retard'
  }

  return 'present'
}

function getSeed(value = '') {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

function getWeek(weekKey) {
  return WEEK_OPTIONS.find((item) => item.key === weekKey) || WEEK_OPTIONS[0]
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    enseignant: 'Enseignant',
    delegue: 'Délégué',
    surveillant: 'Surveillant',
    comptable: 'Comptable',
  }

  return labels[role] || 'Utilisateur'
}

function getRoleDescription(role) {
  const descriptions = {
    admin:
      'Vous générez les QR-Codes et corrigez officiellement les pointages.',
    surveillant:
      'Vous contrôlez les séances et confirmez les retards ou absences.',
    enseignant:
      'Vous voyez uniquement vos cours et vous scannez le QR-Code pour valider votre présence.',
    delegue:
      'Vous voyez uniquement votre classe et vous signalez une anomalie de cours.',
    comptable:
      'Le comptable n’intervient pas dans le pointage QR-Code.',
  }

  return descriptions[role] || 'Accès limité au module de pointage.'
}

function formatStatus(status) {
  const labels = {
    present: 'Présent',
    retard: 'Retard',
    absent: 'Absent',
    non_pointe: 'Non pointé',
  }

  return labels[status] || status
}

export default PointageQRCode