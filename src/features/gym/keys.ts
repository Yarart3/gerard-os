export const gymKeys = {
  exercises: ['exercises'] as const,
  /** Entreno en curso (finished_at null), sea del día que sea. */
  active: ['workout', 'active'] as const,
  /** Un entreno concreto (para editar uno ya terminado). */
  workout: (id: string) => ['workout', 'id', id] as const,
  history: ['workouts', 'history'] as const,
}
