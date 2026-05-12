import { useEffect, useState } from 'react'

const STORE_KEY = 'eduschedule_frontend_store_v1'
const STORE_VERSION = 2

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export const DEFAULT_WEEK_KEY = getMondayIsoDate(new Date())

export const WEEK_OPTIONS = generateWeekOptions({
  weeksBefore: 8,
  weeksAfter: 24,
})

const DEMO_WEEK_KEY = DEFAULT_WEEK_KEY
const DEMO_NEXT_WEEK_KEY = getWeekKeyByOffset(1)

export const DEFAULT_SLOTS = [
  '07h30-09h30',
  '10h00-12h15',
  '13h00-16h00',
  '15h00-18h00',
]

export const DEFAULT_CLASSES = [
  'Licence 1 RIT',
  'Licence 2 RIT',
  'Licence 3 RIT',
  'Master 1 RSI',
  'Master 2 RSI',
]

export const DEFAULT_MODULES = [
  'Programmation Web',
  'Base de Données',
  'Réseaux',
  'Sécurité',
  'Cloud Computing',
  'Administration Linux',
  'Cybersécurité',
  'Audit et Gouvernance SI',
  'Réseaux Haut Débit',
  'Sécurité des Réseaux',
]

export const DEFAULT_TEACHERS = [
  'TRAORE Jean',
  'KABORE Paul',
  'OUEDRAOGO Issa',
  'SANKARA Mariam',
  'COMPAORE Adama',
  'SAWADOGO Ibrahim',
  'NIKIEMA Salif',
  'ZONGO Aminata',
]

export const DEFAULT_ROOMS = [
  'A101',
  'A102',
  'B201',
  'B202',
  'C301',
  'Labo Réseaux',
]

const INITIAL_SEANCES = [
  {
    id: 's1',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 1 RIT',
    matiere: 'Programmation Web',
    enseignant: 'TRAORE Jean',
    salle: 'A101',
    jour: 'Lundi',
    horaire: '07h30-09h30',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's2',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 1 RIT',
    matiere: 'Base de Données',
    enseignant: 'KABORE Paul',
    salle: 'B201',
    jour: 'Mardi',
    horaire: '10h00-12h15',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's3',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 1 RIT',
    matiere: 'Réseaux',
    enseignant: 'OUEDRAOGO Issa',
    salle: 'A102',
    jour: 'Mercredi',
    horaire: '13h00-16h00',
    type: 'tp',
    groupe: 'GP1',
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's4',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 2 RIT',
    matiere: 'Sécurité',
    enseignant: 'SANKARA Mariam',
    salle: 'A101',
    jour: 'Jeudi',
    horaire: '13h00-16h00',
    type: 'td',
    groupe: null,
    statut: 'realisee',
    createdBy: 'system',
  },
  {
    id: 's5',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 2 RIT',
    matiere: 'Cloud Computing',
    enseignant: 'COMPAORE Adama',
    salle: 'B201',
    jour: 'Vendredi',
    horaire: '15h00-18h00',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's6',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 3 RIT',
    matiere: 'Programmation Web Avancée',
    enseignant: 'SAWADOGO Ibrahim',
    salle: 'A102',
    jour: 'Lundi',
    horaire: '07h30-09h30',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's7',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 3 RIT',
    matiere: 'Administration Linux',
    enseignant: 'NIKIEMA Salif',
    salle: 'Labo Réseaux',
    jour: 'Mardi',
    horaire: '13h00-16h00',
    type: 'tp',
    groupe: 'GP2',
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's8',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Licence 3 RIT',
    matiere: 'Cybersécurité',
    enseignant: 'ZONGO Aminata',
    salle: 'B202',
    jour: 'Jeudi',
    horaire: '15h00-18h00',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's9',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Master 1 RSI',
    matiere: 'Base de Données Avancées',
    enseignant: 'NIKIEMA Salif',
    salle: 'B202',
    jour: 'Mercredi',
    horaire: '13h00-16h00',
    type: 'cours',
    groupe: null,
    statut: 'realisee',
    createdBy: 'system',
  },
  {
    id: 's10',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Master 1 RSI',
    matiere: 'Sécurité des Réseaux',
    enseignant: 'OUEDRAOGO Issa',
    salle: 'C301',
    jour: 'Vendredi',
    horaire: '10h00-12h15',
    type: 'td',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's11',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Master 2 RSI',
    matiere: 'Réseaux Haut Débit',
    enseignant: 'ZONGO Aminata',
    salle: 'C301',
    jour: 'Vendredi',
    horaire: '15h00-18h00',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's12',
    weekKey: DEMO_WEEK_KEY,
    classe: 'Master 2 RSI',
    matiere: 'Audit et Gouvernance SI',
    enseignant: 'TRAORE Jean',
    salle: 'B202',
    jour: 'Samedi',
    horaire: '07h30-09h30',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's13',
    weekKey: DEMO_NEXT_WEEK_KEY,
    classe: 'Licence 1 RIT',
    matiere: 'Programmation Web',
    enseignant: 'TRAORE Jean',
    salle: 'A101',
    jour: 'Lundi',
    horaire: '10h00-12h15',
    type: 'td',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's14',
    weekKey: DEMO_NEXT_WEEK_KEY,
    classe: 'Licence 2 RIT',
    matiere: 'Sécurité',
    enseignant: 'SANKARA Mariam',
    salle: 'B202',
    jour: 'Mardi',
    horaire: '07h30-09h30',
    type: 'cours',
    groupe: null,
    statut: 'planifiee',
    createdBy: 'system',
  },
  {
    id: 's15',
    weekKey: DEMO_NEXT_WEEK_KEY,
    classe: 'Master 1 RSI',
    matiere: 'Sécurité des Réseaux',
    enseignant: 'OUEDRAOGO Issa',
    salle: 'C301',
    jour: 'Jeudi',
    horaire: '13h00-16h00',
    type: 'tp',
    groupe: 'GP1',
    statut: 'planifiee',
    createdBy: 'system',
  },
]

