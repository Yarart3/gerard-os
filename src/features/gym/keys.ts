export const gymKeys = {
  exercises: ['exercises'] as const,
  workout: (date: string) => ['workout', date] as const,
  history: ['workouts', 'history'] as const,
}
