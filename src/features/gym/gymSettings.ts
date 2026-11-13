import { useGeneralSettings, useSectionSettings } from '../settings/useSettings'
import { ageFrom, type Body } from './logic/calories'
import { DEFAULT_MET } from './logic/met'
import type { WeightUnit } from './logic/sets'
import type { ExerciseType } from './logic/types'

export type NutritionSettings = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  slots: string[]
}

export type GymSettings = {
  weight_unit: WeightUnit
  weight_increment: number // en la unidad elegida
  rest_seconds: number
  met: Record<ExerciseType, number>
  muscle_groups: string[]
  nutrition: NutritionSettings
}

export const GYM_DEFAULTS: GymSettings = {
  weight_unit: 'kg',
  weight_increment: 2.5,
  rest_seconds: 90,
  met: { ...DEFAULT_MET },
  muscle_groups: [
    'Pecho',
    'Espalda',
    'Hombro',
    'Bíceps',
    'Tríceps',
    'Pierna',
    'Glúteo',
    'Core',
    'Cuerpo completo',
  ],
  nutrition: {
    kcal: 2200,
    protein: 150,
    carbs: 230,
    fat: 70,
    fiber: 30,
    slots: ['Desayuno', 'Comida', 'Merienda', 'Cena'],
  },
}

/** Fusiona lo guardado con los valores por defecto (también los objetos anidados). */
export function mergeGymSettings(saved: Partial<GymSettings>): GymSettings {
  return {
    ...GYM_DEFAULTS,
    ...saved,
    met: { ...GYM_DEFAULTS.met, ...saved.met },
    nutrition: { ...GYM_DEFAULTS.nutrition, ...saved.nutrition },
  }
}

export function useGymSettings() {
  const s = useSectionSettings<GymSettings>('gym', GYM_DEFAULTS)
  return { ...s, value: mergeGymSettings(s.value) }
}

/** Peso corporal: vive en el perfil de Ajustes (una sola fuente de verdad). */
export function useBodyWeight(): number | null {
  return useGeneralSettings().value.profile.weight_kg
}

/** Datos del perfil que usan las fórmulas de calorías. */
export function useBody(): Body {
  const p = useGeneralSettings().value.profile
  return {
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    age: ageFrom(p.birth_date),
    sex: p.sex ?? null,
  }
}
