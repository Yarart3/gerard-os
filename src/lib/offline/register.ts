import type { QueryClient } from '@tanstack/react-query'
import { registerEnglishMutations } from '../../features/english/offline'
import { registerGymMutations } from '../../features/gym/offline'
import { registerNutritionMutations } from '../../features/nutrition/offline'
import { registerPersonalMutations } from '../../features/personal/offline'

/** Registra las mutaciones offline. Hay que hacerlo antes de restaurar la caché persistida. */
export function registerOfflineMutations(qc: QueryClient) {
  registerGymMutations(qc)
  registerNutritionMutations(qc)
  registerPersonalMutations(qc)
  registerEnglishMutations(qc)
}