const INITIAL_POINTAGES = [
  {
    id: 'p1',
    seanceId: 's1',
    date: getDemoDateForDay(DEMO_WEEK_KEY, 'Lundi'),
    statut: 'present',
    heureScan: '07h32',
    validePar: 'TRAORE Jean',
  },
  {
    id: 'p2',
    seanceId: 's4',
    date: getDemoDateForDay(DEMO_WEEK_KEY, 'Jeudi'),
    statut: 'present',
    heureScan: '13h05',
    validePar: 'SANKARA Mariam',
  },
  {
    id: 'p3',
    seanceId: 's9',
    date: getDemoDateForDay(DEMO_WEEK_KEY, 'Mercredi'),
    statut: 'retard',
    heureScan: '13h18',
    validePar: 'NIKIEMA Salif',
  },
]

const INITIAL_CAHIERS = [
  {
    id: 'c1',
    seanceId: 's1',
    titre: 'Introduction au développement web',
    contenu:
      'Présentation du HTML, structure d’une page web, formulaires et validation.',
    travaux: 'Créer une page de formulaire simple.',
    observation: 'Bonne participation.',
    statut: 'signe_enseignant',
    signatureDelegue: true,
    signatureEnseignant: true,
    locked: true,
  },
  {
    id: 'c2',
    seanceId: 's4',
    titre: 'Principes de base de la sécurité',
    contenu:
      'Authentification, confidentialité, intégrité, disponibilité et bonnes pratiques.',
    travaux: 'Lire le chapitre sur les menaces réseau.',
    observation: '',
    statut: 'signe_delegue',
    signatureDelegue: true,
    signatureEnseignant: false,
    locked: false,
  },
]

