// frontend/src/services/burkinaHolidays.js

export const FIXED_BURKINA_HOLIDAYS = {
  '01-01': {
    name: 'Nouvel an',
    type: 'public',
  },
  '01-03': {
    name: 'Soulèvement populaire',
    type: 'public',
  },
  '03-08': {
    name: 'Journée internationale de la femme',
    type: 'public',
  },
  '05-01': {
    name: 'Fête du travail',
    type: 'public',
  },
  '05-15': {
    name: 'Journée des coutumes et traditions',
    type: 'public',
  },
  '08-05': {
    name: 'Fête nationale',
    type: 'public',
  },
  '08-15': {
    name: 'Assomption',
    type: 'public',
  },
  '10-31': {
    name: 'Journée des martyrs',
    type: 'public',
  },
  '11-01': {
    name: 'Toussaint',
    type: 'public',
  },
  '12-11': {
    name: 'Proclamation de l’indépendance',
    type: 'public',
  },
  '12-25': {
    name: 'Noël',
    type: 'public',
  },
}

export const BURKINA_HOLIDAYS_BY_YEAR = {
  2026: {
    '2026-03-09': {
      name: 'Repos Journée internationale de la femme',
      type: 'public',
    },
    '2026-03-20': {
      name: 'Korité / Aïd el-Fitr',
      type: 'public',
      tentative: true,
    },
    '2026-03-21': {
      name: 'Repos Korité',
      type: 'public',
      tentative: true,
    },
    '2026-04-06': {
      name: 'Lundi de Pâques',
      type: 'public',
    },
    '2026-05-14': {
      name: 'Ascension',
      type: 'public',
    },
    '2026-05-27': {
      name: 'Tabaski / Aïd el-Kébir',
      type: 'public',
      tentative: true,
    },
    '2026-08-25': {
      name: 'Maouloud',
      type: 'public',
      tentative: true,
    },
    '2026-08-26': {
      name: 'Maouloud',
      type: 'public',
      tentative: true,
    },
    '2026-11-02': {
      name: 'Repos Toussaint',
      type: 'public',
    },
  },
}

const MONTHS_FR = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
}

export function getHolidayByIsoDate(isoDate) {
  if (!isoDate) return null

  const year = Number(isoDate.slice(0, 4))
  const monthDay = isoDate.slice(5)

  const yearlyHoliday = BURKINA_HOLIDAYS_BY_YEAR[year]?.[isoDate]

  if (yearlyHoliday) {
    return {
      ...yearlyHoliday,
      date: isoDate,
    }
  }

  const fixedHoliday = FIXED_BURKINA_HOLIDAYS[monthDay]

  if (fixedHoliday) {
    return {
      ...fixedHoliday,
      date: isoDate,
    }
  }

  return null
}

export function getWeekStartIso(week, selectedWeek) {
  const candidates = [
    selectedWeek,
    week?.key,
    week?.startDate,
    week?.date,
    week?.monday,
    week?.days?.[0]?.date,
  ]

  for (const value of candidates) {
    const iso = extractIsoDate(value)

    if (iso) return iso
  }

  const labelIso = parseFrenchWeekLabel(week?.label)

  if (labelIso) return labelIso

  return null
}

export function getIsoForWeekDay(week, selectedWeek, dayIndex) {
  const startIso = getWeekStartIso(week, selectedWeek)

  if (!startIso || dayIndex < 0) return null

  const [year, month, day] = startIso.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  date.setDate(date.getDate() + dayIndex)

  return toIsoLocal(date)
}

export function getHolidayForWeekDay(week, selectedWeek, dayIndex) {
  const iso = getIsoForWeekDay(week, selectedWeek, dayIndex)

  return getHolidayByIsoDate(iso)
}

export function isHolidayForWeekDay(week, selectedWeek, dayIndex) {
  return Boolean(getHolidayForWeekDay(week, selectedWeek, dayIndex))
}

function extractIsoDate(value) {
  const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/)

  return match ? match[0] : null
}

function parseFrenchWeekLabel(label) {
  const value = String(label || '').trim()

  const match = value.match(
    /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+au\s+\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+(\d{4})/i,
  )

  if (!match) return null

  const day = Number(match[1])
  const monthName = normalizeMonth(match[2])
  const year = Number(match[3])
  const monthIndex = MONTHS_FR[monthName]

  if (!day || monthIndex === undefined || !year) return null

  const date = new Date(year, monthIndex, day)

  return toIsoLocal(date)
}

function normalizeMonth(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toIsoLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}