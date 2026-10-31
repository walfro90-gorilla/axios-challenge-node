# ADR-0009: Pantalla de Equipos con búsqueda debounced por nombre exacto

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Reemplaza parcialmente:** ADR-0007 (la pantalla de Equipos pasa de "fuera" a "dentro" del alcance)

## Contexto

Con el backend entregado (PR #1), se decidió sumar el bonus de la **pantalla de Equipos** con un buscador de pokémon que **no llame a la API en cada tecla**.

Restricciones verificadas:

- **No se puede modificar** `frontend/src/pages/Favorites.tsx` (regla del reto). El frontend no tiene router: `App.tsx` decide la pantalla por estado de sesión.
- **La PokeAPI no busca por texto parcial.** `GET /api/pokemon/:name` resuelve sólo nombres o ids exactos (404 si no existe), y `GET /api/pokemon` limita el listado a 100 elementos (`pokeapi.service.js`). Un autocompletado sobre los más de 1300 pokémon exigiría cambiar ese servicio, que el reto pide reutilizar.
- El frontend no tiene infraestructura de tests (no hay Vitest ni ESLint instalados); `npm run build` ejecuta `tsc` en modo `strict`.

## Decisión

### Búsqueda
- **Nombre o id exacto** contra `GET /api/pokemon/:name`, el endpoint existente.
- **Debounce de 400 ms** con un hook genérico `useDebouncedValue(value, delay)` en `frontend/src/hooks/`. La petición sólo sale cuando el usuario deja de escribir.
- **Cancelación** de la petición anterior con `AbortController`: si llega una búsqueda nueva, la respuesta vieja no puede pisar a la nueva (race condition).
- **Caché en memoria por pantalla** (`Map` en un `useRef`) de resultados encontrados y no encontrados: repetir una búsqueda no sale a red. Complementa, no reemplaza, la caché del backend.
- Mínimo **2 caracteres** tras `trim()` y pasado a minúsculas antes de buscar.

### Pantalla
- `frontend/src/pages/Teams.tsx`, siguiendo el estilo de `Favorites.tsx` (estilos inline, `api` de `client.ts`, manejo de error con un `<p>`).
  - Buscar → agregar al equipo en armado (máx. 6, sin repetidos; el botón se deshabilita) → nombre → **Crear** (`POST /api/teams`).
  - Lista de mis equipos con sus miembros y **Eliminar** (`DELETE /api/teams/:id`).
  - Las reglas se reflejan en la UI para guiar, pero **el backend sigue siendo la autoridad**: sus errores (`422`/`409`/`400`) se muestran tal cual.
- **Navegación:** `App.tsx` agrega una barra mínima "Favoritos | Equipos" con estado local, sin router. `Favorites.tsx` no se toca.

### Cambio mínimo en `client.ts`
- `api.get` acepta un segundo parámetro opcional `RequestInit` para pasar el `signal` del `AbortController`. Es retrocompatible: las llamadas existentes no cambian.
- Los errores se lanzan como `ApiError extends Error` con `status`, para distinguir un `404` (pokémon inexistente, que se cachea) de otros fallos (red, `401`), que no se cachean, sin depender del texto del mensaje. Sigue siendo un `Error`, así que `Favorites.tsx` y `Login.tsx` no cambian.

## Alternativas consideradas

1. **Autocompletado parcial.** Requiere traer el catálogo completo, cambiando el límite de 100 de `pokeapi.service.js`, o reimplementar el consumo de la PokeAPI. **Rechazada** (lo penaliza el reto).
2. **Filtrar en el navegador los primeros 100.** Cero llamadas, pero no encuentra el 90 % de los pokémon. **Rechazada.**
3. **Librería de debounce (lodash.debounce, use-debounce).** Una dependencia nueva para ~10 líneas. **Rechazada.**
4. **Sólo descartar respuestas viejas con un flag, sin `AbortController`.** Evita tocar `client.ts`, pero las peticiones obsoletas igual viajan. **Rechazada:** el cambio en `client.ts` es de una línea y retrocompatible.
5. **React Router para navegar.** Dependencia nueva para dos pantallas. **Rechazada.**

## Consecuencias

- **+** Mientras se escribe sale **a lo sumo una petición por pausa**, y ninguna para búsquedas repetidas.
- **+** Completa el bonus de UI sin tocar Favoritos ni `pokeapi.service.js`.
- **−** Sin búsqueda parcial: hay que escribir el nombre completo (o el id). Se indica en la UI con un texto de ayuda.
- **−** Sin tests automatizados de frontend (no hay infraestructura). La verificación es con `tsc` (`npm run build`) y una prueba E2E manual con un navegador headless que cuenta las peticiones. Agregar Vitest + Testing Library queda en "qué haría con más tiempo".
- **−** Se modifican `App.tsx` y `client.ts` (compartidos). Ambos cambios son mínimos y se declaran en el PR.
