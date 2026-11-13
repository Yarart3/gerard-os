// Varias formas de estimar las kcal de un entreno. Todas son aproximaciones: se muestran juntas
// (y frente al Apple Watch) para ver el rango, y la «combinada» es su mediana.
import type { ExerciseType } from './types'

export type Sex = 'male' | 'female'

export type Body = {
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: Sex | null
}

export type EnergySet = {
  done: boolean
  weight_kg: number | null
  reps: number | null
  seconds: number | null
  meters: number | null
  calories: number | null
}
export type EnergyItem = { type: ExerciseType; met: number; unit: string; sets: EnergySet[] }

export type EnergyInput = {
  items: EnergyItem[]
  minutes: number | null
  avgHr: number | null
  body: Body
}

export type MethodId = 'met' | 'met_rmr' | 'activity' | 'heart_rate' | 'mechanical'
export type MethodResult = {
  id: MethodId
  label: string
  kcal: number | null
  /** Qué falta para poder calcularla (si kcal es null) o cómo se ha hecho. */
  note: string
}

const round = (n: number) => Math.round(n)

/** Edad cumplida a partir de "YYYY-MM-DD". */
export function ageFrom(birth: string | null, today: Date = new Date()): number | null {
  if (!birth) return null
  const [y, m, d] = birth.split('-').map(Number)
  if (!y || !m || !d) return null
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age > 0 && age < 120 ? age : null
}

/** Metabolismo basal (Mifflin-St Jeor, kcal/día). Sin sexo: la media de las dos constantes. */
export function mifflinRmr(b: Body): number | null {
  if (!b.weight_kg || !b.height_cm || !b.age) return null
  const s = b.sex === 'male' ? 5 : b.sex === 'female' ? -161 : -78
  return 10 * b.weight_kg + 6.25 * b.height_cm - 5 * b.age + s
}

/** MET medio de la sesión (media de sus ejercicios). */
const avgMet = (items: EnergyItem[]) =>
  items.length ? items.reduce((a, it) => a + it.met, 0) / items.length : 0

/** 1. MET clásico: MET × 3,5 × peso / 200 × minutos (el 1 MET «estándar» de 3,5 ml O₂/kg/min). */
function classicMet(i: EnergyInput): MethodResult {
  const w = i.body.weight_kg
  const met = avgMet(i.items)
  const ok = w && i.minutes && met
  return {
    id: 'met',
    label: 'MET clásico',
    kcal: ok ? round(((met * 3.5 * w) / 200) * i.minutes!) : null,
    note: ok ? `MET medio ${met.toFixed(1).replace('.', ',')}` : needs({ w, min: i.minutes, met }),
  }
}

/**
 * 2. MET corregido con tu basal (Kozey et al.): el «1 MET» real de cada persona es su metabolismo
 * basal por minuto, no 3,5 ml/kg/min. kcal = MET × (basal/1440) × minutos.
 */
function correctedMet(i: EnergyInput): MethodResult {
  const rmr = mifflinRmr(i.body)
  const met = avgMet(i.items)
  const ok = rmr && i.minutes && met
  return {
    id: 'met_rmr',
    label: 'MET corregido (tu basal)',
    kcal: ok ? round(met * (rmr / 1440) * i.minutes!) : null,
    note: ok
      ? `Basal Mifflin-St Jeor ${round(rmr)} kcal/día`
      : rmr
        ? needs({ min: i.minutes, met })
        : 'Necesita peso, altura y fecha de nacimiento en el perfil',
  }
}

// Segundos por repetición según el tipo (subida + bajada) y ritmo por metro.
const SEC_PER_REP: Record<ExerciseType, number> = { strength: 4, gymnastics: 2.5, metcon: 2.5, cardio: 2 }
const SEC_PER_METER = 0.35 // ~10 km/h corriendo / remo suave
const REST_MET = 2.0 // de pie recuperando entre series

/** Tiempo de trabajo real (s) de las series hechas y kcal que marcó la máquina (series de calorías). */
export function workTime(items: EnergyItem[]) {
  let seconds = 0
  const byMet: { met: number; seconds: number }[] = []
  let machineKcal = 0
  for (const it of items) {
    let s = 0
    for (const set of it.sets) {
      if (!set.done) continue
      if (set.seconds) s += set.seconds
      else if (set.meters) s += set.meters * SEC_PER_METER
      else if (set.reps) s += set.reps * SEC_PER_REP[it.type]
      if (set.calories) machineKcal += set.calories
    }
    seconds += s
    if (s) byMet.push({ met: it.met, seconds: s })
  }
  return { seconds, byMet, machineKcal }
}

/**
 * 3. Trabajo + descanso: el tiempo bajo carga (estimado por repes, metros o tiempo) va al MET del
 * ejercicio × 1,4 (el MET de tabla ya promedia descansos) y el resto de la sesión a 2 MET.
 * Las series de calorías (bici, remo) suman lo que marcó la máquina.
 */
