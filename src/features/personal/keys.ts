export const personalKeys = {
  categories: ['expense_categories'] as const,
  expenses: (month: string) => ['expenses', month] as const,
  watchlist: ['watchlist'] as const,
  notes: ['notes'] as const,
}
