import { useMemo, useState } from 'react'
import './RapportsPage.css'
import {
  DEFAULT_CLASSES,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatMoney,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'
import {
  buildCardsHtml,
  buildTableHtml,
  exportHtmlToPdf,
} from '../services/pdfExport'

function RapportsPage({ user }) {
  const { store } = useAppStore()

  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const seancesData = store.seances || []
  const pointagesData = store.pointages || []
  const cahiersData = store.cahiers || []
  const vacationsData = store.vacations || []

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClass, setSelectedClass] = useState(
    role === 'delegue' && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedTeacher, setSelectedTeacher] = useState(
    role === 'enseignant' && teacherName ? teacherName : 'Tous',
  )
  const [message, setMessage] = useState('')

  const week =
    WEEK_OPTIONS.find((item) => item.key === selectedWeek) || WEEK_OPTIONS[0]

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

  const scopedSeances = useMemo(() => {
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
        selectedClass === 'Toutes' ? true : seance.classe === selectedClass,
      )
      .filter((seance) =>
        selectedTeacher === 'Tous'
          ? true
          : seance.enseignant === selectedTeacher,
      )
  }, [
    seancesData,
    selectedWeek,
    selectedClass,
    selectedTeacher,
    role,
    teacherName,
    delegateClass,
  ])

  const scopedPointages = useMemo(() => {
    const seanceIds = scopedSeances.map((item) => item.id)

    return pointagesData
      .filter((pointage) => seanceIds.includes(pointage.seanceId))
      .map((pointage) => {
        const seance = scopedSeances.find(
          (item) => item.id === pointage.seanceId,
        )

        return {
          ...pointage,
          seance,
        }
      })
  }, [pointagesData, scopedSeances])

  const scopedCahiers = useMemo(() => {
    const seanceIds = scopedSeances.map((item) => item.id)

    return cahiersData
      .filter((cahier) => seanceIds.includes(cahier.seanceId))
      .map((cahier) => {
        const seance = scopedSeances.find((item) => item.id === cahier.seanceId)

        return {
          ...cahier,
          seance,
        }
      })
  }, [cahiersData, scopedSeances])

  const scopedVacations = useMemo(() => {
    return vacationsData
      .map((vacation) => {
        const seance = seancesData.find((item) => item.id === vacation.seanceId)

        return {
          ...vacation,
          seance,
        }
      })
      .filter((vacation) => vacation.seance)
      .filter((vacation) => vacation.seance.weekKey === selectedWeek)
      .filter((vacation) => {
        if (role === 'enseignant' && teacherName) {
          return vacation.enseignant === teacherName
        }

        if (role === 'delegue') {
          return false
        }

        return true
      })
      .filter((vacation) =>
        selectedClass === 'Toutes'
          ? true
          : vacation.seance.classe === selectedClass,
      )
      .filter((vacation) =>
        selectedTeacher === 'Tous'
          ? true
          : vacation.enseignant === selectedTeacher,
      )
  }, [
    vacationsData,
    seancesData,
    selectedWeek,
    selectedClass,
    selectedTeacher,
    role,
    teacherName,
  ])

  const stats = useMemo(() => {
    const totalSeances = scopedSeances.length

    const pointages = scopedPointages.length

    const presents = scopedPointages.filter(
      (item) => item.statut === 'present',
    ).length

    const retards = scopedPointages.filter(
      (item) => item.statut === 'retard',
    ).length

    const absents = scopedPointages.filter(
      (item) => item.statut === 'absent',
    ).length

    const realisees = scopedPointages.filter((item) =>
      ['present', 'retard'].includes(item.statut),
    ).length

    const cahiers = scopedCahiers.length

    const cahiersClotures = scopedCahiers.filter((item) => item.locked).length

    const vacations = scopedVacations.length

    const vacationsValidees = scopedVacations.filter((item) =>
      ['validee', 'payee'].includes(item.statut),
    ).length

    const vacationsPayees = scopedVacations.filter(
      (item) => item.statut === 'payee',
    ).length

    const montantNet = scopedVacations.reduce(
      (sum, item) => sum + Number(item.montantNet || 0),
      0,
    )

    const tauxRealisation =
      totalSeances > 0 ? Math.round((realisees / totalSeances) * 100) : 0

    return {
      totalSeances,
      pointages,
      presents,
      retards,
      absents,
      realisees,
      tauxRealisation,
      cahiers,
      cahiersClotures,
      vacations,
      vacationsValidees,
      vacationsPayees,
      montantNet,
    }
  }, [scopedSeances, scopedPointages, scopedCahiers, scopedVacations])

  const chartData = useMemo(() => {
    return week.days.map((day) => {
      const seances = scopedSeances.filter((item) => item.jour === day.key)

      const pointages = scopedPointages.filter(
        (item) => item.seance?.jour === day.key,
      )

      const cahiers = scopedCahiers.filter(
        (item) => item.seance?.jour === day.key,
      )

      return {
        label: day.short || day.label.slice(0, 3),
        seances: seances.length,
        pointages: pointages.length,
        cahiers: cahiers.length,
      }
    })
  }, [week.days, scopedSeances, scopedPointages, scopedCahiers])

  const alerts = useMemo(() => {
    const missingPointages = scopedSeances
      .filter(
        (seance) =>
          !scopedPointages.some((pointage) => pointage.seanceId === seance.id),
      )
      .map((seance) => ({
        id: `missing-pointage-${seance.id}`,
        type: 'QR',
        title: 'Pointage manquant',
        text: `${seance.matiere} - ${seance.classe}`,
      }))

    const unsignedCahiers = scopedCahiers
      .filter((cahier) => !cahier.locked)
      .map((cahier) => ({
        id: `unsigned-cahier-${cahier.id || cahier.seanceId}`,
        type: 'CT',
        title: 'Cahier non clôturé',
        text: cahier.seance
          ? `${cahier.seance.matiere} - ${cahier.seance.classe}`
          : cahier.titre || 'Cahier de texte',
      }))

    const unpaidVacations = scopedVacations
      .filter((vacation) => vacation.statut !== 'payee')
      .map((vacation) => ({
        id: `unpaid-vacation-${vacation.id}`,
        type: 'FV',
        title: 'Vacation non payée',
        text: `${vacation.enseignant} - ${formatMoney(vacation.montantNet)}`,
      }))

    if (role === 'comptable') {
      return unpaidVacations.slice(0, 6)
    }

    if (role === 'surveillant') {
      return [...missingPointages, ...unsignedCahiers].slice(0, 6)
    }

    return [...missingPointages, ...unsignedCahiers, ...unpaidVacations].slice(
      0,
      6,
    )
  }, [scopedSeances, scopedPointages, scopedCahiers, scopedVacations, role])

  const exportPresencePdf = () => {
    const rows = scopedSeances.map((seance) => {
      const pointage = scopedPointages.find(
        (item) => item.seanceId === seance.id,
      )

      return [
        seance.classe,
        seance.matiere,
        seance.enseignant,
        seance.jour,
        formatSlot(seance.horaire),
        seance.salle,
        pointage ? formatPointage(pointage.statut) : 'Non pointé',
        pointage?.heureScan || '',
        pointage?.validePar || '',
      ]
    })

    const contentHtml = `
      ${buildCardsHtml([
        { label: 'Séances', value: stats.totalSeances },
        { label: 'Réalisées', value: stats.realisees },
        { label: 'Pointages', value: stats.pointages },
        { label: 'Taux', value: `${stats.tauxRealisation}%` },
      ])}

      <div class="pdf-section">
        <h2>Détail des présences</h2>
        ${buildTableHtml(
          [
            'Classe',
            'Matière',
            'Enseignant',
            'Jour',
            'Horaire',
            'Salle',
            'Statut',
            'Heure scan',
            'Validé par',
          ],
          rows,
        )}
      </div>
    `

    exportHtmlToPdf({
      title: 'Rapport de présence',
      subtitle: week.label,
      filename: 'rapport-presence.pdf',
      contentHtml,
    })

    setMessage('Rapport de présence PDF généré.')
  }

  const exportCahiersPdf = () => {
    const rows = scopedCahiers.map((cahier) => [
      cahier.seance?.classe || '',
      cahier.seance?.matiere || '',
      cahier.seance?.enseignant || '',
      cahier.seance?.jour || '',
      formatSlot(cahier.seance?.horaire || ''),
      cahier.titre || '',
      cahier.signatureDelegue ? 'Oui' : 'Non',
      cahier.signatureEnseignant ? 'Oui' : 'Non',
      cahier.locked ? 'Oui' : 'Non',
    ])

    const contentHtml = `
      ${buildCardsHtml([
        { label: 'Cahiers', value: stats.cahiers },
        { label: 'Clôturés', value: stats.cahiersClotures },
        { label: 'Séances', value: stats.totalSeances },
        { label: 'Semaine', value: week.label },
      ])}

      <div class="pdf-section">
        <h2>Détail des cahiers de texte</h2>
        ${buildTableHtml(
          [
            'Classe',
            'Matière',
            'Enseignant',
            'Jour',
            'Horaire',
            'Titre',
            'Délégué signé',
            'Enseignant signé',
            'Clôturé',
          ],
          rows,
        )}
      </div>
    `

    exportHtmlToPdf({
      title: 'Rapport des cahiers de texte',
      subtitle: week.label,
      filename: 'rapport-cahiers.pdf',
      contentHtml,
    })

    setMessage('Rapport des cahiers PDF généré.')
  }

  const exportVacationsPdf = () => {
    const rows = scopedVacations.map((vacation) => [
      vacation.enseignant,
      vacation.seance?.classe || '',
      vacation.seance?.matiere || '',
      vacation.seance?.jour || '',
      formatSlot(vacation.seance?.horaire || ''),
      `${vacation.heures}h`,
      formatMoney(vacation.tauxHoraire),
      formatMoney(vacation.montantBrut),
      formatMoney(vacation.retenue),
      formatMoney(vacation.montantNet),
      formatVacationStatus(vacation.statut),
    ])

    const contentHtml = `
      ${buildCardsHtml([
        { label: 'Fiches', value: stats.vacations },
        { label: 'Validées', value: stats.vacationsValidees },
        { label: 'Payées', value: stats.vacationsPayees },
        { label: 'Montant net', value: formatMoney(stats.montantNet) },
      ])}

      <div class="pdf-section">
        <h2>Détail des fiches de vacation</h2>
        ${buildTableHtml(
          [
            'Enseignant',
            'Classe',
            'Matière',
            'Jour',
            'Horaire',
            'Heures',
            'Taux',
            'Brut',
            'Retenue',
            'Net',
            'Statut',
          ],
          rows,
        )}
      </div>
    `

    exportHtmlToPdf({
      title: 'Rapport des vacations',
      subtitle: week.label,
      filename: 'rapport-vacations.pdf',
      contentHtml,
    })

    setMessage('Rapport des vacations PDF généré.')
  }

  const exportSummaryPdf = () => {
    const contentHtml = `
      ${buildCardsHtml([
        { label: 'Séances', value: stats.totalSeances },
        { label: 'Réalisées', value: stats.realisees },
        { label: 'Pointages', value: stats.pointages },
        { label: 'Cahiers clôturés', value: stats.cahiersClotures },
        { label: 'Vacations', value: stats.vacations },
        { label: 'Montant net', value: formatMoney(stats.montantNet) },
      ])}

      <div class="pdf-section">
        <h2>Synthèse générale</h2>
        ${buildTableHtml(
          ['Indicateur', 'Valeur'],
          [
            ['Séances planifiées', stats.totalSeances],
            ['Séances réalisées', stats.realisees],
            ['Taux de réalisation', `${stats.tauxRealisation}%`],
            ['Pointages', stats.pointages],
            ['Présences', stats.presents],
            ['Retards', stats.retards],
            ['Absences', stats.absents],
            ['Cahiers renseignés', stats.cahiers],
            ['Cahiers clôturés', stats.cahiersClotures],
            ['Fiches de vacation', stats.vacations],
            ['Vacations validées', stats.vacationsValidees],
            ['Vacations payées', stats.vacationsPayees],
            ['Montant net vacations', formatMoney(stats.montantNet)],
          ],
        )}
      </div>
    `

    exportHtmlToPdf({
      title: 'Rapport de synthèse',
      subtitle: week.label,
      filename: 'rapport-synthese.pdf',
      contentHtml,
    })

    setMessage('Rapport de synthèse PDF généré.')
  }

  const roleConfig = getRoleConfig(role)

  return (
    <div className="page rapports-page">
      <div className="page-heading">
        <div>
          <h1>Rapports & Statistiques</h1>
          <p>{roleConfig.description}</p>
        </div>

        <button className="primary-btn" onClick={exportSummaryPdf}>
          Exporter PDF
        </button>
      </div>

      <div className="rapport-scope-note">
        <div>
          <strong>{getRoleLabel(role)}</strong>
          <span>{roleConfig.scope}</span>
        </div>

        <small>{week.label}</small>
      </div>

      <div className="rapport-toolbar">
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

        <div className="isge-filter">
          <label>Classe</label>
          <select
            value={selectedClass}
            disabled={role === 'delegue'}
            onChange={(e) => {
              setSelectedClass(e.target.value)
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
      </div>

      {message && <div className="rapport-message">{message}</div>}

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

      <div className="rapport-grid">
        <section className="panel rapport-chart-panel">
          <div className="panel-header">
            <h3>Indicateurs de la semaine</h3>
            <span className="rapport-badge">Données dynamiques</span>
          </div>

          <div className="rapport-chart">
            {chartData.map((item) => (
              <div key={item.label} className="rapport-chart-item">
                <div className="rapport-chart-bars">
                  <span
                    className="bar seances"
                    style={{
                      height: `${Math.max(10, item.seances * 18)}px`,
                    }}
                  />
                  <span
                    className="bar pointages"
                    style={{
                      height: `${Math.max(10, item.pointages * 18)}px`,
                    }}
                  />
                  <span
                    className="bar cahiers"
                    style={{
                      height: `${Math.max(10, item.cahiers * 18)}px`,
                    }}
                  />
                </div>

                <strong>{item.label}</strong>
              </div>
            ))}
          </div>

          <div className="rapport-legend">
            <span>
              <i className="seances" /> Séances
            </span>
            <span>
              <i className="pointages" /> Pointages
            </span>
            <span>
              <i className="cahiers" /> Cahiers
            </span>
          </div>
        </section>

        <section className="panel rapport-export-panel">
          <div className="panel-header">
            <h3>Exports PDF disponibles</h3>
            <button onClick={exportSummaryPdf}>Synthèse</button>
          </div>

          <div className="rapport-export-list">
            <ExportItem
              code="QR"
              title="Rapport de présence"
              text="PDF des pointages, retards et absences"
              onClick={exportPresencePdf}
            />

            <ExportItem
              code="CT"
              title="Rapport cahiers"
              text="PDF des cahiers et signatures"
              onClick={exportCahiersPdf}
            />

            {role !== 'delegue' && (
              <ExportItem
                code="FV"
                title="Rapport vacations"
                text="PDF des montants et paiements"
                onClick={exportVacationsPdf}
              />
            )}

            <ExportItem
              code="SY"
              title="Synthèse globale"
              text="PDF des indicateurs principaux"
              onClick={exportSummaryPdf}
            />
          </div>
        </section>
      </div>

      <div className="rapport-grid bottom">
        <section className="panel rapport-table-panel">
          <div className="panel-header">
            <h3>Résumé des séances</h3>
            <button>{scopedSeances.length} ligne(s)</button>
          </div>

          <div className="rapport-table-wrap">
            <table className="rapport-table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Matière</th>
                  <th>Professeur</th>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Pointage</th>
                  <th>Cahier</th>
                </tr>
              </thead>

              <tbody>
                {scopedSeances.map((seance) => {
                  const pointage = scopedPointages.find(
                    (item) => item.seanceId === seance.id,
                  )

                  const cahier = scopedCahiers.find(
                    (item) => item.seanceId === seance.id,
                  )

                  return (
                    <tr key={seance.id}>
                      <td>{seance.classe}</td>
                      <td>{seance.matiere}</td>
                      <td>{seance.enseignant}</td>
                      <td>{seance.jour}</td>
                      <td>{formatSlot(seance.horaire)}</td>
                      <td>
                        <StatusPill
                          value={
                            pointage
                              ? formatPointage(pointage.statut)
                              : 'Non pointé'
                          }
                          type={pointage?.statut || 'neutral'}
                        />
                      </td>
                      <td>
                        <StatusPill
                          value={
                            cahier
                              ? cahier.locked
                                ? 'Clôturé'
                                : 'Ouvert'
                              : 'Non renseigné'
                          }
                          type={cahier?.locked ? 'success' : 'neutral'}
                        />
                      </td>
                    </tr>
                  )
                })}

                {scopedSeances.length === 0 && (
                  <tr>
                    <td colSpan={7}>Aucune séance pour ces filtres.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel rapport-alert-panel">
          <div className="panel-header">
            <h3>Points à surveiller</h3>
            <button>{alerts.length}</button>
          </div>

          <div className="rapport-alert-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="rapport-alert-item">
                <div className="rapport-alert-icon">{alert.type}</div>

                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.text}</span>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="rapport-empty">
                Aucun point critique pour ce périmètre.
              </div>
            )}
          </div>
        </section>
      </div>
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

function ExportItem({ code, title, text, onClick }) {
  return (
    <button className="rapport-export-item" onClick={onClick}>
      <div className="rapport-export-icon">{code}</div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </button>
  )
}

function StatusPill({ value, type }) {
  return <span className={`rapport-status ${type}`}>{value}</span>
}

function getStatCards(role, stats) {
  if (role === 'comptable') {
    return [
      {
        label: 'Fiches',
        value: stats.vacations,
        code: 'FV',
        hint: 'Vacations',
      },
      {
        label: 'Validées',
        value: stats.vacationsValidees,
        code: 'OK',
        hint: 'Comptabilité',
      },
      {
        label: 'Payées',
        value: stats.vacationsPayees,
        code: 'PY',
        hint: 'Paiements',
      },
      {
        label: 'Montant',
        value: formatShortMoney(stats.montantNet),
        code: 'FC',
        hint: 'FCFA net',
      },
    ]
  }

  if (role === 'enseignant') {
    return [
      {
        label: 'Mes séances',
        value: stats.totalSeances,
        code: 'SE',
        hint: 'Planifiées',
      },
      {
        label: 'Présences',
        value: stats.presents,
        code: 'PR',
        hint: 'Validées',
      },
      {
        label: 'Cahiers',
        value: stats.cahiersClotures,
        code: 'CT',
        hint: 'Clôturés',
      },
      {
        label: 'Vacations',
        value: stats.vacations,
        code: 'FV',
        hint: 'Mes fiches',
      },
    ]
  }

  if (role === 'delegue') {
    return [
      {
        label: 'Séances',
        value: stats.totalSeances,
        code: 'SE',
        hint: 'Classe',
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
        label: 'Clôturés',
        value: stats.cahiersClotures,
        code: 'OK',
        hint: 'Signés',
      },
    ]
  }

  return [
    {
      label: 'Séances',
      value: stats.totalSeances,
      code: 'SE',
      hint: 'Planifiées',
    },
    {
      label: 'Réalisées',
      value: stats.realisees,
      code: 'SR',
      hint: `${stats.tauxRealisation}%`,
    },
    {
      label: 'Pointages',
      value: stats.pointages,
      code: 'QR',
      hint: 'Validés',
    },
    {
      label: 'Rapports',
      value: getAvailableReportCount(role),
      code: 'RP',
      hint: 'Disponibles',
    },
  ]
}

function getAvailableReportCount(role) {
  if (role === 'delegue') return 3
  return 4
}

function getRoleConfig(role) {
  const configs = {
    admin: {
      description:
        'Analyse dynamique des séances, présences, cahiers et vacations.',
      scope: 'Vue complète de tous les rapports disponibles.',
    },
    enseignant: {
      description:
        'Analyse dynamique de vos séances, cahiers et fiches de vacation.',
      scope: 'Rapports filtrés selon le professeur connecté.',
    },
    delegue: {
      description:
        'Analyse dynamique des séances et cahiers de votre classe.',
      scope: 'Rapports filtrés selon la classe du délégué.',
    },
    surveillant: {
      description:
        'Analyse dynamique des présences, retards, absences et cahiers.',
      scope: 'Vue orientée contrôle pédagogique et anomalies.',
    },
    comptable: {
      description:
        'Analyse dynamique des vacations, validations et paiements.',
      scope: 'Vue orientée fiches de vacation et paiements.',
    },
  }

  return configs[role] || configs.admin
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

function formatPointage(status) {
  const labels = {
    present: 'Présent',
    retard: 'Retard',
    absent: 'Absent',
    non_pointe: 'Non pointé',
  }

  return labels[status] || status
}

function formatVacationStatus(status) {
  const labels = {
    en_attente: 'En attente',
    signee_enseignant: 'Signée enseignant',
    visee: 'Visée',
    validee: 'Validée',
    payee: 'Payée',
  }

  return labels[status] || status
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

export default RapportsPage