# Hub personal de Gerard — especificación del proyecto

> Este archivo es la memoria permanente del proyecto. Léelo entero al empezar cada sesión.
> Fuente de verdad del diseño: la maqueta "Hub personal — maqueta minimal" (los tokens están copiados abajo).

## 1. Qué es
Web personal de **un único usuario** (Gerard), para usar a diario desde el iPhone y el Mac. Reúne en una sola app instalable (PWA):
**Hoy · Gym (+ Nutrición) · Agenda (Calendario iCloud + Uni) · Inglés · Personal (Gastos, Watchlist, Notas)**.

Todo debe costar **0 €**.

## 2. Stack (decidido, no cambiar sin preguntar)
| Pieza | Tecnología |
|---|---|
| Frontend | Vite + React 18 + TypeScript (estricto), React Router con `HashRouter` (GitHub Pages no reescribe rutas) |
| Estilos | CSS Modules + variables CSS (tokens de la sección 4). Sin frameworks de UI pesados |
| Estado de datos | TanStack Query + `@supabase/supabase-js` v2 |
| Gráficos | Recharts (o SVG propio si es algo sencillo) |
| PWA | `vite-plugin-pwa`: instalable, offline para lectura, icono propio |
| Hosting | GitHub Pages (repo `gerard-os` → base `/gerard-os/`), desplegado con GitHub Actions desde `main` |
| Backend | Supabase (plan gratuito): Postgres + Auth + Edge Functions (Deno) + `pg_cron` + `pg_net` + Realtime |
| IA | Edge Function `ai` → Gemini (plan gratuito) por defecto. Proveedor configurable: `AI_PROVIDER=gemini\|anthropic`, `AI_MODEL=<id>`. Alternativa: Claude Haiku 5.5 (`claude-haiku-5-5`) |
| Calendario | Edge Function `caldav` → iCloud CalDAV (`https://caldav.icloud.com`), con contraseña específica de app |
| Tests | Vitest + Testing Library (lógica y componentes clave) |

## 3. Reglas de seguridad (obligatorias)
- El repo `gerard-os` es **PÚBLICO**: **jamás** se suben secretos, el Excel ni datos personales. `.gitignore` incluye `.env*`, `data-import/` y `*.xlsx`.
- En el frontend solo van `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, que son públicas por diseño y están protegidas por RLS. La `service_role` **nunca** sale del servidor.
- Los secretos (`APPLE_ID`, `APPLE_APP_PASSWORD`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) van **solo** en Supabase secrets (`supabase secrets set`).
- **RLS activado en TODAS las tablas**: cada tabla tiene `user_id uuid default auth.uid()` y la política `user_id = auth.uid()` para select, insert, update y delete.
- Auth: email con enlace mágico **y** código de un solo uso (el código es necesario en la PWA del iPhone, que no comparte sesión con Safari). Flujo PKCE (compatible con `HashRouter`). `shouldCreateUser: false` y registros nuevos desactivados: el usuario de Gerard se crea a mano en el dashboard. El email **no** aparece en el código.
- Las Edge Functions validan el JWT del usuario. Las que lanza el cron usan un secreto propio (`CRON_SECRET`) en una cabecera.

## 4. Sistema de diseño (minimal tipo Apple)
**Tipografía:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif` (Inter vía Google Fonts como respaldo).

| Uso | Tamaño / peso |
|---|---|
| Título grande | 34 / 700, letter-spacing −0.02em |
| Título de tarjeta | 17 / 600 |
| Cuerpo | 15–16 / 400–500 |
| Secundario | 13 / 500–600 en color `--muted` |
| Etiqueta de fecha | 13 / 600, mayúsculas, letter-spacing 0.02em |

**Tokens de color:**
| Token | Claro | Oscuro |
|---|---|---|
| --bg | #F2F2F7 | #000000 |
| --card | #FFFFFF | #1C1C1E |
| --text | #1C1C1E | #F5F5F7 |
| --muted | #6E6E73 | #98989D |
| --line | #E5E5EA | #38383A |
| --accent (texto y enlaces) | #0071E3 | #0A84FF |
| --accentbg (botón con texto blanco) | #0071E3 | #0A6CDB |
| --fill (inputs, pills, pistas de barras) | #EEEEF2 | #2C2C2E |
| --orange | #F56300 | #FF9F0A |
| --green | #248A3D | #30D158 |
| --tab (barra translúcida + blur 20px) | rgba(249,249,251,.92) | rgba(22,22,24,.92) |

