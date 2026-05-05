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
        ...(store.seances || []).map((item) => item.classe).filter(Boolean),
      ]),
    ]

    return ['Toutes', ...unique]
  }, [store.seances])

  const seances = useMemo(() => {
    return (store.seances || [])
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
        role === 'delegue' && delegateClass ? item.classe === delegateClass : true,
      )
      .filter((item) => {
        if (role !== 'comptable') return true

        return (store.cahiers || []).some(
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
      seances.find((item) => item.id === selectedSeanceId) ||
      seances[0] ||
      null
    )
  }, [selectedSeanceId, seances])

  const cahier = useMemo(() => {
    if (!selectedSeance) return null

    return (
      (store.cahiers || []).find((item) => item.seanceId === selectedSeance.id) ||
      null
    )
  }, [store.cahiers, selectedSeance])

  const pointage = useMemo(() => {
    if (!selectedSeance) return null

    return (
      (store.pointages || []).find((item) => item.seanceId === selectedSeance.id) ||
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

    const cahiersForFilter = (store.cahiers || []).filter((item) =>
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
      signatureDelegueImage: cahier?.signatureDelegueImage || '',
      signatureEnseignantImage: cahier?.signatureEnseignantImage || '',
      statut: cahier?.statut || 'brouillon',
    })

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de l’enregistrement.')
      return
    }

    setMessage('Cahier de texte enregistré avec succès.')
  }

  const signDelegue = (signatureImage) => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli avant signature.')
      return
    }

    if (!signatureImage) {
      setMessage('Veuillez dessiner la signature du délégué.')
      return
    }

    const saveResult = actions.saveCahier(selectedSeance.id, {
      ...form,
      signatureDelegueImage: signatureImage,
      signatureEnseignantImage: cahier?.signatureEnseignantImage || '',
      statut: cahier?.statut || 'brouillon',
    })

    if (!saveResult.success) {
      setMessage(
        saveResult.message || 'Erreur lors de l’enregistrement de la signature.',
      )
      return
    }

    const result = actions.signCahier(selectedSeance.id, 'delegue')

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de la signature.')
      return
    }

    setMessage('Signature dessinée du délégué enregistrée.')
  }

  const signTeacher = (signatureImage) => {
    if (!selectedSeance || !cahier) {
      setMessage('Le cahier doit d’abord être rempli.')
      return
    }

    if (!cahier.signatureDelegue) {
      setMessage('Le délégué doit signer avant l’enseignant.')
      return
    }

    if (!signatureImage) {
      setMessage('Veuillez dessiner la signature de l’enseignant.')
      return
    }

    const saveResult = actions.saveCahier(selectedSeance.id, {
      ...form,
      signatureDelegueImage: cahier?.signatureDelegueImage || '',
      signatureEnseignantImage: signatureImage,
      statut: cahier?.statut || 'brouillon',
    })

    if (!saveResult.success) {
      setMessage(
        saveResult.message || 'Erreur lors de l’enregistrement de la signature.',
      )
      return
    }

    const result = actions.signCahier(selectedSeance.id, 'enseignant')

    if (!result.success) {
      setMessage(result.message || 'Erreur lors de la signature enseignant.')
      return
    }

    actions.generateVacation(selectedSeance.id)

    setMessage(
      'Signature dessinée enseignant enregistrée. Le cahier est clôturé et la vacation est générée.',
    )
  }

  const exportCahierPdf = () => {
    if (!selectedSeance || !cahier) {
      setMessage('Aucun cahier à exporter.')
      return
    }

    const contentHtml = `
      <div class="pdf-page">
        ${buildCardsHtml([
          { label: 'Classe', value: selectedSeance.classe },
          { label: 'Matière', value: selectedSeance.matiere },
          { label: 'Enseignant', value: selectedSeance.enseignant },
          { label: 'Jour', value: selectedSeance.jour },
          { label: 'Horaire', value: formatSlot(selectedSeance.horaire) },
          { label: 'Salle', value: selectedSeance.salle },
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
        `cahier-${selectedSeance.classe}-${selectedSeance.matiere}.pdf`,
      ),
      contentHtml,
    })

    setMessage('PDF du cahier de texte généré.')
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
                (store.cahiers || []).find((item) => item.seanceId === seance.id) ||
                null

              const itemPointage =
                (store.pointages || []).find(
                  (item) => item.seanceId === seance.id,
                ) || null

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
                  image={cahier?.signatureDelegueImage}
                  canSign={!!canSignDelegue}
                  onSign={signDelegue}
                />

                <SignatureBox
                  title="Enseignant"
                  subtitle="Validation pédagogique"
                  signed={!!cahier?.signatureEnseignant}
                  image={cahier?.signatureEnseignantImage}
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

                {cahier && (
                  <button className="isge-secondary-btn" onClick={exportCahierPdf}>
                    Exporter PDF
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

function SignatureBox({ title, subtitle, signed, image, canSign, onSign }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canSign || signed) return

    const canvas = canvasRef.current
    if (!canvas) return

    prepareCanvas(canvas)
  }, [canSign, signed])

  const startDrawing = (event) => {
    if (!canSign || signed) return

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
    if (!isDrawing || !canSign || signed) return

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
        ) : canSign ? (
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
          <span className="signature-empty">Signature en attente</span>
        )}
      </div>

      {error && <div className="signature-error">{error}</div>}

      {canSign && !signed && (
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

  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio

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

function makePdfFilename(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
}

export default CahierTextePage