const INITIAL_VACATIONS = [
  {
    id: 'v1',
    enseignant: 'TRAORE Jean',
    seanceId: 's1',
    heures: 2,
    tauxHoraire: 10000,
    montantBrut: 20000,
    retenue: 0,
    montantNet: 20000,
    statut: 'validee',
  },
  {
    id: 'v2',
    enseignant: 'SANKARA Mariam',
    seanceId: 's4',
    heures: 3,
    tauxHoraire: 10000,
    montantBrut: 30000,
    retenue: 0,
    montantNet: 30000,
    statut: 'en_attente',
  },
]

const INITIAL_ACTIVITIES = [
  {
    id: 'a1',
    type: 'pointage',
    title: 'Pointage effectué',
    text: 'Programmation Web - Licence 1 RIT',
    date: `${getDemoDateForDay(DEMO_WEEK_KEY, 'Lundi')} 07:32`,
  },
  {
    id: 'a2',
    type: 'cahier',
    title: 'Cahier de texte signé',
    text: 'Programmation Web - TRAORE Jean',
    date: `${getDemoDateForDay(DEMO_WEEK_KEY, 'Lundi')} 09:25`,
  },
  {
    id: 'a3',
    type: 'vacation',
    title: 'Fiche de vacation validée',
    text: 'TRAORE Jean - 20 000 FCFA',
    date: `${getDemoDateForDay(DEMO_WEEK_KEY, 'Lundi')} 10:00`,
  },
]

const initialStore = {
  version: STORE_VERSION,
  seances: INITIAL_SEANCES,
  pointages: INITIAL_POINTAGES,
  cahiers: INITIAL_CAHIERS,
  vacations: INITIAL_VACATIONS,
  activities: INITIAL_ACTIVITIES,
}

let currentStore = loadStore()

export function generateWeekOptions({ weeksBefore = 8, weeksAfter = 24 } = {}) {
  const currentMonday = getMondayDate(new Date())
  const weeks = []

  for (let offset = -weeksBefore; offset <= weeksAfter; offset += 1) {
    const monday = new Date(currentMonday)
    monday.setDate(currentMonday.getDate() + offset * 7)

    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)

    const key = toIsoDate(monday)
    const startLabel = formatShortDate(monday)
    const endLabel = formatShortDate(saturday)

    weeks.push({
      key,
      label: `${startLabel} au ${endLabel}${
        offset === 0 ? ' — semaine actuelle' : ''
      }`,
      title: `EMPLOI DU TEMPS DU ${startLabel.toUpperCase()} AU ${endLabel.toUpperCase()}`,
      start: toIsoDate(monday),
      startDate: toIsoDate(monday),
      end: toIsoDate(saturday),
      endDate: toIsoDate(saturday),
      days: WEEK_DAYS.map((dayName, index) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + index)

        return {
          key: dayName,
          label: `${dayName} ${String(date.getDate()).padStart(2, '0')}`,
          fullLabel: `${dayName} ${formatShortDate(date)}`,
          date: toIsoDate(date),
          isoDate: toIsoDate(date),
        }
      }),
    })
  }

  return weeks
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)

    if (!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(initialStore))
      return initialStore
    }

    const parsed = JSON.parse(raw)

    if (!parsed.version || parsed.version < STORE_VERSION) {
      localStorage.setItem(STORE_KEY, JSON.stringify(initialStore))
      return initialStore
    }

    return {
      version: STORE_VERSION,
      seances: Array.isArray(parsed.seances) ? parsed.seances : INITIAL_SEANCES,
      pointages: Array.isArray(parsed.pointages)
        ? parsed.pointages
        : INITIAL_POINTAGES,
      cahiers: Array.isArray(parsed.cahiers) ? parsed.cahiers : INITIAL_CAHIERS,
      vacations: Array.isArray(parsed.vacations)
        ? parsed.vacations
        : INITIAL_VACATIONS,
      activities: Array.isArray(parsed.activities)
        ? parsed.activities
        : INITIAL_ACTIVITIES,
    }
  } catch {
    localStorage.setItem(STORE_KEY, JSON.stringify(initialStore))
    return initialStore
  }
}

