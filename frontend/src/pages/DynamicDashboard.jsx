import { useMemo } from 'react'
import './DynamicDashboard.css'
import {
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatMoney,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'

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
  const week =
    WEEK_OPTIONS.find((item) => item.key === DEFAULT_WEEK_KEY) ||
    WEEK_OPTIONS[0]

  const goTo = (target) => {
    if (!setPage) return

    const page = PAGE_TARGETS[target] || target

    setPage(page)
  }

  const scopedSeances = useMemo(() => {
    return store.seances
      .filter((seance) => seance.weekKey === DEFAULT_WEEK_KEY)
      .filter((seance) => {
        if (role === 'enseignant' && teacherName) {
          return seance.enseignant === teacherName
        }

        if (role === 'delegue' && delegateClass) {
          return seance.classe === delegateClass
        }

        return true
      })
  }, [store.seances, role, teacherName, delegateClass])

  const scopedCahiers = useMemo(() => {
    const seanceIds = scopedSeances.map((item) => item.id)

    return store.cahiers.filter((cahier) => seanceIds.includes(cahier.seanceId))
  }, [store.cahiers, scopedSeances])

  const scopedPointages = useMemo(() => {
    const seanceIds = scopedSeances.map((item) => item.id)

    return store.pointages.filter((pointage) =>
      seanceIds.includes(pointage.seanceId),
    )
  }, [store.pointages, scopedSeances])

  const scopedVacations = useMemo(() => {
    return store.vacations
      .map((vacation) => {
        const seance = store.seances.find((item) => item.id === vacation.seanceId)

        return {
          ...vacation,
          seance,
        }
      })
      .filter((vacation) => vacation.seance)
      .filter((vacation) => {
        if (role === 'enseignant' && teacherName) {
          return vacation.enseignant === teacherName
        }

        return true
      })
  }, [store.vacations, store.seances, role, teacherName])

  const stats = useMemo(() => {
    const classes = new Set(
      scopedSeances.map((item) => item.classe).filter(Boolean),
    )

    const enseignants = new Set(
      scopedSeances.map((item) => item.enseignant).filter(Boolean),
    )

    const matieres = new Set(
      scopedSeances.map((item) => item.matiere).filter(Boolean),
    )

    const salles = new Set(
      scopedSeances.map((item) => item.salle).filter(Boolean),
    )

    const presents = scopedPointages.filter((item) => item.statut === 'present')
      .length

    const retards = scopedPointages.filter((item) => item.statut === 'retard')
      .length

    const absents = scopedPointages.filter((item) => item.statut === 'absent')
      .length

    const cahiersSignesDelegue = scopedCahiers.filter(
      (item) => item.signatureDelegue,
    ).length

    const cahiersClotures = scopedCahiers.filter((item) => item.locked).length

    const vacationsTotal = scopedVacations.length

    const vacationsPayees = scopedVacations.filter(
      (item) => item.statut === 'payee',
    ).length

    const vacationsMontant = scopedVacations.reduce(
      (sum, item) => sum + Number(item.montantNet || 0),
      0,
    )

    return {
      classes: classes.size,
      enseignants: enseignants.size,
      matieres: matieres.size,
      salles: salles.size,
      seances: scopedSeances.length,
      pointages: scopedPointages.length,
      presents,
      retards,
      absents,
      cahiers: scopedCahiers.length,
      cahiersSignesDelegue,
      cahiersClotures,
      vacationsTotal,
      vacationsPayees,
      vacationsMontant,
    }
  }, [scopedSeances, scopedPointages, scopedCahiers, scopedVacations])

  const chartData = useMemo(() => {
    return week.days.map((day) => {
      const count = scopedSeances.filter((seance) => seance.jour === day.key)
        .length

      return {
        label: day.short || day.label.slice(0, 3),
        value: count,
      }
    })
  }, [scopedSeances, week.days])

  const activities = useMemo(() => {
    const pointageActivities = scopedPointages.map((pointage) => {
      const seance = scopedSeances.find((item) => item.id === pointage.seanceId)

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
      const seance = scopedSeances.find((item) => item.id === cahier.seanceId)

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

    return [
      ...pointageActivities,
      ...cahierActivities,
      ...vacationActivities,
      ...(store.activities || []).map((activity, index) => ({
        id: `activity-${index}`,
        type: activity.type === 'alerte' ? 'AN' : 'AC',
        title: activity.title || 'Activité',
        text: activity.text || '',
      })),
    ]
      .slice(-6)
      .reverse()
  }, [
    scopedPointages,
    scopedCahiers,
    scopedVacations,
    scopedSeances,
    store.activities,
  ])

  const roleConfig = getRoleConfig(role)

  return (
    <div className="page dynamic-dashboard">
      <div className="page-heading dashboard-hero">
        <div>
          <span className="dashboard-kicker">{roleConfig.kicker}</span>
          <h1>{roleConfig.title}</h1>
          <p>{roleConfig.description}</p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => goTo(roleConfig.primaryTarget)}
        >
          {roleConfig.primaryAction}
        </button>
      </div>

      <div className="dashboard-scope-note">
        <div>
          <strong>{getRoleLabel(role)}</strong>
          <span>{getScopeText(role, teacherName, delegateClass)}</span>
        </div>

        <small>Semaine active : {week.label}</small>
      </div>

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

      <div className="dashboard-grid">
        <section className="panel dashboard-chart-panel">
          <div className="panel-header">
            <h3>Évolution des séances</h3>
            <span className="dashboard-week-badge">Cette semaine</span>
          </div>

          <div className="dashboard-bars">
            {chartData.map((item) => (
              <div key={item.label} className="dashboard-bar-item">
                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar-fill"
                    style={{
                      height: `${Math.max(12, item.value * 22)}px`,
                    }}
                  />
                </div>

                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="dashboard-mini-stats">
            <MiniStat label="Séances" value={stats.seances} />
            <MiniStat label="Pointages" value={stats.pointages} />
            <MiniStat label="Cahiers clôturés" value={stats.cahiersClotures} />
          </div>
        </section>

        <section className="panel dashboard-activity-panel">
          <div className="panel-header">
            <h3>Activités récentes</h3>
            <button type="button" onClick={() => goTo('reports')}>
              Voir tout
            </button>
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
          <button type="button" onClick={() => goTo('schedule')}>
            Emploi complet
          </button>
        </div>

        <div className="dashboard-next-list">
          {scopedSeances.slice(0, 5).map((seance) => (
            <div key={seance.id} className="dashboard-next-item">
              <div className="activity-icon">ET</div>

              <div>
                <strong>{seance.matiere}</strong>
                <span>
                  {seance.classe} • {seance.jour} • {formatSlot(seance.horaire)}
                </span>
                <small>
                  {seance.enseignant} — {seance.salle}
                </small>
              </div>
            </div>
          ))}

          {scopedSeances.length === 0 && (
            <div className="dashboard-empty">
              Aucune séance à afficher pour votre périmètre.
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
        label: 'Mes séances',
        value: stats.seances,
        code: 'ET',
        hint: 'Cette semaine',
      },
      {
        label: 'Présences',
        value: stats.presents,
        code: 'PR',
        hint: 'Validées',
      },
      {
        label: 'Cahiers clôturés',
        value: stats.cahiersClotures,
        code: 'CT',
        hint: 'Signés',
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
        label: 'Séances classe',
        value: stats.seances,
        code: 'CL',
        hint: 'Cette semaine',
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
        label: 'Séances',
        value: stats.seances,
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
        label: 'Vacations',
        value: stats.vacationsTotal,
        code: 'FV',
        hint: 'À viser',
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
      label: 'Classes',
      value: stats.classes,
      code: 'CL',
      hint: 'Classes actives',
    },
    {
      label: 'Enseignants',
      value: stats.enseignants,
      code: 'EN',
      hint: 'Personnel disponible',
    },
    {
      label: 'Matières',
      value: stats.matieres,
      code: 'MT',
      hint: 'Modules actifs',
    },
    {
      label: 'Salles',
      value: stats.salles,
      code: 'SL',
      hint: 'Salles utilisées',
    },
  ]
}

function getRoleConfig(role) {
  const configs = {
    admin: {
      kicker: 'Vue globale',
      title: 'Bonjour, Administrateur',
      description:
        'Vue globale sur la planification, les pointages, les cahiers et les vacations.',
      primaryAction: '+ Nouvelle séance',
      primaryTarget: 'schedule',
      sectionTitle: 'Séances planifiées',
    },
    enseignant: {
      kicker: 'Espace enseignant',
      title: 'Bonjour, Enseignant',
      description:
        'Suivez uniquement vos séances, signatures de cahier et fiches de vacation.',
      primaryAction: 'Signer un cahier',
      primaryTarget: 'cahier',
      sectionTitle: 'Mes prochaines séances',
    },
    delegue: {
      kicker: 'Espace délégué',
      title: 'Espace Délégué',
      description:
        'Suivez votre classe, les pointages et les cahiers de texte à signer.',
      primaryAction: 'Remplir un cahier',
      primaryTarget: 'cahier',
      sectionTitle: 'Planning de ma classe',
    },
    surveillant: {
      kicker: 'Contrôle',
      title: 'Espace Surveillant',
      description:
        'Contrôlez les présences, retards, absences et fiches à viser.',
      primaryAction: 'Contrôler pointages',
      primaryTarget: 'qr',
      sectionTitle: 'Séances à contrôler',
    },
    comptable: {
      kicker: 'Finance',
      title: 'Espace Comptable',
      description:
        'Validez les fiches de vacation et suivez les paiements enseignants.',
      primaryAction: 'Voir vacations',
      primaryTarget: 'vacations',
      sectionTitle: 'Séances liées aux vacations',
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

export default DynamicDashboard
