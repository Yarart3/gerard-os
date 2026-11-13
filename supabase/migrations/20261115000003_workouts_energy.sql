-- Estimaciones de calorías del entreno: { avg_hr, combined, ai: { kcal, low, high, confidence, explanation, at } }
alter table public.workouts add column energy jsonb;
