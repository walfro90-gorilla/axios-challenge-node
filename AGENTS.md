# AGENTS.md: memoria del proyecto para agentes de IA

Contexto para retomar el trabajo en una sesión nueva. Leer junto con `CHALLENGE.md`, `docs/adr/README.md` y `docs/FINDINGS.md`.

## Qué es
Reto técnico de Axios Mobile: Pokédex con JWT, Favoritos (referencia) y el módulo **Teams** (lo entregado), más mejoras de frontend pedidas en la revisión.

- **Fork:** `origin` = `walfro90-gorilla/axios-challenge-node` · `upstream` = `ventamovil/axios-challenge-node` (sólo lectura).
- **Rama de trabajo:** `feat/teams-module` → **PR #1** hacia `main` del fork.

## Reglas que no se rompen
1. **No modificar el módulo de Favoritos:** `backend/src/**/favorite*` ni `frontend/src/pages/Favorites.tsx`. La pestaña Favoritos usa `MyFavorites.tsx`; `Favorites.tsx` se conserva intacto como referencia (ADR-0015).
2. **No modificar ni reimplementar `backend/src/services/pokeapi.service.js`.** Reutilizar `listPokemon`, `getPokemon` y `assertSpeciesExists`.
3. **Ownership:** toda query de Teams filtra por `req.user.id`; un equipo ajeno responde `404`, no `403` (ADR-0004).
4. **Errores:** lanzar `HttpError` y usar `asyncHandler`; sin `try/catch` en los controladores.
5. **Decisiones nuevas → ADR nuevo** en `docs/adr/` (no reescribir los aceptados; agregar "Reemplaza"/"Amplía"). **Problemas encontrados → `docs/FINDINGS.md`.** Uso de IA → `docs/AI_USAGE.md`.
6. **Conventional Commits.** Cada commit debe compilar y pasar los tests. Revisar `git diff --cached --stat` antes de cada commit, sobre todo tras un `git reset` (H-19: un cambio que quedó preparado rompió `8c8382f`). Antes de publicar, verificar commit por commit en un worktree aparte.
7. **Push / PR:** sólo cuando el usuario lo apruebe. Siempre `gh pr ... --repo walfro90-gorilla/axios-challenge-node` (H-05).

## Comandos
```bash
cd backend && npm run dev      # API en :4000 (node --watch)
cd backend && npm test         # Jest + Supertest, BD en memoria (29 tests)
cd backend && npm run lint
cd backend && npm run seed     # recrea la BD de desarrollo (¡borra datos!)
cd frontend && npm run dev     # Vite en :5173, proxy /api → :4000
cd frontend && npm run build   # tsc estricto + build (única verificación estática del frontend)
npx prettier@3 --config backend/.prettierrc.json --write <archivos>   # también para el frontend
```
Usuario demo: `demo@axiosmobile.mx` / `demo1234`. **Contiene datos del usuario: no borrarlos.**

## Mapa del código
| Área | Archivos |
|---|---|
| Teams (backend) | `models/team*.js`, `services/teams.service.js`, `controllers/teams.controller.js`, `routes/teams.routes.js`, `tests/teams.test.js` |
| Listado con detalles | `controllers/pokemon.controller.js` (`?details=true`), `tests/pokemon.test.js` |
| Error JSON → 400 | `middlewares/error.middleware.js` |
| Pantallas | `pages/Pokedex.tsx`, `pages/MyFavorites.tsx`, `pages/Teams.tsx`, `App.tsx` (pestañas + bandeja) |
| Componentes | `components/pokemon.tsx` (tarjeta, ♥, pokéball, tipos), `components/team.tsx` (casillas, bandeja), `components/icons.tsx` |
| Estado/datos | `context/TeamDraftContext.tsx`, `hooks/useFavorites.ts`, `hooks/usePokemonDetail.ts`, `hooks/useDebouncedValue.ts`, `api/pokemonIndex.ts`, `api/pokemonDetails.ts` |
| Estilos | `frontend/src/styles.css` (sin dependencias) |

## Trampas conocidas
- **Sin migraciones (`sync()`):** un cambio de modelo no altera tablas existentes. En desarrollo usar `ALTER TABLE` (para preservar datos) o `npm run seed`. Verificar el esquema real tras cambiar modelos (H-06, H-24).
- **`node --watch`:** guardar varios archivos seguidos puede reiniciar a medias (`EADDRINUSE`, tablas incompletas) (H-06).
- **SQLite + transacciones:** `POST` concurrentes → `500 SQLITE_BUSY`. No crear equipos en paralelo en los tests (H-12).
- **Afinidad de tipos de SQLite:** `'1.0'` == `1`; validar ids con `/^\d+$/` (H-08).
- **PokeAPI `/pokemon/`** identifica formas: `deoxys` → 404, `025` → 404 (H-04).
- **Modo estricto de React:** los efectos corren dos veces en desarrollo; cachear la **promesa** en curso para no duplicar peticiones (H-20).
- **Los servidores en segundo plano** pueden cerrarse con la sesión de shell; comprobar `curl :4000/api/health` y `:5173` antes de una E2E (H-15).
- **`/tmp` se limpia entre sesiones:** los scripts de QA viven en `/tmp/opencode/qa` y `/tmp/opencode/e2e` y hay que recrearlos (no están en el repo).
- **En pruebas de red, usar el mismo predicado en `page.route` y `page.unroute`** y filtrar por `pathname` (un glob `**/api/**` también captura los módulos de Vite). Ver H-33.
- **Comprobar el invariante en el servidor**, no el número de llamadas: un doble clic correcto son 2 POST y 1 DELETE, no 1 POST.

## Verificación E2E (fuera del repo)
Scripts Playwright en `/tmp/opencode/e2e/`, con `playwright-core` y `/usr/bin/google-chrome`. **Cada ejecución registra un usuario nuevo** y nunca toca el demo (H-23). Además de las pruebas, revisar **capturas**: varios errores visuales sólo se vieron así (H-22, H-25).

**QA a fondo (2026-10-31):** 54 comprobaciones de API (`curl`) + 38 de interfaz (Chrome headless: consola, red, imágenes rotas, desbordes, responsive, token vencido, backend caído, doble clic, red lenta) + el build de producción. **38/38 y 54/54 en verde** tras corregir H-28 a H-32.

## Estado actual
- Challenge cumplido; mejoras pedidas (paginación, diseño, ♥/pokéball, Favoritos y Equipos) implementadas y verificadas.
- QA a fondo hecha: backend, frontend, build de producción y fallas silenciosas. Sin hallazgos abiertos.
- Sin hallazgos ⏳ en `docs/FINDINGS.md`; las limitaciones aceptadas (📄) y "qué haría con más tiempo" están en `docs/AI_USAGE.md`.
