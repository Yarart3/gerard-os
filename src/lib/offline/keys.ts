// Claves de las mutaciones de la cola offline. Todas empiezan por 'offline' para poder
// filtrarlas (contar pendientes, descartar fallidas) con un único prefijo.
export const OFFLINE_ROOT = ['offline'] as const

/** Todas las mutaciones offline comparten ámbito: TanStack las ejecuta en serie y en orden de creación. */
export const OFFLINE_SCOPE = { id: 'offline' } as const

export const offlineKeys = {
  gymAddItems: ['offline', 'gym', 'addItems'],
  gymUpdateWorkout: ['offline', 'gym', 'updateWorkout'],
  gymDeleteWorkout: ['offline', 'gym', 'deleteWorkout'],
  gymDeleteItem: ['offline', 'gym', 'deleteItem'],
  gymSwapItems: ['offline', 'gym', 'swapItems'],
  gymAddSet: ['offline', 'gym', 'addSet'],
  gymUpdateSet: ['offline', 'gym', 'updateSet'],
  gymDeleteSet: ['offline', 'gym', 'deleteSet'],
  mealAddItem: ['offline', 'nutrition', 'addMealItem'],
  mealUpdateItem: ['offline', 'nutrition', 'updateMealItem'],
  mealDeleteItem: ['offline', 'nutrition', 'deleteMealItem'],
  expenseSave: ['offline', 'personal', 'saveExpense'],
  expenseDelete: ['offline', 'personal', 'deleteExpense'],
  noteSave: ['offline', 'personal', 'saveNote'],
  noteDelete: ['offline', 'personal', 'deleteNote'],
  watchSave: ['offline', 'personal', 'saveWatch'],
  watchDelete: ['offline', 'personal', 'deleteWatch'],
  enAttempt: ['offline', 'english', 'recordAttempt'],
  enAward: ['offline', 'english', 'award'],
  enReview: ['offline', 'english', 'reviewCard'],
} as const satisfies Record<string, readonly string[]>

export type OfflineKey = (typeof offlineKeys)[keyof typeof offlineKeys]
