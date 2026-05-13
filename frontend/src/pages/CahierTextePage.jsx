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
import {
  canEditCahierTexte,
  canExportCahierPdf,
  canFillCahierTexte,
  canSignCahierAsDelegue,
  canSignCahierAsTeacher,
  canValidateCahierTexte,
  canViewAllCahiers,
  canViewCahierTexte,
  getRoleLabel,
} from '../services/permissions'

const EMPTY_FORM = {
  titre: '',
  contenu: '',
  travaux: '',
  observation: '',
}

function CahierTextePage({ user }) {
  const { store, actions } = useAppStore()

  const role = user?.role || 'admin'
  const teacherName = getTeacherNameFromUser(user)
  const delegateClass = getClassNameFromUser(user)

  const canViewPage = canViewCahierTexte(user)
  const canViewAll = canViewAllCahiers(user)
  const canFill = canFillCahierTexte(user)
  const canEditRole = canEditCahierTexte(user)
  const canSignDelegueRole = canSignCahierAsDelegue(user)
  const canSignTeacherRole = canSignCahierAsTeacher(user)
  const canValidate = canValidateCahierTexte(user)
  const canExportPdf = canExportCahierPdf(user)

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

    if (role === 'delegue' && delegateClass) {
      return [delegateClass]
    }

    if (role === 'enseignant' && teacherName) {
      const teacherClasses = uniqueValues(
        (store.seances || [])
          .filter((item) => item.enseignant === teacherName)
          .map((item) => item.classe),
      )

      return ['Toutes', ...teacherClasses]
    }

    if (canViewAll) {
      return ['Toutes', ...unique]
    }

    return ['Toutes']
  }, [store.seances, role, delegateClass, teacherName, canViewAll])

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
      signesEnseignant: cahiersForFilter.filter((item) => item.signatureEnseignant)
        .length,
      clotures: cahiersForFilter.filter((item) => item.locked).length,
    }
  }, [seances, store.cahiers])

  const canEdit =
    selectedSeance &&
    canFill &&
    canEditRole &&
    (!cahier || !cahier.locked)

  const canSignDelegue =
    selectedSeance &&
    cahier &&
    canSignDelegueRole &&
    !cahier.signatureDelegue &&
    !cahier.locked

  const canSignTeacher =
    selectedSeance &&
    cahier &&
    canSignTeacherRole &&
    cahier.signatureDelegue &&
    !cahier.signatureEnseignant &&
    !cahier.locked

  const saveCahier = () => {
    if (!selectedSeance) {
      setMessage('Aucune séance sélectionnée.')
      return
    }

    if (!canFill || !canEditRole) {
      setMessage('Votre rôle ne permet pas de remplir ce cahier de texte.')
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

    if (!canSignDelegueRole) {
      setMessage('Votre rôle ne permet pas de signer comme délégué.')
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

    if (!canSignTeacherRole) {
      setMessage('Votre rôle ne permet pas de signer comme enseignant.')
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
    if (!canExportPdf) {
      setMessage('Votre rôle ne permet pas d’exporter ce cahier.')
      return
    }

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

  if (!canViewPage) {
    return (
      <div className="page cahier-page">
        <div className="page-heading">
          <div>
            <h1>Accès non autorisé</h1>
            <p>
              Votre rôle actuel ({getRoleLabel(user)}) ne permet pas de consulter
              le cahier de texte.
            </p>
          </div>
        </div>

        <section className="panel cahier-empty-state">
          Cette page n’est pas disponible pour votre profil.
        </section>
      </div>
    )
  }

  return (
    <div className="page cahier-page">
      <div className="page-heading">
        <div>
          <h1>{getPageTitle(role)}</h1>
          <p>{getPageDescription(role)}</p>
        </div>

        {selectedSeance && canEdit && (
          <button className="primary-btn" onClick={saveCahier}>
            Enregistrer le cahier
          </button>
        )}
      </div>

      <div className="cahier-role-note">
        <strong>{getRoleLabel(user)}</strong>
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
            disabled={role === 'delegue' || !canViewAll}
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

        {canValidate && (
          <div className="cahier-control-note">
            Contrôle autorisé : vous pouvez suivre les cahiers renseignés,
            signés ou clôturés.
          </div>
        )}
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

                {cahier && canExportPdf && (
                  <button className="isge-secondary-btn" onClick={exportCahierPdf}>
                    Exporter PDF
                  </button>
                )}

                {!canFill &&
                  !canSignDelegueRole &&
                  !canSignTeacherRole && (
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

function getPageTitle(role) {
  if (role === 'enseignant') return 'Mes cahiers'
  if (role === 'delegue') return 'Cahiers de ma classe'
  if (role === 'surveillant') return 'Cahiers à contrôler'

  return 'Cahier de texte'
}

function getPageDescription(role) {
  if (role === 'enseignant') {
    return 'Remplissez vos séances, vérifiez les signatures et clôturez vos cahiers.'
  }

  if (role === 'delegue') {
    return 'Consultez les cahiers de votre classe et signez côté classe.'
  }

  if (role === 'surveillant') {
    return 'Contrôlez les cahiers renseignés, signés ou en attente.'
  }

  return 'Suivi du contenu pédagogique, signatures et clôture des séances.'
}

function getRoleDescription(role) {
  const descriptions = {
    admin:
      'Vous pouvez remplir, corriger, consulter et exporter tous les cahiers.',
    delegue:
      'Vous voyez uniquement votre classe et vous signez le cahier côté classe.',
    enseignant:
      'Vous voyez uniquement vos cours, vous remplissez vos cahiers et vous signez pour clôturer.',
    surveillant:
      'Vous contrôlez les cahiers renseignés, signés ou en attente.',
    comptable:
      'Ce module n’est normalement pas accessible à la comptabilité.',
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

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

export default CahierTextePage