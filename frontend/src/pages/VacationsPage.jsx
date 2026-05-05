import { useMemo, useState } from 'react'
import './VacationsPage.css'
import {
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatMoney,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getTeacherNameFromUser } from '../services/userScope'
import {
  buildCardsHtml,
  buildTableHtml,
  exportHtmlToPdf,
} from '../services/pdfExport'

function VacationsPage({ user }) {
  const { store, actions } = useAppStore()

  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const permissions = getPermissions(role)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedTeacher, setSelectedTeacher] = useState(
    role === 'enseignant' && teacherName ? teacherName : 'Tous',
  )
  const [selectedStatus, setSelectedStatus] = useState('Tous')
  const [selectedVacationId, setSelectedVacationId] = useState(null)
  const [message, setMessage] = useState('')

  const teachers = useMemo(() => {
    const unique = [
      ...new Set((store.seances || []).map((item) => item.enseignant).filter(Boolean)),
    ]

    return ['Tous', ...unique]
  }, [store.seances])

  const enrichedVacations = useMemo(() => {
    return (store.vacations || [])
      .map((vacation) => {
        const seance =
          (store.seances || []).find((item) => item.id === vacation.seanceId) || null

        const cahier =
          (store.cahiers || []).find((item) => item.seanceId === vacation.seanceId) ||
          null

        return {
          ...vacation,
          seance,
          cahier,
        }
      })
      .filter((vacation) => vacation.seance)
      .filter((vacation) => vacation.seance.weekKey === selectedWeek)
      .filter((vacation) =>
        role === 'enseignant' && teacherName
          ? vacation.enseignant === teacherName
          : true,
      )
      .filter((vacation) =>
        selectedTeacher === 'Tous'
          ? true
          : vacation.enseignant === selectedTeacher,
      )
      .filter((vacation) =>
        selectedStatus === 'Tous' ? true : vacation.statut === selectedStatus,
      )
  }, [
    store.vacations,
    store.seances,
    store.cahiers,
    selectedWeek,
    selectedTeacher,
    selectedStatus,
    role,
    teacherName,
  ])

  const selectedVacation = useMemo(() => {
    if (!selectedVacationId) return enrichedVacations[0] || null

    return (
      enrichedVacations.find((item) => item.id === selectedVacationId) ||
      enrichedVacations[0] ||
      null
    )
  }, [selectedVacationId, enrichedVacations])

  const stats = useMemo(() => {
    const total = enrichedVacations.length

    const enAttente = enrichedVacations.filter(
      (item) => item.statut === 'en_attente',
    ).length

    const visees = enrichedVacations.filter((item) => item.statut === 'visee')
      .length

    const validees = enrichedVacations.filter(
      (item) => item.statut === 'validee' || item.statut === 'payee',
    ).length

    const montant = enrichedVacations.reduce(
      (sum, item) => sum + Number(item.montantNet || 0),
      0,
    )

    return {
      total,
      enAttente,
      visees,
      validees,
      montant,
    }
  }, [enrichedVacations])

  const closedCahiersWithoutVacation = useMemo(() => {
    return (store.cahiers || [])
      .filter((cahier) => cahier.locked)
      .map((cahier) => {
        const seance = (store.seances || []).find(
          (item) => item.id === cahier.seanceId,
        )

        const vacation = (store.vacations || []).find(
          (item) => item.seanceId === cahier.seanceId,
        )

        return {
          cahier,
          seance,
          vacation,
        }
      })
      .filter((item) => item.seance && !item.vacation)
      .filter((item) => item.seance.weekKey === selectedWeek)
      .filter((item) =>
        role === 'enseignant' && teacherName
          ? item.seance.enseignant === teacherName
          : true,
      )
  }, [
    store.cahiers,
    store.seances,
    store.vacations,
    selectedWeek,
    role,
    teacherName,
  ])

  const generateMissingVacations = () => {
    if (!permissions.canGenerate) {
      setMessage('Vous n’avez pas le droit de générer les fiches de vacation.')
      return
    }

    if (closedCahiersWithoutVacation.length === 0) {
      setMessage('Aucun cahier clôturé sans fiche de vacation.')
      return
    }

    closedCahiersWithoutVacation.forEach((item) => {
      actions.generateVacation(item.seance.id)
    })

    setMessage(
      `${closedCahiersWithoutVacation.length} fiche(s) générée(s) depuis les cahiers clôturés.`,
    )
  }

  const changeStatus = (vacation, statut) => {
    if (!vacation) return

    const allowed = canChangeToStatus(role, statut)

    if (!allowed) {
      setMessage('Action non autorisée pour votre rôle.')
      return
    }

    const result = actions.updateVacationStatus(vacation.id, statut)

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de la mise à jour.')
      return
    }

    setMessage(`Statut mis à jour : ${formatVacationStatus(statut)}.`)
  }

  const exportVacationPdf = () => {
    if (!selectedVacation) {
      setMessage('Aucune fiche de vacation sélectionnée.')
      return
    }

    const seance = selectedVacation.seance

    const contentHtml = `
      <div class="pdf-page">
        ${buildCardsHtml([
          { label: 'Enseignant', value: selectedVacation.enseignant },
          { label: 'Classe', value: seance?.classe || '—' },
          { label: 'Matière', value: seance?.matiere || '—' },
          { label: 'Heures', value: `${selectedVacation.heures}h` },
          {
            label: 'Taux horaire',
            value: formatMoney(selectedVacation.tauxHoraire),
          },
          {
            label: 'Montant brut',
            value: formatMoney(selectedVacation.montantBrut),
          },
          {
            label: 'Retenue',
            value: formatMoney(selectedVacation.retenue),
          },
          {
            label: 'Montant net',
            value: formatMoney(selectedVacation.montantNet),
          },
        ])}

        <div class="pdf-section">
          <h2>Détails de la séance</h2>
          ${buildTableHtml(
            ['Champ', 'Valeur'],
            [
              ['Classe', seance?.classe || '—'],
              ['Matière', seance?.matiere || '—'],
              ['Enseignant', selectedVacation.enseignant],
              ['Jour', seance?.jour || '—'],
              ['Horaire', formatSlot(seance?.horaire || '')],
              ['Salle', seance?.salle || '—'],
              ['Type', seance?.type?.toUpperCase() || 'COURS'],
            ],
          )}
        </div>

        <div class="pdf-section">
          <h2>Calcul de la vacation</h2>
          ${buildTableHtml(
            ['Élément', 'Valeur'],
            [
              ['Heures effectuées', `${selectedVacation.heures}h`],
              ['Taux horaire', formatMoney(selectedVacation.tauxHoraire)],
              ['Montant brut', formatMoney(selectedVacation.montantBrut)],
              ['Retenue', formatMoney(selectedVacation.retenue)],
              ['Montant net', formatMoney(selectedVacation.montantNet)],
            ],
          )}
        </div>

        <div class="pdf-section">
          <h2>Workflow de validation</h2>
          ${buildTableHtml(
            ['Étape', 'Statut'],
            [
              [
                'Signature enseignant',
                [
                  'signee_enseignant',
                  'visee',
                  'validee',
                  'payee',
                ].includes(selectedVacation.statut)
                  ? 'Effectuée'
                  : 'En attente',
              ],
              [
                'Visa surveillant',
                ['visee', 'validee', 'payee'].includes(selectedVacation.statut)
                  ? 'Effectué'
                  : 'En attente',
              ],
              [
                'Validation comptable',
                ['validee', 'payee'].includes(selectedVacation.statut)
                  ? 'Effectuée'
                  : 'En attente',
              ],
              [
                'Paiement',
                selectedVacation.statut === 'payee'
                  ? 'Payé'
                  : 'Non payé',
              ],
              ['Statut actuel', formatVacationStatus(selectedVacation.statut)],
            ],
          )}
        </div>
      </div>
    `

    exportHtmlToPdf({
      title: 'Fiche de vacation',
      subtitle: `${selectedVacation.enseignant} - ${seance?.matiere || ''}`,
      filename: makePdfFilename(
        `fiche-vacation-${selectedVacation.enseignant}-${seance?.matiere || ''}.pdf`,
      ),
      contentHtml,
    })

    setMessage('PDF de la fiche de vacation généré.')
  }

  if (role === 'delegue') {
    return (
      <div className="page">
        <div className="placeholder">
          <div>
            <div className="placeholder-icon">FV</div>
            <h1>Accès non autorisé</h1>
            <p>
              Les fiches de vacation ne sont pas disponibles pour le rôle
              délégué.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page vacation-page">
      <div className="page-heading">
        <div>
          <h1>Fiches de vacation</h1>
          <p>
            Suivi des heures effectuées, visas, validations et paiements des
            enseignants.
          </p>
        </div>

        {permissions.canGenerate && (
          <button className="primary-btn" onClick={generateMissingVacations}>
            Générer depuis les cahiers
          </button>
        )}
      </div>

      <div className="vacation-role-note">
        <strong>{getRoleLabel(role)}</strong>
        <span>{getRoleDescription(role)}</span>
      </div>

      <div className="stats-grid">
        <StatBox label="Fiches" value={stats.total} code="FV" />
        <StatBox label="En attente" value={stats.enAttente} code="AT" />
        <StatBox label="Visées" value={stats.visees} code="VS" />
        <StatBox
          label="Montant net"
          value={formatShortMoney(stats.montant)}
          code="FC"
        />
      </div>

      <div className="vacation-toolbar">
        <div className="isge-filter">
          <label>Semaine</label>
          <select
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value)
              setSelectedVacationId(null)
              setMessage('')
            }}
          >
            {WEEK_OPTIONS.map((week) => (
              <option key={week.key} value={week.key}>
                {week.label}
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
              setSelectedVacationId(null)
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
          <label>Statut</label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setSelectedVacationId(null)
              setMessage('')
            }}
          >
            <option value="Tous">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="signee_enseignant">Signée enseignant</option>
            <option value="visee">Visée surveillant</option>
            <option value="validee">Validée comptable</option>
            <option value="payee">Payée</option>
          </select>
        </div>
      </div>

      {message && <div className="vacation-message">{message}</div>}

      {closedCahiersWithoutVacation.length > 0 && permissions.canGenerate && (
        <div className="vacation-alert">
          {closedCahiersWithoutVacation.length} cahier(s) clôturé(s) n’ont pas
          encore de fiche de vacation.
        </div>
      )}

      <div className="vacation-grid">
        <section className="panel large">
          <div className="panel-header">
            <h3>Liste des fiches</h3>
            <button>{enrichedVacations.length} fiche(s)</button>
          </div>

          <div className="vacation-list">
            {enrichedVacations.length === 0 && (
              <div className="vacation-empty">
                Aucune fiche disponible pour ce filtre.
              </div>
            )}

            {enrichedVacations.map((vacation) => (
              <button
                key={vacation.id}
                className={
                  selectedVacation?.id === vacation.id
                    ? 'vacation-card active'
                    : 'vacation-card'
                }
                onClick={() => {
                  setSelectedVacationId(vacation.id)
                  setMessage('')
                }}
              >
                <div>
                  <strong>{vacation.enseignant}</strong>
                  <span>
                    {vacation.seance?.matiere} • {vacation.seance?.classe}
                  </span>
                  <small>
                    {vacation.heures}h • {formatMoney(vacation.montantNet)}
                  </small>
                </div>

                <VacationStatus statut={vacation.statut} />
              </button>
            ))}
          </div>
        </section>

        <section className="panel vacation-detail-panel">
          <div className="panel-header">
            <h3>Détail de la fiche</h3>
            <button>
              {selectedVacation
                ? formatVacationStatus(selectedVacation.statut)
                : 'Aucune fiche'}
            </button>
          </div>

          {!selectedVacation ? (
            <div className="vacation-empty">
              Sélectionnez une fiche de vacation.
            </div>
          ) : (
            <>
              <div className="vacation-teacher-card">
                <div className="avatar">
                  {selectedVacation.enseignant?.charAt(0) || 'E'}
                </div>

                <div>
                  <strong>{selectedVacation.enseignant}</strong>
                  <span>{selectedVacation.seance?.matiere}</span>
                  <small>{selectedVacation.seance?.classe}</small>
                </div>
              </div>

              <div className="vacation-info-grid">
                <Info label="Jour" value={selectedVacation.seance?.jour} />

                <Info
                  label="Horaire"
                  value={formatSlot(selectedVacation.seance?.horaire || '')}
                />

                <Info label="Salle" value={selectedVacation.seance?.salle} />

                <Info
                  label="Type"
                  value={selectedVacation.seance?.type?.toUpperCase()}
                />
              </div>

              <div className="vacation-money-box">
                <div>
                  <span>Heures effectuées</span>
                  <strong>{selectedVacation.heures}h</strong>
                </div>

                <div>
                  <span>Taux horaire</span>
                  <strong>{formatMoney(selectedVacation.tauxHoraire)}</strong>
                </div>

                <div>
                  <span>Montant brut</span>
                  <strong>{formatMoney(selectedVacation.montantBrut)}</strong>
                </div>

                <div>
                  <span>Retenue</span>
                  <strong>{formatMoney(selectedVacation.retenue)}</strong>
                </div>

                <div className="net">
                  <span>Montant net</span>
                  <strong>{formatMoney(selectedVacation.montantNet)}</strong>
                </div>
              </div>

              <div className="vacation-workflow">
                <WorkflowStep
                  title="Signature enseignant"
                  active={[
                    'signee_enseignant',
                    'visee',
                    'validee',
                    'payee',
                  ].includes(selectedVacation.statut)}
                />

                <WorkflowStep
                  title="Visa surveillant"
                  active={['visee', 'validee', 'payee'].includes(
                    selectedVacation.statut,
                  )}
                />

                <WorkflowStep
                  title="Validation comptable"
                  active={['validee', 'payee'].includes(
                    selectedVacation.statut,
                  )}
                />

                <WorkflowStep
                  title="Paiement"
                  active={selectedVacation.statut === 'payee'}
                />
              </div>

              <div className="vacation-actions">
                {role === 'enseignant' &&
                  selectedVacation.statut === 'en_attente' && (
                    <button
                      className="primary-btn"
                      onClick={() =>
                        changeStatus(selectedVacation, 'signee_enseignant')
                      }
                    >
                      Signer ma fiche
                    </button>
                  )}

                {role === 'surveillant' &&
                  ['en_attente', 'signee_enseignant'].includes(
                    selectedVacation.statut,
                  ) && (
                    <button
                      className="vacation-visa-btn"
                      onClick={() => changeStatus(selectedVacation, 'visee')}
                    >
                      Viser la fiche
                    </button>
                  )}

                {['admin', 'comptable'].includes(role) &&
                  ['en_attente', 'signee_enseignant', 'visee'].includes(
                    selectedVacation.statut,
                  ) && (
                    <button
                      className="primary-btn"
                      onClick={() => changeStatus(selectedVacation, 'validee')}
                    >
                      Valider comptabilité
                    </button>
                  )}

                {['admin', 'comptable'].includes(role) &&
                  selectedVacation.statut === 'validee' && (
                    <button
                      className="vacation-pay-btn"
                      onClick={() => changeStatus(selectedVacation, 'payee')}
                    >
                      Marquer comme payée
                    </button>
                  )}

                <button className="isge-secondary-btn" onClick={exportVacationPdf}>
                  Télécharger fiche PDF
                </button>
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
        <span>Fiches de vacation</span>
      </div>

      <div className="stat-icon">{code}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="vacation-info">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

function VacationStatus({ statut }) {
  return (
    <div className={`vacation-status ${statut}`}>
      {formatVacationStatus(statut)}
    </div>
  )
}

function WorkflowStep({ title, active }) {
  return (
    <div className={active ? 'workflow-step active' : 'workflow-step'}>
      <span>{active ? '✓' : '•'}</span>
      <strong>{title}</strong>
    </div>
  )
}

function getPermissions(role) {
  return {
    canGenerate: ['admin', 'surveillant', 'comptable', 'enseignant'].includes(
      role,
    ),
  }
}

function canChangeToStatus(role, statut) {
  if (role === 'admin') return true
  if (role === 'enseignant') return statut === 'signee_enseignant'
  if (role === 'surveillant') return statut === 'visee'
  if (role === 'comptable') return ['validee', 'payee'].includes(statut)

  return false
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
      'Vous voyez toutes les fiches et pouvez corriger le workflow complet.',
    enseignant:
      'Vous voyez uniquement vos fiches de vacation et vous pouvez les signer.',
    surveillant:
      'Vous contrôlez les fiches et apposez le visa de surveillance.',
    comptable:
      'Vous validez les fiches et marquez les paiements effectués.',
    delegue:
      'Le délégué n’intervient pas dans les fiches de vacation.',
  }

  return descriptions[role] || 'Gestion des fiches de vacation.'
}

function formatVacationStatus(statut) {
  const labels = {
    en_attente: 'En attente',
    signee_enseignant: 'Signée enseignant',
    visee: 'Visée',
    validee: 'Validée',
    payee: 'Payée',
  }

  return labels[statut] || statut
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

function makePdfFilename(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
}

export default VacationsPage