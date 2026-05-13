// frontend/src/services/permissions.js

export const ROLES = {
  ADMIN: 'admin',
  ADMINISTRATEUR: 'administrateur',
  ENSEIGNANT: 'enseignant',
  DELEGUE: 'delegue',
  SURVEILLANT: 'surveillant',
  COMPTABLE: 'comptable',
}

export function normalizeRole(role) {
  return String(role || 'admin')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isAdmin(user) {
  const role = normalizeRole(user?.role)
  return role === ROLES.ADMIN || role === ROLES.ADMINISTRATEUR
}

export function isTeacher(user) {
  return normalizeRole(user?.role) === ROLES.ENSEIGNANT
}

export function isDelegue(user) {
  return normalizeRole(user?.role) === ROLES.DELEGUE
}

export function isSurveillant(user) {
  return normalizeRole(user?.role) === ROLES.SURVEILLANT
}

export function isComptable(user) {
  return normalizeRole(user?.role) === ROLES.COMPTABLE
}

export function getRoleLabel(userOrRole) {
  const role =
    typeof userOrRole === 'string'
      ? normalizeRole(userOrRole)
      : normalizeRole(userOrRole?.role)

  if (role === ROLES.ADMIN || role === ROLES.ADMINISTRATEUR) {
    return 'Administrateur'
  }

  if (role === ROLES.ENSEIGNANT) {
    return 'Enseignant'
  }

  if (role === ROLES.DELEGUE) {
    return 'Délégué de classe'
  }

  if (role === ROLES.SURVEILLANT) {
    return 'Surveillant Général'
  }

  if (role === ROLES.COMPTABLE) {
    return 'Responsable Comptable'
  }

  return 'Utilisateur'
}

export function getRoleInitial(userOrRole) {
  const role =
    typeof userOrRole === 'string'
      ? normalizeRole(userOrRole)
      : normalizeRole(userOrRole?.role)

  if (role === ROLES.ADMIN || role === ROLES.ADMINISTRATEUR) return 'A'
  if (role === ROLES.ENSEIGNANT) return 'E'
  if (role === ROLES.DELEGUE) return 'D'
  if (role === ROLES.SURVEILLANT) return 'S'
  if (role === ROLES.COMPTABLE) return 'C'

  return 'U'
}

export const PERMISSIONS = {
  dashboard: {
    view: [
      'admin',
      'administrateur',
      'enseignant',
      'delegue',
      'surveillant',
      'comptable',
    ],
  },

  emploiTemps: {
    view: ['admin', 'administrateur', 'enseignant', 'delegue', 'surveillant'],
    create: ['admin', 'administrateur'],
    update: ['admin', 'administrateur'],
    delete: ['admin', 'administrateur'],
    exportPdf: ['admin', 'administrateur', 'surveillant'],
    viewAllClasses: ['admin', 'administrateur', 'surveillant'],
    viewAllTeachers: ['admin', 'administrateur', 'surveillant'],
  },

  pointage: {
    view: ['admin', 'administrateur', 'enseignant', 'delegue', 'surveillant'],
    generateQr: ['admin', 'administrateur', 'enseignant', 'surveillant'],
    manual: ['admin', 'administrateur', 'surveillant'],
    viewHistory: ['admin', 'administrateur', 'enseignant', 'delegue', 'surveillant'],
    viewAllHistory: ['admin', 'administrateur', 'surveillant'],
    viewTechnicalInfo: ['admin', 'administrateur'],
  },

  cahierTexte: {
    view: ['admin', 'administrateur', 'enseignant', 'delegue', 'surveillant'],
    fill: ['admin', 'administrateur', 'enseignant'],
    edit: ['admin', 'administrateur', 'enseignant'],
    signTeacher: ['admin', 'administrateur', 'enseignant'],
    signDelegue: ['admin', 'administrateur', 'delegue'],
    validate: ['admin', 'administrateur', 'surveillant'],
    exportPdf: ['admin', 'administrateur', 'enseignant', 'surveillant'],
    viewAll: ['admin', 'administrateur', 'surveillant'],
  },

  vacations: {
    view: ['admin', 'administrateur', 'enseignant', 'comptable'],
    generate: ['admin', 'administrateur', 'comptable'],
    validate: ['admin', 'administrateur', 'comptable'],
    markPaid: ['comptable'],
    exportPdf: ['admin', 'administrateur', 'enseignant', 'comptable'],
    viewAll: ['admin', 'administrateur', 'comptable'],
  },

  rapports: {
    view: ['admin', 'administrateur', 'surveillant', 'comptable'],
    exportPdf: ['admin', 'administrateur', 'surveillant', 'comptable'],
    viewFinancialReports: ['admin', 'administrateur', 'comptable'],
    viewPresenceReports: ['admin', 'administrateur', 'surveillant'],
  },

  users: {
    view: ['admin', 'administrateur'],
    create: ['admin', 'administrateur'],
    update: ['admin', 'administrateur'],
    delete: ['admin', 'administrateur'],
  },
}

export function hasPermission(user, moduleName, actionName = 'view') {
  const role = normalizeRole(user?.role)
  const modulePermissions = PERMISSIONS[moduleName]

  if (!modulePermissions) return false

  const allowedRoles = modulePermissions[actionName]

  if (!Array.isArray(allowedRoles)) return false

  return allowedRoles.includes(role)
}

export function canViewDashboard(user) {
  return hasPermission(user, 'dashboard', 'view')
}

export function canViewEmploiTemps(user) {
  return hasPermission(user, 'emploiTemps', 'view')
}

export function canCreateEmploiTemps(user) {
  return hasPermission(user, 'emploiTemps', 'create')
}

export function canUpdateEmploiTemps(user) {
  return hasPermission(user, 'emploiTemps', 'update')
}

export function canDeleteEmploiTemps(user) {
  return hasPermission(user, 'emploiTemps', 'delete')
}

export function canExportEmploiTempsPdf(user) {
  return hasPermission(user, 'emploiTemps', 'exportPdf')
}

export function canViewAllPlanningClasses(user) {
  return hasPermission(user, 'emploiTemps', 'viewAllClasses')
}

export function canViewAllPlanningTeachers(user) {
  return hasPermission(user, 'emploiTemps', 'viewAllTeachers')
}

export function canViewPointage(user) {
  return hasPermission(user, 'pointage', 'view')
}

export function canGenerateQr(user) {
  return hasPermission(user, 'pointage', 'generateQr')
}

export function canManualPointage(user) {
  return hasPermission(user, 'pointage', 'manual')
}

export function canViewPointageHistory(user) {
  return hasPermission(user, 'pointage', 'viewHistory')
}

export function canViewAllPointageHistory(user) {
  return hasPermission(user, 'pointage', 'viewAllHistory')
}

export function canViewPointageTechnicalInfo(user) {
  return hasPermission(user, 'pointage', 'viewTechnicalInfo')
}

export function canViewCahierTexte(user) {
  return hasPermission(user, 'cahierTexte', 'view')
}

export function canFillCahierTexte(user) {
  return hasPermission(user, 'cahierTexte', 'fill')
}

export function canEditCahierTexte(user) {
  return hasPermission(user, 'cahierTexte', 'edit')
}

export function canSignCahierAsTeacher(user) {
  return hasPermission(user, 'cahierTexte', 'signTeacher')
}

export function canSignCahierAsDelegue(user) {
  return hasPermission(user, 'cahierTexte', 'signDelegue')
}

export function canValidateCahierTexte(user) {
  return hasPermission(user, 'cahierTexte', 'validate')
}

export function canExportCahierPdf(user) {
  return hasPermission(user, 'cahierTexte', 'exportPdf')
}

export function canViewAllCahiers(user) {
  return hasPermission(user, 'cahierTexte', 'viewAll')
}

export function canViewVacations(user) {
  return hasPermission(user, 'vacations', 'view')
}

export function canGenerateVacations(user) {
  return hasPermission(user, 'vacations', 'generate')
}

export function canValidateVacations(user) {
  return hasPermission(user, 'vacations', 'validate')
}

export function canMarkVacationPaid(user) {
  return hasPermission(user, 'vacations', 'markPaid')
}

export function canExportVacationPdf(user) {
  return hasPermission(user, 'vacations', 'exportPdf')
}

export function canViewAllVacations(user) {
  return hasPermission(user, 'vacations', 'viewAll')
}

export function canViewRapports(user) {
  return hasPermission(user, 'rapports', 'view')
}

export function canExportRapportsPdf(user) {
  return hasPermission(user, 'rapports', 'exportPdf')
}

export function canViewFinancialReports(user) {
  return hasPermission(user, 'rapports', 'viewFinancialReports')
}

export function canViewPresenceReports(user) {
  return hasPermission(user, 'rapports', 'viewPresenceReports')
}

export function canManageUsers(user) {
  return hasPermission(user, 'users', 'view')
}

export function getVisibleModules(user) {
  const modules = []

  if (canViewDashboard(user)) {
    modules.push({
      key: 'dashboard',
      label: 'Tableau de bord',
      short: 'TD',
      path: '/dashboard',
    })
  }

  if (canViewEmploiTemps(user)) {
    modules.push({
      key: 'emploi',
      label: 'Emploi du temps',
      short: 'ET',
      path: '/emploi-du-temps',
    })
  }

  if (canViewPointage(user)) {
    modules.push({
      key: 'pointage',
      label: getPointageMenuLabel(user),
      short: 'QR',
      path: '/pointage',
    })
  }

  if (canViewCahierTexte(user)) {
    modules.push({
      key: 'cahier',
      label: getCahierMenuLabel(user),
      short: 'CT',
      path: '/cahier-de-texte',
    })
  }

  if (canViewVacations(user)) {
    modules.push({
      key: 'vacations',
      label: getVacationMenuLabel(user),
      short: 'FV',
      path: '/vacations',
    })
  }

  if (canViewRapports(user)) {
    modules.push({
      key: 'rapports',
      label: 'Rapports',
      short: 'RP',
      path: '/rapports',
    })
  }

  return modules
}

export function getPointageMenuLabel(user) {
  if (isTeacher(user)) return 'Mes pointages'
  if (isSurveillant(user)) return 'Contrôle pointage'
  if (isDelegue(user)) return 'Suivi pointage'

  return 'Pointage QR-Code'
}

export function getCahierMenuLabel(user) {
  if (isTeacher(user)) return 'Mes cahiers'
  if (isDelegue(user)) return 'Cahiers de ma classe'
  if (isSurveillant(user)) return 'Cahiers à contrôler'

  return 'Cahier de texte'
}

export function getVacationMenuLabel(user) {
  if (isTeacher(user)) return 'Mes vacations'
  if (isComptable(user)) return 'Paiement vacations'

  return 'Fiches de vacation'
}

export function getDashboardScopeLabel(user) {
  if (isAdmin(user)) return 'Vue globale'
  if (isTeacher(user)) return 'Vue enseignant'
  if (isDelegue(user)) return 'Vue classe'
  if (isSurveillant(user)) return 'Vue surveillance'
  if (isComptable(user)) return 'Vue comptabilité'

  return 'Vue utilisateur'
}