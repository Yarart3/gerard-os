export const enKeys = {
  profile: ['english', 'profile'] as const,
  daily: ['english', 'daily'] as const,
  vocab: ['english', 'vocab'] as const,
  exercises: (section: string) => ['english', 'exercises', section] as const,
  attempts: ['english', 'attempts'] as const,
  songs: ['english', 'songs'] as const,
  artists: ['english', 'artists'] as const,
}
