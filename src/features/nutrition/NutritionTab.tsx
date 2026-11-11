import { useState } from 'react'
import { ChipScroller } from '../../components/ui'
import { DiaryView } from './DiaryView'
import { FoodsView } from './FoodsView'
import { RecipesView } from './RecipesView'
import { WeekView } from './WeekView'
import g from '../gym/Gym.module.css'

type View = 'diary' | 'week' | 'foods' | 'recipes'
const VIEWS = [
  { value: 'diary', label: 'Diario' },
  { value: 'week', label: 'Semana' },
  { value: 'foods', label: 'Alimentos' },
  { value: 'recipes', label: 'Recetas' },
] as const

export function NutritionTab() {
  const [view, setView] = useState<View>('diary')
  return (
    <div className={g.stack}>
      <ChipScroller label="Apartados de Nutrición" options={VIEWS} value={view} onChange={setView} />
      {view === 'diary' && <DiaryView />}
      {view === 'week' && <WeekView />}
      {view === 'foods' && <FoodsView />}
      {view === 'recipes' && <RecipesView />}
    </div>
  )
}