function activity(i: EnergyInput): MethodResult {
  const w = i.body.weight_kg
  if (!w || !i.minutes) return { id: 'activity', label: 'Trabajo + descanso', kcal: null, note: needs({ w, min: i.minutes }) }
  const wt = workTime(i.items)
  if (!wt.seconds && !wt.machineKcal)
    return { id: 'activity', label: 'Trabajo + descanso', kcal: null, note: 'Marca series como hechas' }
  const perMin = (met: number) => (met * 3.5 * w) / 200
  const workMin = Math.min(wt.seconds / 60, i.minutes)
  const work = wt.byMet.reduce((a, x) => a + perMin(x.met * 1.4) * (x.seconds / 60), 0)
  const scale = wt.seconds / 60 > i.minutes ? i.minutes / (wt.seconds / 60) : 1
  const rest = perMin(REST_MET) * (i.minutes - workMin)
  return {
    id: 'activity',
    label: 'Trabajo + descanso',
    kcal: round(work * scale + rest + wt.machineKcal),
    note: `${Math.round(workMin)} min de trabajo y ${Math.round(i.minutes - workMin)} de descanso`,
  }
}

/** 4. Frecuencia cardiaca (Keytel et al., 2005). Sin sexo: la media de las dos ecuaciones. */
export function keytelPerMin(hr: number, b: Required<Pick<Body, 'weight_kg' | 'age'>> & { sex: Sex | null }) {
  const male = (-55.0969 + 0.6309 * hr + 0.1988 * b.weight_kg! + 0.2017 * b.age!) / 4.184
  const female = (-20.4022 + 0.4472 * hr - 0.1263 * b.weight_kg! + 0.074 * b.age!) / 4.184
  return b.sex === 'male' ? male : b.sex === 'female' ? female : (male + female) / 2
}
function heartRate(i: EnergyInput): MethodResult {
  const { weight_kg: w, age } = i.body
  const ok = i.avgHr && w && age && i.minutes
  return {
    id: 'heart_rate',
    label: 'Pulso medio (Keytel)',
    kcal: ok ? round(Math.max(0, keytelPerMin(i.avgHr!, { weight_kg: w, age, sex: i.body.sex })) * i.minutes!) : null,
    note: ok
      ? `${i.avgHr} ppm de media`
      : !i.avgHr
        ? 'Apunta el pulso medio del Apple Watch'
        : 'Necesita peso y fecha de nacimiento en el perfil',
  }
}

const ROM_M = 0.6 // recorrido medio de una repetición
const EFFICIENCY = 0.2 // el músculo convierte ~20 % de la energía en trabajo
const EPOC = 0.12 // deuda de oxígeno después del entreno

/**
 * 5. Física: trabajo mecánico de levantar la carga (kg × g × recorrido × repes) / eficiencia muscular,
 * más el basal durante la sesión y un 12 % de EPOC (lo que se quema después).
 */
function mechanical(i: EnergyInput): MethodResult {
  const rmr = mifflinRmr(i.body)
  const w = i.body.weight_kg
  if (!i.minutes || !w)
    return { id: 'mechanical', label: 'Trabajo mecánico + EPOC', kcal: null, note: needs({ w, min: i.minutes }) }
  let joules = 0
  for (const it of i.items)
    for (const s of it.sets) if (s.done && s.weight_kg && s.reps) joules += s.weight_kg * 9.81 * ROM_M * s.reps
  if (!joules) return { id: 'mechanical', label: 'Trabajo mecánico + EPOC', kcal: null, note: 'Sin series con peso hechas' }
  const lift = joules / 4184 / EFFICIENCY
  const basal = ((rmr ?? 24 * w) / 1440) * i.minutes
  return {
    id: 'mechanical',
    label: 'Trabajo mecánico + EPOC',
    kcal: round((lift + basal) * (1 + EPOC)),
    note: `${round(joules / 1000)} kJ levantados`,
  }
}

function needs(x: { w?: number | null; min?: number | null; met?: number }) {
  if (x.w === null || x.w === 0) return 'Necesita tu peso en el perfil'
  if (!x.min) return 'Necesita la duración'
  if (x.met === 0) return 'Añade ejercicios'
  return 'Faltan datos'
}

export function energyMethods(i: EnergyInput): MethodResult[] {
  return [classicMet(i), correctedMet(i), activity(i), heartRate(i), mechanical(i)]
}

/** Mediana de las estimaciones disponibles (robusta a la que se dispare). */
export function combinedKcal(results: readonly MethodResult[]): number | null {
  const v = results.map((r) => r.kcal).filter((k): k is number => k !== null && k > 0).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid]! : round((v[mid - 1]! + v[mid]!) / 2)
}