function saveStore(nextStore) {
  currentStore = {
    version: STORE_VERSION,
    ...nextStore,
  }

  localStorage.setItem(STORE_KEY, JSON.stringify(currentStore))
  window.dispatchEvent(new CustomEvent('eduschedule-store-updated'))
}

export function useAppStore() {
  const [store, setStore] = useState(currentStore)

  useEffect(() => {
    const sync = () => {
      setStore({ ...currentStore })
    }

    window.addEventListener('eduschedule-store-updated', sync)

    return () => {
      window.removeEventListener('eduschedule-store-updated', sync)
    }
  }, [])

  return {
    store,
    actions: appActions,
    selectors: appSelectors,
  }
}

export const appSelectors = {
  getSeances() {
    return currentStore.seances
  },

  getPointages() {
    return currentStore.pointages
  },

  getCahiers() {
    return currentStore.cahiers
  },

  getVacations() {
    return currentStore.vacations
  },

  getActivities() {
    return currentStore.activities
  },

  getSeanceById(id) {
    return currentStore.seances.find((item) => item.id === id) || null
  },

  getSeancesByWeek(weekKey) {
    return currentStore.seances.filter((item) => item.weekKey === weekKey)
  },

  getSeancesByTeacher(teacher) {
    return currentStore.seances.filter((item) => item.enseignant === teacher)
  },

  getSeancesByClass(classe) {
    return currentStore.seances.filter((item) => item.classe === classe)
  },

  getCahierBySeance(seanceId) {
    return currentStore.cahiers.find((item) => item.seanceId === seanceId)
  },

  getPointageBySeance(seanceId) {
    return currentStore.pointages.find((item) => item.seanceId === seanceId)
  },

  getVacationBySeance(seanceId) {
    return currentStore.vacations.find((item) => item.seanceId === seanceId)
  },

  getStats() {
    const seances = currentStore.seances
    const pointages = currentStore.pointages
    const cahiers = currentStore.cahiers
    const vacations = currentStore.vacations

    return {
      seances: seances.length,
      seancesRealisees: seances.filter((item) => item.statut === 'realisee')
        .length,
      pointages: pointages.length,
      cahiers: cahiers.length,
      cahiersClotures: cahiers.filter((item) => item.locked).length,
      vacations: vacations.length,
      vacationsValidees: vacations.filter((item) => item.statut === 'validee')
        .length,
      montantVacations: vacations.reduce(
        (total, item) => total + Number(item.montantNet || 0),
        0,
      ),
    }
  },
}

