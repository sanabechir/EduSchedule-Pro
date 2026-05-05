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