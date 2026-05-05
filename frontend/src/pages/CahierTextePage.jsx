import { useEffect, useMemo, useState } from 'react'
import './CahierTextePage.css'
import {
  DEFAULT_CLASSES,
  DEFAULT_WEEK_KEY,
  WEEK_OPTIONS,
  formatSlot,
  useAppStore,
} from '../services/appStore'
import { getClassNameFromUser, getTeacherNameFromUser } from '../services/userScope'

const EMPTY_FORM = {
  titre: '',
  contenu: '',
  travaux: '',
  observation: '',
}

function CahierTextePage({ user }) {
  const { store, actions } = useAppStore()

  const role = user?.role || 'admin'
  const permissions = getPermissions(role)
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const [selectedWeek, setSelectedWeek] = useState(DEFAULT_WEEK_KEY)
  const [selectedClasse, setSelectedClasse] = useState(
    role === 'delegue' && delegateClass ? delegateClass : 'Toutes',
  )
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState('')

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
        role === 'enseignant' && teacherName
          ? item.enseignant === teacherName
          : true,
      )
      .filter((item) =>
        role === 'delegue' && delegateClass
          ? item.classe === delegateClass
          : true,
      )
      .filter((item) => {
        if (role !== 'comptable') return true

        return store.cahiers.some(
          (cahier) => cahier.seanceId === item.id && cahier.locked,
        )
      })
      .sort((a, b) => {
        const dayA = week.days.findIndex((day) => day.key === a.jour)
        const dayB = week.days.findIndex((day) => day.key === b.jour)

        if (dayA !== dayB) return dayA - dayB

        return a.horaire.localeCompare(b.horaire)
      })
  }, [
    store.seances,
    store.cahiers,
    selectedWeek,
    selectedClasse,
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

  const cahier = useMemo(() => {
    if (!selectedSeance) return null
    return (
      store.cahiers.find((item) => item.seanceId === selectedSeance.id) || null
    )
  }, [store.cahiers, selectedSeance])

  const pointage = useMemo(() => {
    if (!selectedSeance) return null
    return (
      store.pointages.find((item) => item.seanceId === selectedSeance.id) ||
      null
    )
  }, [store.pointages, selectedSeance])

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
    const seanceIds = seances.map((item) => item.id)

    const cahiersForFilter = store.cahiers.filter((item) =>
      seanceIds.includes(item.seanceId),
    )

    return {
      seances: seances.length,
      renseignes: cahiersForFilter.length,
      signesDelegue: cahiersForFilter.filter((item) => item.signatureDelegue)
        .length,
      clotures: cahiersForFilter.filter((item) => item.locked).length,
    }
  }, [seances, store.cahiers])

  const canEdit =
    selectedSeance &&
    permissions.canFill &&
    (!cahier || !cahier.locked)

  const canSignDelegue =
    selectedSeance &&
    cahier &&
    permissions.canSignDelegue &&
    !cahier.signatureDelegue &&
    !cahier.locked

  const canSignTeacher =
    selectedSeance &&
    cahier &&
    permissions.canSignTeacher &&
    cahier.signatureDelegue &&
    !cahier.signatureEnseignant &&
    !cahier.locked

  const saveCahier = () => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!permissions.canFill) {
      setMessage('Vous n’avez pas le droit de remplir le cahier de texte.')
      return
    }

    if (cahier?.locked) {
      setMessage('Ce cahier est verrouillé. Il ne peut plus être modifié.')
      return
    }

    if (!form.titre.trim() || !form.contenu.trim()) {
      setMessage('Le titre et le contenu de la séance sont obligatoires.')
      return
    }

    const result = actions.saveCahier(selectedSeance.id, {
      ...form,
      statut: cahier?.statut || 'brouillon',
    })

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de l’enregistrement.')
      return
    }

    setMessage('Cahier de texte enregistré avec succès.')
  }

  const signDelegue = () => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli avant signature.')
      return
    }

    const result = actions.signCahier(selectedSeance.id, 'delegue')

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de la signature.')
      return
    }

    setMessage('Signature du délégué enregistrée.')
  }

  const signTeacher = () => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli.')
      return
    }

    if (!cahier.signatureDelegue) {
      setMessage('Le délégué doit signer avant l’enseignant.')
      return
    }

    const result = actions.signCahier(selectedSeance.id, 'enseignant')

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de la signature enseignant.')
      return
    }

    actions.generateVacation(selectedSeance.id)

    setMessage(
      'Signature enseignant enregistrée. Le cahier est clôturé et la vacation est générée.',
    )
  }

  return (
    <div className="page cahier-page">
      <div className="page-heading">
        <div>
          <h1>Cahier de texte</h1>
          <p>
            Suivi du contenu pédagogique, signatures et clôture des séances.
          </p>
        </div>

        {selectedSeance && canEdit && (
          <button className="primary-btn" onClick={saveCahier}>
            Enregistrer le cahier
          </button>
        )}
      </div>

      <div className="cahier-role-note">
        <strong>{getRoleLabel(role)}</strong>
        <span>{getRoleDescription(role)}</span>
      </div>

      <div className="stats-grid">
        <StatBox label="Séances" value={stats.seances} code="SE" />
        <StatBox label="Renseignés" value={stats.renseignes} code="CT" />
        <StatBox label="Signés délégué" value={stats.signesDelegue} code="SD" />
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
      </div>

      {message && <div className="cahier-message">{message}</div>}

      <div className="cahier-grid">
        <section className="panel large">
          <div className="panel-header">
            <h3>Séances</h3>
            <button>{seances.length} séance(s)</button>
          </div>

          <div className="cahier-session-list">
            {seances.length === 0 && (
              <div className="cahier-empty-state">
                Aucune séance disponible pour ce filtre.
              </div>
            )}

            {seances.map((seance) => {
              const itemCahier =
                store.cahiers.find((item) => item.seanceId === seance.id) ||
                null

              const itemPointage =
                store.pointages.find((item) => item.seanceId === seance.id) ||
                null

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
                  <span>Délégué</span>
                  <strong>
                    {cahier?.signatureDelegue ? 'Signé' : 'En attente'}
                  </strong>
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
                  canSign={!!canSignDelegue}
                  onSign={signDelegue}
                />

                <SignatureBox
                  title="Enseignant"
                  subtitle="Validation pédagogique"
                  signed={!!cahier?.signatureEnseignant}
                  canSign={!!canSignTeacher}
                  onSign={signTeacher}
                />
              </div>

              <div className="cahier-form">
                <div className="cahier-form-group">
                  <label>Titre de la séance</label>
                  <input
                    value={form.titre}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                {canEdit && (
                  <button className="primary-btn" onClick={saveCahier}>
                    Enregistrer
                  </button>
                )}

                {!permissions.canFill &&
                  !permissions.canSignDelegue &&
                  !permissions.canSignTeacher && (
                    <div className="cahier-readonly">
                      Consultation uniquement pour ce rôle.
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

function SignatureBox({ title, subtitle, signed, canSign, onSign }) {
  return (
    <div className={signed ? 'signature-box signed' : 'signature-box'}>
      <div>
        <span>{subtitle}</span>
        <strong>{title}</strong>
      </div>

      <div className="signature-area">
        {signed ? (
          <span className="signature-written">Signé</span>
        ) : (
          <span className="signature-empty">Signature en attente</span>
        )}
      </div>

      {canSign && (
        <button type="button" className="cahier-sign-btn" onClick={onSign}>
          Signer maintenant
        </button>
      )}
    </div>
  )
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

function getPermissions(role) {
  if (role === 'delegue') {
    return {
      canFill: true,
      canSignDelegue: true,
      canSignTeacher: false,
    }
  }

  if (role === 'enseignant') {
    return {
      canFill: false,
      canSignDelegue: false,
      canSignTeacher: true,
    }
  }

  if (role === 'admin') {
    return {
      canFill: true,
      canSignDelegue: true,
      canSignTeacher: true,
    }
  }

  return {
    canFill: false,
    canSignDelegue: false,
    canSignTeacher: false,
  }
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
      'Vous pouvez remplir, corriger, signer et consulter tous les cahiers.',
    delegue:
      'Vous voyez votre classe, vous remplissez le cahier et vous signez côté classe.',
    enseignant:
      'Vous voyez vos cours, vous vérifiez le contenu et vous signez pour clôturer le cahier.',
    surveillant:
      'Vous contrôlez les cahiers renseignés, signés ou en attente.',
    comptable:
      'Vous consultez uniquement les cahiers clôturés utiles aux vacations.',
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

  return labels[status] || status
}

function getWeek(weekKey) {
  return WEEK_OPTIONS.find((item) => item.key === weekKey) || WEEK_OPTIONS[0]
}

export default CahierTextePage