export const appActions = {
  resetStore() {
    saveStore(initialStore)
  },

  addActivity(activity) {
    const nextActivity = {
      id: `a-${Date.now()}`,
      date: new Date().toISOString(),
      ...activity,
    }

    saveStore({
      ...currentStore,
      activities: [nextActivity, ...currentStore.activities],
    })

    return nextActivity
  },

  addSeance(seance) {
    const candidate = {
      id: `s-${Date.now()}`,
      weekKey: seance.weekKey || DEFAULT_WEEK_KEY,
      classe: seance.classe,
      matiere: seance.matiere,
      enseignant: seance.enseignant,
      salle: seance.salle,
      jour: seance.jour,
      horaire: seance.horaire,
      type: seance.type || 'cours',
      groupe: seance.groupe || null,
      statut: seance.statut || 'planifiee',
      createdBy: seance.createdBy || 'local',
    }

    const conflicts = getScheduleConflicts(candidate, currentStore.seances)

    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
      }
    }

    saveStore({
      ...currentStore,
      seances: [...currentStore.seances, candidate],
    })

    appActions.addActivity({
      type: 'planning',
      title: 'Nouvelle séance planifiée',
      text: `${candidate.matiere} - ${candidate.classe}`,
    })

    return {
      success: true,
      seance: candidate,
    }
  },

  updateSeance(id, updates) {
    const existing = currentStore.seances.find((item) => item.id === id)

    if (!existing) {
      return {
        success: false,
        message: 'Séance introuvable.',
      }
    }

    const candidate = {
      ...existing,
      ...updates,
    }

    const otherSeances = currentStore.seances.filter((item) => item.id !== id)
    const conflicts = getScheduleConflicts(candidate, otherSeances)

    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
      }
    }

    saveStore({
      ...currentStore,
      seances: currentStore.seances.map((item) =>
        item.id === id ? candidate : item,
      ),
    })

    appActions.addActivity({
      type: 'planning',
      title: 'Séance modifiée',
      text: `${candidate.matiere} - ${candidate.classe}`,
    })

    return {
      success: true,
      seance: candidate,
    }
  },

  deleteSeance(id) {
    const seance = currentStore.seances.find((item) => item.id === id)

    if (!seance) {
      return {
        success: false,
        message: 'Séance introuvable.',
      }
    }

    saveStore({
      ...currentStore,
      seances: currentStore.seances.filter((item) => item.id !== id),
      pointages: currentStore.pointages.filter((item) => item.seanceId !== id),
      cahiers: currentStore.cahiers.filter((item) => item.seanceId !== id),
      vacations: currentStore.vacations.filter((item) => item.seanceId !== id),
    })

    appActions.addActivity({
      type: 'planning',
      title: 'Séance supprimée',
      text: `${seance.matiere} - ${seance.classe}`,
    })

    return {
      success: true,
    }
  },

  markPointage(seanceId, status = 'present', userName = 'Utilisateur') {
    const seance = appSelectors.getSeanceById(seanceId)

    if (!seance) {
      return {
        success: false,
        message: 'Séance introuvable.',
      }
    }

    const existing = currentStore.pointages.find(
      (item) => item.seanceId === seanceId,
    )

    const pointage = {
      id: existing?.id || `p-${Date.now()}`,
      seanceId,
      date: getWeekDayDate(seance.weekKey, seance.jour) || getTodayIsoDate(),
      statut: status,
      heureScan: getCurrentTimeLabel(),
      validePar: userName,
    }

    saveStore({
      ...currentStore,
      pointages: existing
        ? currentStore.pointages.map((item) =>
            item.id === existing.id ? pointage : item,
          )
        : [...currentStore.pointages, pointage],
      seances: currentStore.seances.map((item) =>
        item.id === seanceId ? { ...item, statut: 'realisee' } : item,
      ),
    })

    appActions.addActivity({
      type: 'pointage',
      title: 'Pointage effectué',
      text: `${seance.matiere} - ${seance.classe}`,
    })

    return {
      success: true,
      pointage,
    }
  },

  saveCahier(seanceId, data) {
    const seance = appSelectors.getSeanceById(seanceId)

    if (!seance) {
      return {
        success: false,
        message: 'Séance introuvable.',
      }
    }

    const existing = currentStore.cahiers.find(
      (item) => item.seanceId === seanceId,
    )

    const cahier = {
      id: existing?.id || `c-${Date.now()}`,
      seanceId,
      titre: data.titre || '',
      contenu: data.contenu || '',
      travaux: data.travaux || '',
      observation: data.observation || '',
      statut: data.statut || existing?.statut || 'brouillon',
      signatureDelegue:
        data.signatureDelegue ?? existing?.signatureDelegue ?? false,
      signatureEnseignant:
        data.signatureEnseignant ?? existing?.signatureEnseignant ?? false,
      locked: data.locked ?? existing?.locked ?? false,
    }

    saveStore({
      ...currentStore,
      cahiers: existing
        ? currentStore.cahiers.map((item) =>
            item.id === existing.id ? cahier : item,
          )
        : [...currentStore.cahiers, cahier],
    })

    appActions.addActivity({
      type: 'cahier',
      title: 'Cahier de texte enregistré',
      text: `${seance.matiere} - ${seance.classe}`,
    })

    return {
      success: true,
      cahier,
    }
  },

  signCahier(seanceId, role) {
    const existing = currentStore.cahiers.find(
      (item) => item.seanceId === seanceId,
    )

    if (!existing) {
      return {
        success: false,
        message: 'Aucun cahier trouvé pour cette séance.',
      }
    }

    const updates = { ...existing }

    if (role === 'delegue') {
      updates.signatureDelegue = true
      updates.statut = 'signe_delegue'
    }

    if (role === 'enseignant') {
      updates.signatureEnseignant = true

      if (updates.signatureDelegue) {
        updates.statut = 'signe_enseignant'
        updates.locked = true
      }
    }

    saveStore({
      ...currentStore,
      cahiers: currentStore.cahiers.map((item) =>
        item.id === existing.id ? updates : item,
      ),
    })

    appActions.addActivity({
      type: 'cahier',
      title: 'Cahier de texte signé',
      text: `Signature ${role}`,
    })

    return {
      success: true,
      cahier: updates,
    }
  },

  generateVacation(seanceId, tauxHoraire = 10000) {
    const seance = appSelectors.getSeanceById(seanceId)

    if (!seance) {
      return {
        success: false,
        message: 'Séance introuvable.',
      }
    }

    const existing = currentStore.vacations.find(
      (item) => item.seanceId === seanceId,
    )

    if (existing) {
      return {
        success: true,
        vacation: existing,
      }
    }

    const heures = getDurationHours(seance.horaire)
    const montantBrut = heures * tauxHoraire
    const retenue = 0
    const montantNet = montantBrut - retenue

    const vacation = {
      id: `v-${Date.now()}`,
      enseignant: seance.enseignant,
      seanceId,
      heures,
      tauxHoraire,
      montantBrut,
      retenue,
      montantNet,
      statut: 'en_attente',
    }

    saveStore({
      ...currentStore,
      vacations: [...currentStore.vacations, vacation],
    })

    appActions.addActivity({
      type: 'vacation',
      title: 'Fiche de vacation générée',
      text: `${seance.enseignant} - ${formatMoney(montantNet)}`,
    })

    return {
      success: true,
      vacation,
    }
  },

  updateVacationStatus(vacationId, statut) {
    const vacation = currentStore.vacations.find(
      (item) => item.id === vacationId,
    )

    if (!vacation) {
      return {
        success: false,
        message: 'Fiche introuvable.',
      }
    }

    saveStore({
      ...currentStore,
      vacations: currentStore.vacations.map((item) =>
        item.id === vacationId ? { ...item, statut } : item,
      ),
    })

    appActions.addActivity({
      type: 'vacation',
      title: 'Statut vacation modifié',
      text: `${vacation.enseignant} - ${statut}`,
    })

    return {
      success: true,
    }
  },
}