**Forma y espaciado:** tarjetas con radio 18 y padding 16; inputs con radio 10–12 y altura 44; botón principal con radio 14 y altura 50; separador de filas 0.5px `--line`; margen lateral 16; espacio entre tarjetas 16.

**Componentes base:** `Card`, `ListRow` (con chevron), `Pill`, `ProgressBar`, `SegmentedControl`, `ChipScroller`, `Sheet` (panel inferior con asa), `TabBar`, `Sidebar`, `PageHeader` (fecha + título grande + rueda ⚙️), `EmptyState`, `Toast`.

**Iconos:** SVG de trazo 1.8 (estilo SF Symbols). Sin emojis en la interfaz.

**Tema:** claro / oscuro / automático (`prefers-color-scheme`), guardado en los ajustes del usuario.

**Accesibilidad:** contraste ≥ 4.5:1, objetivos táctiles ≥ 44px, `<button>`/`<a>`/`<label>` reales, `aria-label` en los botones que solo tienen icono.

## 5. Navegación
- **Móvil (<900px):** barra inferior con 5 pestañas: **Hoy · Gym · Agenda · Inglés · Personal**.
- **Escritorio:** barra lateral con las mismas 5 secciones y **Ajustes** fijo abajo. El contenido va en una cuadrícula con `max-width: 1100px`.
- **Rueda ⚙️** arriba a la derecha en todas las pantallas: abre un `Sheet` con los ajustes **de esa sección** y, al final, "Ajustes generales".
- Las subsecciones son un `SegmentedControl` (Gym: Entreno · Historial · Catálogo · Nutrición; Agenda: Calendario · Uni; Personal: Gastos · Watchlist · Notas) o un `ChipScroller` (Inglés: 7 secciones).
- **Idioma de la interfaz: castellano.** Formatos españoles: `1.840 kcal`, `102,5 kg`, `24,30 €`, semana de lunes a domingo, zona horaria Europe/Madrid.

## 6. Contenido de cada sección
### Hoy
Tarjetas configurables (activar, desactivar y reordenar):
- Kcal comidas / objetivo y kcal quemadas (Apple Watch y estimación MET)
- Agenda del día
- Próximas entregas de la uni
- Entreno de hoy
- Inglés (racha, puntos y "Continuar lección")
- Nota rápida
- Resumen de Personal (gastos del mes, watchlist pendiente)

### Gym
- **Entreno:** sesión del día. Añades ejercicios del catálogo **en el orden en que los haces**. Cada ejercicio tiene series (kg, repes o tiempo/distancia según su unidad) con el **último valor ya puesto**. Además: botón "Repetir sesión anterior", "Pegar WOD" y la tarjeta de calorías (**estimación MET** junto al **dato manual del Apple Watch**, con la diferencia).
- **Historial:** lista de sesiones, PRs por ejercicio, gráfica de progresión por ejercicio y resumen semanal (volumen, kcal, nº de sesiones).
- **Catálogo:** CRUD de ejercicios: nombre, alias, grupo muscular, tipo (fuerza, gimnástico, metcon, cardio), unidad (kg, repes, tiempo, metros, calorías) y MET por defecto según el tipo.
- **Pegar WOD:** textarea donde pegas el texto del WOD de AimHarder. La app busca coincidencias con el catálogo (normalizando mayúsculas y acentos, con alias y similitud difusa) y marca los ejercicios nuevos para crearlos con un toque. **No se hace scraping de AimHarder.**
- **Calorías:** `kcal = MET × 3,5 × peso_kg / 200 × minutos`. MET por defecto: fuerza 5,0; gimnástico 6,0; metcon 8,0; cardio 7,0 (editables en Ajustes).
- **Nutrición:** replica el Excel de Gerard.
  - Base de **alimentos** con macros por 100 g (kcal, proteína, carbohidratos, grasa, fibra).
  - **Recetas:** ingredientes en gramos, con macros calculados.
  - **Registro diario** por momento del día (Desayuno, Comida, Merienda, Cena; configurables), con varios alimentos o recetas y sus gramos.
  - **Resumen semanal** con totales por comida y por día.
  - Objetivos de kcal y macros.
