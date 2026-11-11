# Gerard OS

Hub personal (PWA): Hoy · Gym · Agenda · Inglés · Personal. Vite + React + TypeScript + Supabase, desplegado en GitHub Pages.

```bash
cp .env.example .env.local   # URL y anon key de Supabase
npm install
npm run dev                  # http://localhost:5173  ·  galería de componentes en /#/dev/ui
npm test && npm run build
```

Especificación completa en `CLAUDE.md`; plan de trabajo en `FASES.md`.

## Importar la nutrición del Excel

Copia `Tracker GYM.xlsx` en `data-import/` (ignorado por git) y:

```bash
npm run import:nutrition -- --dry-run   # solo informe, no escribe
npm run import:nutrition                # escribe (requiere SUPABASE_SERVICE_ROLE_KEY e IMPORT_USER_ID en .env.local)
```

Es idempotente: se puede repetir sin duplicar datos. Si el año de las semanas es ambiguo, usa `--year=AAAA`.