export function getScheduleConflicts(candidate, existingItems) {
  if (!candidate.jour || !candidate.horaire) return []

  const conflicts = []

  existingItems.forEach((item) => {
    if ((item.weekKey || DEFAULT_WEEK_KEY) !== candidate.weekKey) return
    if (item.jour !== candidate.jour) return
    if (!slotsOverlap(item.horaire, candidate.horaire)) return

    if (hasAudienceConflict(item, candidate)) {
      conflicts.push({
        type: 'classe',
        message: `Conflit classe : ${candidate.classe} a déjà "${item.matiere}" avec ${item.enseignant} à cet horaire.`,
      })
    }

    if (
      item.enseignant &&
      candidate.enseignant &&
      item.enseignant === candidate.enseignant
    ) {
      conflicts.push({
        type: 'enseignant',
        message: `Conflit enseignant : ${candidate.enseignant} est déjà occupé avec ${item.classe}.`,
      })
    }

    if (item.salle && candidate.salle && item.salle === candidate.salle) {
      conflicts.push({
        type: 'salle',
        message: `Conflit salle : la salle ${candidate.salle} est déjà utilisée par ${item.classe}.`,
      })
    }
  })

  return conflicts
}

export function hasAudienceConflict(existing, candidate) {
  if (existing.classe !== candidate.classe) return false

  const existingGroup = existing.groupe || null
  const candidateGroup = candidate.groupe || null

  if (existingGroup && candidateGroup && existingGroup !== candidateGroup) {
    return false
  }

  return true
}