- **Preparado para el futuro:** los resultados de WOD (For Time, AMRAP…) no se implementan ahora, pero el esquema debe permitir añadirlos sin migrar los datos.

### Agenda
- **Calendario:** vistas mes, semana y día, con eventos de iCloud. Se pueden crear, editar y borrar eventos, que se escriben en iCloud mediante la Edge Function `caldav`. Se elige qué calendarios mostrar y su color. Se muestra "Sincronizado hace X min" y un botón "Sincronizar". Hay sincronización automática cada 15 min (`pg_cron`).
- **Uni:**
  - Asignaturas: nombre, color, ECTS, curso, cuatrimestre.
  - Entregas y exámenes con fecha y cuenta atrás, que también aparecen en el calendario como eventos de todo el día (solo en la app; opcionalmente se exportan a iCloud).
  - Notas y media ponderada por ECTS (escala 0–10).
  - Tablero del TFG: hitos con progreso.

### Inglés
Se construye siguiendo la sección 7 de este archivo.

### Personal
- **Gastos:** importe, categoría, fecha y nota. Total del mes frente a presupuesto, desglose por categoría y lista de los últimos.
- **Watchlist:** título, tipo (serie, peli, libro), estado (pendiente, viendo, visto), plataforma, progreso y nota.
- **Notas:** título, texto y etiquetas, con buscador y fijadas arriba.

## 7. Inglés (especificación completa)
**ANTES de construir esta sección**, pregunta a Gerard (de pocas en pocas, con opciones):
- Lengua materna e idioma que aprende (inglés)
- Nivel (A1–C1) y qué le cuesta más
- Para qué lo quiere
- En qué idioma quiere las explicaciones
- Temas favoritos y artistas que canten en inglés
- Minutos al día y si usará más el móvil o el ordenador
- Detalles personales divertidos para usarlos en los ejemplos

Guarda las respuestas en la tabla `english_profile`.

**Secciones** (`ChipScroller`):
1. **Hoy:** racha, puntos frente al objetivo diario, gráfico de la semana, tareas del día y errores recientes.
2. **Reformular:**
   - Una frase y una instrucción («empieza por…», «usa esta conjunción», «pásala a pasiva»).
   - El usuario escribe hasta 3 versiones; la IA corrige cada una al momento y explica la regla.
   - Banco de ejercicios por tema de gramática, con "Generar más" y "Corregir mi frase", que da 3 formas alternativas de decirla.
3. **Vocabulario:**
   - ~60 palabras iniciales para su nivel, con traducción y ejemplo.
   - Tarjetas por cajas (Leitner: repaso a 1, 3, 7 y 16 días; un fallo devuelve la tarjeta a la caja 1).
   - Modo escribir desde el castellano, lista con buscador y opción de añadir palabras propias.
4. **Oído:**
   - Dictados con la voz del navegador (`speechSynthesis`, `lang="en-GB"` o `en-US`) a 0,6×, 0,8×, 1× y 1,2×.
   - Comparación palabra por palabra (alineación tipo diff: palabra correcta, incorrecta o que falta).
   - Lista de formas coloquiales del inglés hablado (gonna, wanna…) con audio.
5. **Canciones:**
   - Cada canción es una lección. **No se copian letras con derechos de autor:** el usuario pega la letra y la IA crea la lección.
   - Contenido de la lección: de qué trata, vocabulario, lenguaje coloquial, gramática, **huecos repartidos por TODA la letra** con niveles (y botón para cambiarlos), reformular versos y preguntas corregidas por la IA.
   - La letra pegada se guarda **solo** en la base de datos privada del usuario.
   - Fichas de sus artistas con enlaces a Spotify y YouTube.
