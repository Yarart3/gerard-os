# Cómo construir el Hub personal con Claude Code — paso a paso

## 0. Preparación (lo haces tú, una sola vez, ~20 min)
1. **Cuentas:**
   - GitHub (ya la tienes).
   - Supabase: entra en supabase.com con GitHub y crea el proyecto `hub` en la región **EU (Frankfurt o París)**. Guarda la contraseña de la base de datos.
   - Google AI Studio: crea una API key de Gemini.
   - Apple: en appleid.apple.com → Inicio de sesión y seguridad → **Contraseñas específicas de app** → crea una llamada `hub-caldav`.
2. **En el Mac:**
   - Node.js 20 o superior (`node -v`) y Git.
   - Supabase CLI: `brew install supabase/tap/supabase`.
   - Claude Code: `npm install -g @anthropic-ai/claude-code`.
3. **Repositorios en GitHub:**
   - `hub`: **público**, vacío, sin README.
   - `hub-data`: **privado**, para los backups.
4. **Carpeta local:**
   ```bash
   mkdir hub && cd hub && git init
   mkdir data-import   # copia aquí Tracker_GYM.xlsx (no se sube a GitHub)
   ```
   Copia `CLAUDE.md` y `FASES.md` a la raíz de la carpeta `hub`.
5. Abre Claude Code dentro de `hub` con el comando `claude`.

## Qué modelo usar en cada fase
| Fase | Modelo (`/model`) | Modo |
|---|---|---|
| 1 · Arquitectura y base | **Opus** | **Plan mode** (Shift+Tab hasta "plan"). Revisas el plan y luego le dejas ejecutar |
| 2 a 6 · Secciones | **Sonnet** | Normal. Si una fase se atasca dos veces, cambia a Opus solo para ese problema |
| Retoques mecánicos (textos, colores, renombrar) | **Haiku** | Normal |

**Una fase por sesión.** Usa `/clear` entre fases: el contexto se mantiene gracias a `CLAUDE.md`, así gastas menos tokens y no se mezclan los temas.

---

## FASE 1 — Base, autenticación, diseño y despliegue  *(Opus, plan mode)*
Copia y pega:
```
Lee CLAUDE.md entero. Fase 1: monta la base del proyecto.
1. Scaffold Vite + React + TS estricto, HashRouter, vite-plugin-pwa, Vitest, ESLint/Prettier. .gitignore con .env*, data-import/ y *.xlsx.
2. Sistema de diseño de la sección 4 de CLAUDE.md: tokens en CSS (claro, oscuro y automático) y todos los componentes base. Crea una ruta /dev/ui que muestre cada componente en los dos temas.
3. Layout: TabBar en móvil y Sidebar en escritorio (sección 5), PageHeader con la rueda ⚙️ que abre un Sheet, y las 5 pestañas con sus pantallas vacías y EmptyState.
4. Supabase: vincula el proyecto con la CLI, crea TODAS las migraciones del modelo de datos (sección 9) con RLS y triggers de updated_at, y genera los tipos TS.
5. Auth con enlace mágico solo para mi email y pantalla de login minimal. Después dime cómo desactivar los registros nuevos.
6. Ajustes generales (tema, perfil, exportar JSON) con la tabla settings.
7. GitHub Actions: deploy.yml (build + test + Pages) y keepalive.yml. Dime exactamente qué secrets crear en GitHub y dónde se activa Pages.
Antes de escribir código, enséñame el plan y la estructura de carpetas. Pregúntame lo que necesites (URL y anon key de Supabase, etc.).
```

## FASE 2 — Gym + Nutrición + importar el Excel  *(Sonnet)*
```
Lee CLAUDE.md. Fase 2: sección Gym completa (sección 6 → Gym) con su Sheet de ajustes (sección 8).
- Entreno: ejercicios en el orden en que los hago, series con el último valor ya puesto, "Repetir sesión anterior", calorías MET junto al dato manual del Apple Watch.
- Historial con PRs, gráfica por ejercicio y resumen semanal. Catálogo (CRUD) y "Pegar WOD" con coincidencia difusa.
- Nutrición: alimentos, recetas, registro diario por comidas, resumen semanal y objetivos.
- Script scripts/import-nutrition.ts según la sección 11; ejecútalo con "data-import/Tracker GYM.xlsx" y dame el informe.
- Tests de: fórmula MET, cálculo de macros, matching de WOD y parser de fechas del Excel.
```

## FASE 3 — Agenda: iCloud CalDAV + Uni  *(Sonnet; Opus si CalDAV se resiste)*
```
Lee CLAUDE.md. Fase 3: sección Agenda (sección 6 → Agenda) y la Edge Function caldav (sección 10).
- Antes de nada, dime los comandos `supabase secrets set` que tengo que ejecutar (APPLE_ID, APPLE_APP_PASSWORD, CRON_SECRET) y espera a que confirme.
- Implementa: descubrimiento de calendarios, sincronización incremental, crear, editar y borrar eventos, "Probar conexión", pg_cron cada 15 min y la tarea de limpieza.
- Calendario con vistas mes, semana y día; eventos de la uni como eventos de todo el día.
- Uni: asignaturas, entregas con cuenta atrás, notas con media ponderada por ECTS y tablero del TFG.
- Prueba la conexión real con mi iCloud y enséñame el resultado.
```

## FASE 4 — Personal  *(Sonnet)*
```
Lee CLAUDE.md. Fase 4: sección Personal (Gastos, Watchlist y Notas) con su Sheet de ajustes. Gastos con presupuesto mensual por categoría y desglose; Watchlist por estados; Notas con buscador, etiquetas y fijadas. Tests de los totales de gastos.
```

## FASE 5 — Inglés  *(Sonnet; Opus para diseñar los prompts de la IA)*
```
Lee CLAUDE.md. Fase 5: sección Inglés (sección 7) y la Edge Function ai (sección 10).
1. PRIMERO hazme las preguntas de la sección 7, de pocas en pocas y con opciones. No construyas nada hasta tener mis respuestas.
2. Dime el comando para guardar GEMINI_API_KEY y espera a que confirme.
3. Construye las 7 secciones con mis respuestas. Cada respuesta de la IA debe ser JSON validado con Zod, y la sección tiene que funcionar sin IA usando los ejercicios guardados.
4. Al acabar, resume cada sección y pregúntame qué cambiar.
```

## FASE 6 — Hoy, pulido y backups  *(Sonnet)*
```
Lee CLAUDE.md. Fase 6:
- Pantalla Hoy con todas las tarjetas, configurables desde su Sheet (activar, desactivar y reordenar).
- backup.yml semanal hacia el repo privado hub-data (dime qué token fine-grained crear y con qué permisos).
- Revisión final: accesibilidad (contraste y objetivos de 44px), modo oscuro en todas las pantallas, PWA instalable en el iPhone (dime cómo añadirla a la pantalla de inicio), lectura offline y Lighthouse ≥ 90.
- Lista de bugs encontrados y arreglados.
```

---

## Consejos
- **Antes de cada fase**, haz commit de lo que tengas. Si una fase sale mal: `git reset --hard` y repites el prompt.
- Si Claude Code te pide permiso para ejecutar comandos, lee lo que va a hacer, sobre todo cualquier cosa que toque `supabase db reset` o borre datos.
- Las credenciales (Apple, Gemini) **las pegas tú en la terminal** con `supabase secrets set`. Nunca se las des en el chat.
- Cuando quieras cambiar algo del diseño o de una decisión, díselo y pídele que actualice `CLAUDE.md`.