export function slotsOverlap(slotA, slotB) {
  const a = parseSlot(slotA)
  const b = parseSlot(slotB)

  if (!a || !b) {
    return normalizeSlot(slotA) === normalizeSlot(slotB)
  }

  return a.start < b.end && b.start < a.end
}

export function parseSlot(slot = '') {
  const normalized = slot
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/à/g, '-')
    .replace(/:/g, 'h')

  const parts = normalized.split('-')

  if (parts.length !== 2) return null

  const start = parseTime(parts[0])
  const end = parseTime(parts[1])

  if (start === null || end === null) return null

  return { start, end }
}

export function parseTime(value = '') {
  const match = value.match(/^(\d{1,2})h(\d{0,2})$/)

  if (!match) return null

  const hours = Number(match[1])
  const minutes = match[2] ? Number(match[2]) : 0

  return hours * 60 + minutes
}

export function normalizeSlot(value = '') {
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/à/g, '-')
    .replace(/:/g, 'h')
}

export function sortSlots(a, b) {
  const slotA = parseSlot(a)
  const slotB = parseSlot(b)

  if (!slotA || !slotB) return 0

  return slotA.start - slotB.start
}

export function formatSlot(slot = '') {
  return slot
    .replace('-', ' à ')
    .replace('10h00', '10h')
    .replace('13h00', '13h')
    .replace('15h00', '15h')
}

export function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`
}

export function getDurationHours(slot = '') {
  const parsed = parseSlot(slot)

  if (!parsed) return 0

  return Math.max(0, (parsed.end - parsed.start) / 60)
}

export function getWeekByKey(weekKey) {
  return WEEK_OPTIONS.find((week) => week.key === weekKey) || WEEK_OPTIONS[0]
}

export function getCurrentWeek() {
  return getWeekByKey(DEFAULT_WEEK_KEY)
}

export function getWeekDayDate(weekKey, dayName) {
  const week = getWeekByKey(weekKey)
  const day = week.days.find((item) => item.key === dayName)

  return day?.date || null
}

export function getTodayIsoDate() {
  return toIsoDate(new Date())
}

function getWeekKeyByOffset(offset = 0) {
  const monday = getMondayDate(new Date())
  monday.setDate(monday.getDate() + offset * 7)

  return toIsoDate(monday)
}

function getDemoDateForDay(weekKey, dayName) {
  return getWeekDayDate(weekKey, dayName) || getTodayIsoDate()
}

function getCurrentTimeLabel() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')

  return `${h}h${m}`
}

function getMondayDate(date) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day

  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)

  return copy
}

function getMondayIsoDate(date) {
  return toIsoDate(getMondayDate(date))
}

function toIsoDate(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 10)
}

function formatShortDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function getTeacherNameFromUser(user) {
  const email = (user?.email || '').toLowerCase()

  const teachers = {
    'enseignant@isge.bf': 'TRAORE Jean',
    'traore@isge.bf': 'TRAORE Jean',
    'kabore@isge.bf': 'KABORE Paul',
    'ouedraogo@isge.bf': 'OUEDRAOGO Issa',
    'sankara@isge.bf': 'SANKARA Mariam',
    'compaore@isge.bf': 'COMPAORE Adama',
    'sawadogo@isge.bf': 'SAWADOGO Ibrahim',
    'nikiema@isge.bf': 'NIKIEMA Salif',
    'zongo@isge.bf': 'ZONGO Aminata',
  }

  return teachers[email] || user?.nom || user?.name || null
}

export function getClassNameFromUser(user) {
  const email = (user?.email || '').toLowerCase()

  const classes = {
    'delegue.l1@isge.bf': 'Licence 1 RIT',
    'delegue.l2@isge.bf': 'Licence 2 RIT',
    'delegue.l3@isge.bf': 'Licence 3 RIT',
    'delegue.m1@isge.bf': 'Master 1 RSI',
    'delegue.m2@isge.bf': 'Master 2 RSI',
  }

  return classes[email] || null
}