import { useEffect, useMemo, useState } from 'react'
import './DynamicDashboard.css'
import {
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatMoney,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'
import { getHolidayForWeekDay } from '../services/burkinaHolidays'
import {
  canViewCahierTexte,
  canViewEmploiTemps,
  canViewPointage,
  canViewRapports,
  canViewVacations,
  getRoleLabel,
} from '../services/permissions'

const API_BASE = 'http://127.0.0.1/EduSchedule-Pro/backend/api'

const PAGE_TARGETS = {
  dashboard: 'dashboard',
  schedule: 'emploi',
  qr: 'qr',
  cahier: 'cahier',
  vacations: 'vacations',
  reports: 'rapports',
}

function DynamicDashboard({ user, setPage }) {
  const { store } = useAppStore()

  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [backendSeances, setBackendSeances] = useState([])
  const [backendPointages, setBackendPointages] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const canGoSchedule = canViewEmploiTemps(user)
  const canGoQr = canViewPointage(user)
  const canGoCahier = canViewCahierTexte(user)
  const canGoVacations = canViewVacations(user)
  const canGoReports = canViewRapports(user)

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

  const allCahiers = store.cahiers || []
  const allVacations = store.vacations || []
  const allActivities = store.activities || []

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setMessage('')

      const scheduleRes = await fetch(
        `${API_BASE}/schedule.php?action=list&week=${encodeURIComponent(
          selectedWeek,
        )}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      )

      const scheduleText = await scheduleRes.text()

      let scheduleJson

      try {
        scheduleJson = JSON.parse(scheduleText)
      } catch {
        throw new Error(
          `Réponse schedule.php invalide : ${scheduleText.slice(0, 180)}`,
        )
      }

      if (!scheduleJson.success) {
        throw new Error(scheduleJson.message || 'Impossible de charger les cours.')
      }

      setBackendSeances(scheduleJson.data?.seances || [])

      try {
        const qrRes = await fetch(`${API_BASE}/teacher_qr.php?action=list`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })

        const qrText = await qrRes.text()
        const qrJson = JSON.parse(qrText)

        if (qrJson.success) {
          setBackendPointages(qrJson.data?.presences || [])
        } else {
          setBackendPointages([])
        }
      } catch {
        setBackendPointages([])
      }
    } catch (err) {
      setMessage(err.message || 'Erreur lors du chargement du Dashboard.')
      setBackendSeances([])
      setBackendPointages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedWeek])

  const goTo = (target) => {
    if (!setPage) return

    const page = PAGE_TARGETS[target] || target

    const allowedPages = {
      dashboard: true,
      emploi: canGoSchedule,
      qr: canGoQr,
      cahier: canGoCahier,
      vacations: canGoVacations,
      rapports: canGoReports,
    }

    if (allowedPages[page]) {
      setPage(page)
    }
  }

  const weeklyProgrammedSeances = useMemo(() => {
    return backendSeances.filter((seance) => {
      if (role === 'enseignant' && teacherName) {
        return (
          seance.enseignant === teacherName ||
          seance.enseignant_email === user?.email
        )
      }

      if (role === 'delegue' && delegateClass) {
        return seance.classe === delegateClass
      }

      if (role === 'comptable') {
        return allVacations.some((vacation) => {
          return sameId(vacation.seanceId, seance.id)
        })
      }

      return true
    })
  }, [
    backendSeances,
    allVacations,
    role,
    teacherName,
    delegateClass,
    user?.email,
  ])

  const holidaySeances = useMemo(() => {
    return weeklyProgrammedSeances.filter((seance) => {
      const dayIndex = week.days.findIndex((day) => day.key === seance.jour)

      if (dayIndex < 0) return false

      const holiday = getHolidayForWeekDay(week, selectedWeek, dayIndex)

      return Boolean(holiday)
    })
  }, [weeklyProgrammedSeances, week, selectedWeek])

  const effectiveSeances = useMemo(() => {
    return weeklyProgrammedSeances.filter((seance) => {
      const dayIndex = week.days.findIndex((day) => day.key === seance.jour)

      if (dayIndex < 0) return true

      const holiday = getHolidayForWeekDay(week, selectedWeek, dayIndex)

      return !holiday
    })
  }, [weeklyProgrammedSeances, week, selectedWeek])

  const scopedPointages = useMemo(() => {
    const effectiveSeanceIds = effectiveSeances.map((item) => Number(item.id))

    return backendPointages
      .map((pointage) => ({
        ...pointage,
        seanceId:
          pointage.seanceId ||
          pointage.seance_id ||
          pointage.creneauId ||
          pointage.creneau_id,
        statut: pointage.statut || pointage.status || 'present',
        heureScan:
          pointage.heureScan ||
          pointage.scanned_at ||
          pointage.created_at ||
          '',
      }))
      .filter((pointage) => effectiveSeanceIds.includes(Number(pointage.seanceId)))
  }, [backendPointages, effectiveSeances])

  const scopedCahiers = useMemo(() => {
    const effectiveSeanceIds = effectiveSeances.map((item) => Number(item.id))

    return allCahiers.filter((cahier) => {
      return effectiveSeanceIds.includes(Number(cahier.seanceId))
    })
  }, [allCahiers, effectiveSeances])

  const scopedVacations = useMemo(() => {
    return allVacations
      .map((vacation) => {
        const seance = backendSeances.find((item) => {
          return sameId(item.id, vacation.seanceId)
        })

        return {
          ...vacation,
          seance,
        }
      })
      .filter((vacation) => vacation.seance)
      .filter((vacation) => {
        const dayIndex = week.days.findIndex(
          (day) => day.key === vacation.seance?.jour,
        )

        if (dayIndex < 0) return true

        const holiday = getHolidayForWeekDay(week, selectedWeek, dayIndex)

        return !holiday
      })
      .filter((vacation) => {
        if (role === 'enseignant' && teacherName) {
          return vacation.enseignant === teacherName
        }

        if (role === 'delegue') {
          return false
        }

        return true
      })
  }, [
    allVacations,
    backendSeances,
    week,
    selectedWeek,
    role,
    teacherName,
  ])

  const stats = useMemo(() => {
    const classes = new Set(
      effectiveSeances.map((item) => item.classe).filter(Boolean),
    )

    const enseignants = new Set(
      effectiveSeances.map((item) => item.enseignant).filter(Boolean),
    )

    const matieres = new Set(
      effectiveSeances.map((item) => item.matiere).filter(Boolean),
    )

    const salles = new Set(
      effectiveSeances.map((item) => item.salle).filter(Boolean),
    )

    const presents = scopedPointages.filter((item) => item.statut === 'present')
      .length

    const retards = scopedPointages.filter((item) => item.statut === 'retard')
      .length

    const absents = scopedPointages.filter((item) => item.statut === 'absent')
      .length

    const pointagesValides = scopedPointages.filter((item) =>
      ['present', 'retard'].includes(item.statut),
    ).length

    const cahiersSignesDelegue = scopedCahiers.filter(
      (item) => item.signatureDelegue,
    ).length

    const cahiersSignesEnseignant = scopedCahiers.filter(
      (item) => item.signatureEnseignant,
    ).length

    const cahiersClotures = scopedCahiers.filter((item) => item.locked).length

    const cahiersOuverts = scopedCahiers.filter((item) => !item.locked).length

    const cahiersACompleter = Math.max(
      0,
      effectiveSeances.length - scopedCahiers.length,
    )

    const vacationsTotal = scopedVacations.length

    const vacationsValidees = scopedVacations.filter((item) =>
      ['validee', 'payee'].includes(item.statut),
    ).length

    const vacationsPayees = scopedVacations.filter(
      (item) => item.statut === 'payee',
    ).length

    const vacationsEnAttente = scopedVacations.filter(
      (item) => item.statut !== 'payee',
    ).length

    const vacationsMontant = scopedVacations.reduce(
      (sum, item) => sum + Number(item.montantNet || 0),
      0,
    )

    const tauxPresence =
      scopedPointages.length > 0
        ? Math.round((presents / scopedPointages.length) * 100)
        : 0

    const tauxRealisation =
      effectiveSeances.length > 0
        ? Math.round((pointagesValides / effectiveSeances.length) * 100)
        : 0

    const tauxCahiers =
      effectiveSeances.length > 0
        ? Math.round((cahiersClotures / effectiveSeances.length) * 100)
        : 0

    return {
      classes: classes.size,
      enseignants: enseignants.size,
      matieres: matieres.size,
      salles: salles.size,

      coursProgrammes: weeklyProgrammedSeances.length,
      coursEffectifs: effectiveSeances.length,
      coursNeutralises: holidaySeances.length,

      pointages: scopedPointages.length,
      pointagesValides,
      presents,
      retards,
      absents,

      tauxPresence,
      tauxRealisation,
      tauxCahiers,

      cahiers: scopedCahiers.length,
      cahiersSignesDelegue,
      cahiersSignesEnseignant,
      cahiersClotures,
      cahiersOuverts,
      cahiersACompleter,

      vacationsTotal,
      vacationsValidees,
      vacationsPayees,
      vacationsEnAttente,
      vacationsMontant,
    }
  }, [
    weeklyProgrammedSeances,
    effectiveSeances,
    holidaySeances,
    scopedPointages,
    scopedCahiers,
    scopedVacations,
  ])

  const chartData = useMemo(() => {
    return week.days.map((day, dayIndex) => {
      const holiday = getHolidayForWeekDay(week, selectedWeek, dayIndex)

      const programmed = weeklyProgrammedSeances.filter((seance) => {
        return seance.jour === day.key
      })

      const effective = holiday
        ? []
        : effectiveSeances.filter((seance) => seance.jour === day.key)

      const pointages = scopedPointages.filter((pointage) => {
        const seance = effectiveSeances.find((item) => {
          return sameId(item.id, pointage.seanceId)
        })

        return seance?.jour === day.key
      })

      const cahiers = scopedCahiers.filter((cahier) => {
        const seance = effectiveSeances.find((item) => {
          return sameId(item.id, cahier.seanceId)
        })

        return seance?.jour === day.key
      })

      return {
        label: day.short || day.label.slice(0, 3),
        day: day.label,
        programmed: programmed.length,
        effective: effective.length,
        neutralized: holiday ? programmed.length : 0,
        pointages: pointages.length,
        cahiers: cahiers.length,
        holiday: holiday?.name || '',
      }
    })
  }, [
    week,
    selectedWeek,
    weeklyProgrammedSeances,
    effectiveSeances,
    scopedPointages,
    scopedCahiers,
  ])

  const maxChartValue = useMemo(() => {
    return Math.max(
      1,
      ...chartData.map((item) => Math.max(item.programmed, item.effective)),
    )
  }, [chartData])

  const activities = useMemo(() => {
    const pointageActivities = scopedPointages.map((pointage) => {
      const seance = effectiveSeances.find((item) =>
        sameId(item.id, pointage.seanceId),
      )

      return {
        id: `pointage-${pointage.id || pointage.seanceId}`,
        type:
          pointage.statut === 'retard'
            ? 'RT'
            : pointage.statut === 'absent'
              ? 'AB'
              : 'QR',
        title:
          pointage.statut === 'retard'
            ? 'Retard enregistré'
            : pointage.statut === 'absent'
              ? 'Absence enregistrée'
              : 'Pointage effectué',
        text: seance
          ? `${seance.matiere} - ${seance.classe}`
          : 'Séance pointée',
      }
    })

    const cahierActivities = scopedCahiers.map((cahier) => {
      const seance = effectiveSeances.find((item) =>
        sameId(item.id, cahier.seanceId),
      )

      return {
        id: `cahier-${cahier.id || cahier.seanceId}`,
        type: 'CT',
        title: cahier.locked
          ? 'Cahier clôturé'
          : cahier.signatureDelegue
            ? 'Cahier signé par le délégué'
            : 'Cahier renseigné',
        text: seance
          ? `${seance.matiere} - ${seance.classe}`
          : cahier.titre || 'Cahier de texte',
      }
    })

    const vacationActivities = scopedVacations.map((vacation) => {
      return {
        id: `vacation-${vacation.id}`,
        type: 'FV',
        title:
          vacation.statut === 'payee'
            ? 'Vacation payée'
            : vacation.statut === 'validee'
              ? 'Vacation validée'
              : vacation.statut === 'visee'
                ? 'Vacation visée'
                : 'Fiche de vacation générée',
        text: `${vacation.enseignant} - ${formatMoney(vacation.montantNet)}`,
      }
    })

    const holidayActivities = holidaySeances.slice(0, 4).map((seance) => ({
      id: `holiday-${seance.id}`,
      type: 'JF',
      title: 'Cours neutralisé par jour férié',
      text: `${seance.matiere} - ${seance.classe} - ${seance.jour}`,
    }))

    const externalActivities = allActivities.map((activity, index) => ({
      id: `activity-${index}`,
      type: activity.type === 'alerte' ? 'AN' : 'AC',
      title: activity.title || 'Activité',
      text: activity.text || '',
    }))

    if (role === 'comptable') {
      return [...vacationActivities, ...externalActivities].slice(-6).reverse()
    }

    if (role === 'delegue') {
      return [...holidayActivities, ...pointageActivities, ...cahierActivities]
        .slice(-6)
        .reverse()
    }

    if (role === 'enseignant') {
      return [
        ...holidayActivities,
        ...pointageActivities,
        ...cahierActivities,
        ...vacationActivities,
      ]
        .slice(-6)
        .reverse()
    }

    return [
      ...holidayActivities,
      ...pointageActivities,
      ...cahierActivities,
      ...vacationActivities,
      ...externalActivities,
    ]
      .slice(-6)
      .reverse()
  }, [
    scopedPointages,
    scopedCahiers,
    scopedVacations,
    effectiveSeances,
    holidaySeances,
    allActivities,
    role,
  ])

  const nextItems = useMemo(() => {
    if (role === 'comptable') {
      return scopedVacations.slice(0, 5).map((vacation) => ({
        id: vacation.id,
        icon: 'FV',
        title: vacation.enseignant,
        main: `${vacation.seance?.matiere || 'Vacation'} • ${
          vacation.seance?.classe || '—'
        }`,
        sub: `${formatMoney(vacation.montantNet)} — ${formatVacationStatus(
          vacation.statut,
        )}`,
      }))
    }

    if (role === 'surveillant') {
      return effectiveSeances.slice(0, 5).map((seance) => {
        const pointage = scopedPointages.find((item) =>
          sameId(item.seanceId, seance.id),
        )

        const cahier = scopedCahiers.find((item) =>
          sameId(item.seanceId, seance.id),
        )

        return {
          id: seance.id,
          icon: 'CT',
          title: seance.matiere,
          main: `${seance.classe} • ${seance.jour} • ${formatSlot(
            seance.horaire,
          )}`,
          sub: `${pointage ? formatPointage(pointage.statut) : 'Non pointé'} — ${
            cahier?.locked ? 'Cahier clôturé' : 'Cahier à contrôler'
          }`,
        }
      })
    }

    return effectiveSeances.slice(0, 5).map((seance) => ({
      id: seance.id,
      icon: 'ET',
      title: seance.matiere,
      main: `${seance.classe} • ${seance.jour} • ${formatSlot(seance.horaire)}`,
      sub: `${seance.enseignant} — ${seance.salle}`,
    }))
  }, [role, effectiveSeances, scopedVacations, scopedPointages, scopedCahiers])

  const roleConfig = getRoleConfig(role)

  const primaryTargetIsAllowed = isTargetAllowed(roleConfig.primaryTarget, {
    canGoSchedule,
    canGoQr,
    canGoCahier,
    canGoVacations,
    canGoReports,
  })

  return (
    <div className="page dynamic-dashboard">
      <div className="page-heading dashboard-hero">
        <div>
          <span className="dashboard-kicker">{roleConfig.kicker}</span>
          <h1>{roleConfig.title}</h1>
          <p>{roleConfig.description}</p>
        </div>

        {primaryTargetIsAllowed && (
          <button
            type="button"
            className="primary-btn"
            onClick={() => goTo(roleConfig.primaryTarget)}
          >
            {roleConfig.primaryAction}
          </button>
        )}
      </div>

      <div className="dashboard-scope-note">
        <div>
          <strong>{getRoleLabel(user)}</strong>
          <span>{getScopeText(role, teacherName, delegateClass)}</span>
        </div>

        <div className="dashboard-week-select">
          <label>Semaine active</label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value)
            }}
          >
            {WEEK_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="dashboard-message">
          Chargement des données de la semaine...
        </div>
      )}

      {message && <div className="dashboard-message error">{message}</div>}

      <div className="stats-grid">
        {getStatCards(role, stats).map((card) => (
          <StatBox
            key={card.label}
            label={card.label}
            value={card.value}
            code={card.code}
            hint={card.hint}
          />
        ))}
      </div>

      <section className="panel dashboard-kpi-panel">
        <div className="dashboard-kpi-grid">
          <MiniStat label="Cours programmés" value={stats.coursProgrammes} />
          <MiniStat label="Cours effectifs" value={stats.coursEffectifs} />
          <MiniStat label="Neutralisés fériés" value={stats.coursNeutralises} />
          <MiniStat label="Taux réalisation" value={`${stats.tauxRealisation}%`} />
          <MiniStat label="Pointages" value={stats.pointages} />
          <MiniStat label="Cahiers clôturés" value={stats.cahiersClotures} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-chart-panel">
          <div className="panel-header">
            <h3>
              {role === 'comptable'
                ? 'Activité financière'
                : 'Cours programmés / effectifs'}
            </h3>
            <span className="dashboard-week-badge">Semaine sélectionnée</span>
          </div>

          {role === 'comptable' ? (
            <div className="dashboard-finance-box">
              <div>
                <span>Montant total net</span>
                <strong>{formatMoney(stats.vacationsMontant)}</strong>
              </div>

              <div>
                <span>Fiches validées</span>
                <strong>{stats.vacationsValidees}</strong>
              </div>

              <div>
                <span>Fiches payées</span>
                <strong>{stats.vacationsPayees}</strong>
              </div>
            </div>
          ) : (
            <>
              <div className="dashboard-bars dual">
                {chartData.map((item) => {
                  const programmedHeight =
                    item.programmed > 0
                      ? `${Math.max(
                          18,
                          (item.programmed / maxChartValue) * 160,
                        )}px`
                      : '0px'

                  const effectiveHeight =
                    item.effective > 0
                      ? `${Math.max(
                          18,
                          (item.effective / maxChartValue) * 160,
                        )}px`
                      : '0px'

                  return (
                    <div
                      key={item.label}
                      className={
                        item.holiday
                          ? 'dashboard-bar-item holiday'
                          : 'dashboard-bar-item'
                      }
                      title={
                        item.holiday
                          ? `${item.day} férié : ${item.holiday}. ${item.programmed} cours programmé(s), ${item.neutralized} neutralisé(s).`
                          : `${item.day} : ${item.effective} cours effectif(s) sur ${item.programmed} programmé(s).`
                      }
                    >
                      <div className="dashboard-dual-track">
                        <div
                          className="dashboard-programmed-bar"
                          style={{ height: programmedHeight }}
                        />

                        <div
                          className="dashboard-effective-bar"
                          style={{ height: effectiveHeight }}
                        />
                      </div>

                      <strong>{item.effective}</strong>
                      <span>{item.label}</span>

                      {item.holiday ? (
                        <small className="dashboard-bar-note">
                          {item.programmed} prévu(s) · férié
                        </small>
                      ) : (
                        <small className="dashboard-bar-note normal">
                          {item.programmed} prévu(s)
                        </small>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="dashboard-mini-stats">
                <MiniStat label="Programmés" value={stats.coursProgrammes} />
                <MiniStat label="Effectifs" value={stats.coursEffectifs} />
                <MiniStat label="Fériés" value={stats.coursNeutralises} />
              </div>
            </>
          )}
        </section>

        <section className="panel dashboard-activity-panel">
          <div className="panel-header">
            <h3>Activités récentes</h3>

            {canGoReports && (
              <button type="button" onClick={() => goTo('reports')}>
                Voir tout
              </button>
            )}
          </div>

          <div className="dashboard-activity-list">
            {activities.length === 0 && (
              <div className="dashboard-empty">
                Aucune activité dynamique pour le moment.
              </div>
            )}

            {activities.map((activity) => (
              <div key={activity.id} className="dashboard-activity-item">
                <div className="activity-icon">{activity.type}</div>

                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel dashboard-next-panel">
        <div className="panel-header">
          <h3>{roleConfig.sectionTitle}</h3>

          {canGoSchedule && role !== 'comptable' && (
            <button type="button" onClick={() => goTo('schedule')}>
              Emploi complet
            </button>
          )}

          {canGoVacations && role === 'comptable' && (
            <button type="button" onClick={() => goTo('vacations')}>
              Voir vacations
            </button>
          )}
        </div>

        <div className="dashboard-next-list">
          {nextItems.map((item) => (
            <div key={item.id} className="dashboard-next-item">
              <div className="activity-icon">{item.icon}</div>

              <div>
                <strong>{item.title}</strong>
                <span>{item.main}</span>
                <small>{item.sub}</small>
              </div>
            </div>
          ))}

          {nextItems.length === 0 && (
            <div className="dashboard-empty">
              Aucune donnée effective à afficher pour votre périmètre.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatBox({ label, value, code, hint }) {
  return (
    <div className="stat-card">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{hint}</span>
      </div>

      <div className="stat-icon">{code}</div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="dashboard-mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function getStatCards(role, stats) {
  if (role === 'enseignant') {
    return [
      {
        label: 'Mes cours',
        value: stats.coursEffectifs,
        code: 'ET',
        hint: 'Effectifs',
      },
      {
        label: 'Présences',
        value: stats.presents,
        code: 'PR',
        hint: `${stats.tauxPresence}%`,
      },
      {
        label: 'Cahiers clôturés',
        value: stats.cahiersClotures,
        code: 'CT',
        hint: `${stats.tauxCahiers}%`,
      },
      {
        label: 'Vacations',
        value: stats.vacationsTotal,
        code: 'FV',
        hint: 'Mes fiches',
      },
    ]
  }

  if (role === 'delegue') {
    return [
      {
        label: 'Cours classe',
        value: stats.coursEffectifs,
        code: 'CL',
        hint: 'Effectifs',
      },
      {
        label: 'Pointages',
        value: stats.pointages,
        code: 'QR',
        hint: 'Enregistrés',
      },
      {
        label: 'Cahiers',
        value: stats.cahiers,
        code: 'CT',
        hint: 'Renseignés',
      },
      {
        label: 'À signer',
        value: Math.max(0, stats.cahiers - stats.cahiersSignesDelegue),
        code: 'SD',
        hint: 'Délégué',
      },
    ]
  }

  if (role === 'surveillant') {
    return [
      {
        label: 'Cours effectifs',
        value: stats.coursEffectifs,
        code: 'SE',
        hint: 'À contrôler',
      },
      {
        label: 'Retards',
        value: stats.retards,
        code: 'RT',
        hint: 'Signalés',
      },
      {
        label: 'Absences',
        value: stats.absents,
        code: 'AB',
        hint: 'À suivre',
      },
      {
        label: 'Cahiers ouverts',
        value: stats.cahiersOuverts,
        code: 'CT',
        hint: 'À contrôler',
      },
    ]
  }

  if (role === 'comptable') {
    return [
      {
        label: 'Fiches',
        value: stats.vacationsTotal,
        code: 'FV',
        hint: 'Total',
      },
      {
        label: 'Payées',
        value: stats.vacationsPayees,
        code: 'OK',
        hint: 'Paiements',
      },
      {
        label: 'À payer',
        value: Math.max(0, stats.vacationsTotal - stats.vacationsPayees),
        code: 'AT',
        hint: 'En attente',
      },
      {
        label: 'Montant',
        value: formatShortMoney(stats.vacationsMontant),
        code: 'FC',
        hint: 'FCFA net',
      },
    ]
  }

  return [
    {
      label: 'Cours programmés',
      value: stats.coursProgrammes,
      code: 'CP',
      hint: 'Semaine sélectionnée',
    },
    {
      label: 'Cours effectifs',
      value: stats.coursEffectifs,
      code: 'CE',
      hint: 'Hors fériés',
    },
    {
      label: 'Neutralisés',
      value: stats.coursNeutralises,
      code: 'JF',
      hint: 'Jours fériés',
    },
    {
      label: 'Pointages',
      value: stats.pointages,
      code: 'QR',
      hint: `${stats.tauxRealisation}% réalisés`,
    },
  ]
}

function getRoleConfig(role) {
  const configs = {
    admin: {
      kicker: 'Vue globale',
      title: 'Bonjour, Administrateur',
      description:
        'Vue globale de la semaine sélectionnée : cours programmés, jours fériés, pointages, cahiers et vacations.',
      primaryAction: '+ Nouvelle séance',
      primaryTarget: 'schedule',
      sectionTitle: 'Cours effectifs',
    },
    enseignant: {
      kicker: 'Espace enseignant',
      title: 'Bonjour, Enseignant',
      description:
        'Suivez vos cours effectifs, vos pointages, vos cahiers clôturés et vos fiches de vacation.',
      primaryAction: 'Remplir un cahier',
      primaryTarget: 'cahier',
      sectionTitle: 'Mes cours effectifs',
    },
    delegue: {
      kicker: 'Espace délégué',
      title: 'Espace Délégué',
      description:
        'Suivez les cours effectifs de votre classe, les pointages et les cahiers à signer.',
      primaryAction: 'Signer un cahier',
      primaryTarget: 'cahier',
      sectionTitle: 'Cours effectifs de ma classe',
    },
    surveillant: {
      kicker: 'Contrôle',
      title: 'Espace Surveillant',
      description:
        'Contrôlez les cours effectifs, les retards, les absences et les cahiers ouverts.',
      primaryAction: 'Contrôler pointages',
      primaryTarget: 'qr',
      sectionTitle: 'Cours à contrôler',
    },
    comptable: {
      kicker: 'Finance',
      title: 'Espace Comptable',
      description:
        'Validez les fiches de vacation et suivez les paiements enseignants.',
      primaryAction: 'Voir vacations',
      primaryTarget: 'vacations',
      sectionTitle: 'Fiches récentes',
    },
  }

  return configs[role] || configs.admin
}

function getScopeText(role, teacherName, delegateClass) {
  if (role === 'enseignant') {
    return teacherName
      ? `Données filtrées pour : ${teacherName}`
      : 'Données filtrées pour l’enseignant connecté'
  }

  if (role === 'delegue') {
    return delegateClass
      ? `Données filtrées pour : ${delegateClass}`
      : 'Données filtrées pour la classe du délégué'
  }

  if (role === 'comptable') {
    return 'Vue orientée vacations, validations et paiements'
  }

  if (role === 'surveillant') {
    return 'Vue orientée contrôle des présences et anomalies'
  }

  return 'Vue complète de l’activité académique'
}

function isTargetAllowed(target, permissions) {
  const page = PAGE_TARGETS[target] || target

  if (page === 'dashboard') return true
  if (page === 'emploi') return permissions.canGoSchedule
  if (page === 'qr') return permissions.canGoQr
  if (page === 'cahier') return permissions.canGoCahier
  if (page === 'vacations') return permissions.canGoVacations
  if (page === 'rapports') return permissions.canGoReports

  return false
}

function sameId(a, b) {
  return Number(a) === Number(b)
}

function formatShortMoney(value) {
  const amount = Number(value || 0)

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }

  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`
  }

  return amount.toString()
}

function formatPointage(status) {
  const labels = {
    present: 'Présent',
    retard: 'Retard',
    absent: 'Absent',
    non_pointe: 'Non pointé',
  }

  return labels[status] || status || 'Non pointé'
}

function formatVacationStatus(status) {
  const labels = {
    en_attente: 'En attente',
    signee_enseignant: 'Signée enseignant',
    visee: 'Visée',
    validee: 'Validée',
    payee: 'Payée',
  }

  return labels[status] || status || '—'
}

export default DynamicDashboard