6. **Gramática:**
   - Cómo se construyen las frases (orden de palabras, posición del verbo, subordinadas, preguntas, negación), con ejemplos en bloques de colores según su función, audio y un truco por regla.
   - 30 frases hechas con traducción literal y significado real, minijuego y botón "+ A mis tarjetas".
7. **Orden de palabras:**
   - Se muestra la frase en castellano y se tocan las palabras desordenadas para construirla.
   - Acepta varios órdenes correctos (`accepted_orders[]`) y permite filtrar por regla.
   - Botón «¿Mi orden también vale?», que pregunta a la IA, y botón para generar frases nuevas.

**Requisitos de Inglés:**
- El progreso se guarda en Supabase.
- **Sin IA disponible** (límite alcanzado o sin red): funciona con los ejercicios ya generados, que se guardan en la base de datos al crearse, y muestra las soluciones.
- Audio en el idioma correcto con botón "Más despacio".
- Los ejemplos usan sus gustos y detalles personales, con humor.
- Al terminar de construir la sección: resume cada parte y pregunta qué cambiar.
- **Prompts de la IA:** pide JSON estricto con un esquema validado con Zod en el cliente; si el JSON no es válido, se reintenta una vez.

## 8. Ajustes (Sheet por sección + generales)
- **Generales:**
  - Tema; perfil (nombre, peso, altura, fecha de nacimiento)
  - Exportar todo (JSON/CSV) e importar
  - Uso de almacenamiento de Supabase; cerrar sesión
- **Hoy:** tarjetas visibles y su orden; hora de corte del día (por defecto 04:00).
- **Gym:**
  - Unidades, incremento de peso, descanso entre series, MET por tipo
  - Peso corporal; tipos y grupos musculares
  - Nutrición: objetivos, macros y comidas del día
- **Agenda:**
  - Conexión con iCloud (estado y "Probar conexión"; las credenciales se configuran en los secrets, nunca en la web)
  - Calendarios visibles y sus colores, calendario por defecto, primer día de la semana
  - Uni: asignaturas, sistema de notas y avisos de entrega
- **Inglés:** nivel, objetivo diario, voz, acento, velocidad, proveedor de IA y "Probar IA", reiniciar progreso.
- **Personal:** categorías y presupuesto de gastos, tipos y plataformas de la watchlist, etiquetas de notas.

## 9. Modelo de datos (Postgres)
Todas las tablas llevan `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at`, `updated_at` (con trigger) y RLS.

- **Ajustes:** `settings` (jsonb por sección)
- **Gym:**
  - `exercises` (name, aliases text[], muscle_group, type, unit, met, archived)
  - `workouts` (date, started_at, duration_min, met_kcal, watch_kcal, notes, kind default 'strength', result jsonb null ← reservado para WODs)
  - `workout_items` (workout_id, exercise_id, position, notes)
  - `sets` (item_id, position, weight_kg, reps, seconds, meters, calories, done)
- **Nutrición:**
  - `foods` (name, kcal, protein, carbs, fat, fiber; todo por 100 g)
  - `recipes` (name, photo_path, notes); `recipe_items` (recipe_id, food_id, grams)
  - `meals` (date, slot); `meal_items` (meal_id, food_id | recipe_id, grams)
- **Agenda:**
  - `calendars` (caldav_url, name, color, visible, is_default)
  - `events` (calendar_id, uid, href, etag, title, starts_at, ends_at, all_day, location, notes, raw_ics, deleted) — `start`/`end` son palabras reservadas; `href` es la URL del .ics para PUT/DELETE
  - `sync_state` (calendar_id, ctag, sync_token, last_synced_at, last_error)
- **Uni:**
  - `subjects` (name, color, ects, course, term, grade)
  - `deadlines` (subject_id, title, due_at, kind, done)
  - `tfg_milestones` (title, progress, due_at)
- **Personal:**
  - `expenses` (amount, category_id → expense_categories, date, note); `expense_categories` (name, monthly_budget)
  - `watchlist` (title, kind, status, platform, progress, rating, notes)
  - `notes` (title, body, tags text[], pinned)
