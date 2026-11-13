-- Ejercicios con peso corporal (dominadas, fondos…).
-- exercises.bodyweight: null = automático (se deduce del nombre), true/false = elegido a mano.
alter table public.exercises add column bodyweight boolean;
-- sets.added_kg: lastre de la serie (0 = sin lastre; negativo = asistida). weight_kg sigue siendo
-- la carga total (peso corporal del momento + lastre), así volumen, PRs y 1RM no cambian.
alter table public.sets add column added_kg numeric(6, 2);