- **Inglés:**
  - `english_profile` (level, answers jsonb; una fila por usuario)
  - `vocab_cards` (term, translation, example, box 1–4, due_on, source)
  - `english_exercises` (section, payload jsonb, solution jsonb)
  - `english_attempts` (exercise_id, answer, correct, feedback, rule)
  - `songs` (artist, title, lyrics, lesson jsonb)
  - `artists` (name, spotify_url, youtube_url)
  - `english_daily` (date, points, streak)
- **Convenciones del esquema:** los valores enumerados se guardan con códigos en inglés (`strength|gymnastics|metcon|cardio`, `kg|reps|time|meters|calories`, `pending|watching|done`…) y la interfaz los traduce. `settings` = una fila por sección (`unique(user_id, section)`). Un helper `private.own_table()` aplica RLS, políticas, trigger, índice y grants (solo `authenticated`). `public.keepalive()` es la única función accesible con la anon key.
- **Mantenimiento:** tarea de `pg_cron` que borra `cron.job_run_details` y `net._http_response` con más de 7 días.

## 10. Funciones de servidor y automatizaciones
- **`caldav` (Edge Function):**
  - Descubrimiento: PROPFIND `current-user-principal` → `calendar-home-set` → lista de calendarios.
  - Sincronización incremental con `ctag`/`etag`.
  - Crear y editar eventos con PUT de un VEVENT; borrar con DELETE.
  - Se ejecuta en Deno; si una librería no funciona ahí, se implementa con `fetch` y XML a mano.
  - Errores claros si fallan las credenciales.
- **`ai` (Edge Function):** proxy hacia el proveedor configurado, con límite de peticiones por día y caché de respuestas idénticas.
- **`pg_cron`:** sincronización de iCloud cada 15 min (llamada vía `pg_net`) y limpieza diaria.
- **GitHub Actions:**
  - `deploy.yml`: build, test y despliegue a Pages.
  - `keepalive.yml`: cada 3 días, una consulta ligera a Supabase para que el proyecto gratuito no se pause.
  - `backup.yml`: semanal; exporta todas las tablas a JSON y hace commit en el repo **privado** `hub-data` (con un token fine-grained guardado en Actions secrets).

## 11. Importación del Excel `Tracker GYM.xlsx` (nutrición)
El archivo va en `data-import/` (ignorado por git). Script `scripts/import-nutrition.ts`, idempotente:
- **Hoja `Alimentos`** (46 filas: Nombre, Calorías, Proteínas, Carbohidratos, Grasas y Fibra por 100 g) → `foods`. Convierte los decimales con coma escritos como texto (p. ej. "0,5") y quita los espacios sobrantes de los nombres.
- **Hoja `Recetas`** → `recipes` + `recipe_items` (pares Alimento N / Cantidad N). Ignora las filas que son notas de ayuda.
- **Hoja `Datos_Menu`** (Semana, Día, Momento, Alimento1..4, Cantidad1..4; ~22 semanas desde agosto) → `meals` + `meal_items`, calculando la fecha real a partir de "dd/mm - dd/mm" y el día de la semana (el año se deduce; pregunta si hay ambigüedad).
- **Hoja `Resumen_Semanal`:** no se importa; se recalcula.
- Al acabar, muestra un informe: filas importadas, omitidas y alimentos sin coincidencia.

## 12. Forma de trabajar
- Trabaja por fases (ver `FASES.md`). Al empezar cada fase: plan breve → implementación → tests → `npm run build` sin errores → commit con un mensaje claro.
- **No inventes** endpoints, rutas ni nombres de librerías: si dudas, compruébalo en la documentación o pregunta.
- Respuestas concisas: sin preámbulos ni resúmenes redundantes. Explica solo las decisiones que no sean obvias.
- Si algo del plan gratuito (Supabase, Gemini o GitHub) bloquea una funcionalidad, para y avisa con alternativas; no lo cambies a escondidas.
- Mantén este `CLAUDE.md` al día cuando cambie una decisión.
- Commits y PRs SIN ninguna atribución: nada de "Co-Authored-By: Claude", "Generated with Claude Code" ni enlaces de sesión. El único autor es Gerard.
