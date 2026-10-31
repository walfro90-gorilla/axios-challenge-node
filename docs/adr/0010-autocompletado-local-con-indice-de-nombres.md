# ADR-0010: Autocompletado local con índice de nombres

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Reemplaza parcialmente:** ADR-0009 (la estrategia de búsqueda; la pantalla y la navegación se mantienen)

## Contexto

El ADR-0009 implementó la búsqueda por **nombre exacto** con debounce contra `GET /api/pokemon/:name`. Al probarla en el navegador aparecieron dos problemas:

1. **Cada pausa a mitad de palabra genera un 404** (`/api/pokemon/pika`). Chrome registra cada 404 de red como error de consola (no se puede suprimir desde JavaScript), y la UI muestra "No existe pika" mientras el usuario todavía escribe.
2. **El ADR-0009 partía de una premisa falsa:** afirmaba que el autocompletado exigía cambiar el límite de 100 de `pokeapi.service.js`. En realidad el límite es **por página** y el endpoint existente acepta `offset`. Verificado: `GET /api/pokemon?limit=100&offset=1300` → `count=1351`, 51 resultados, `next=null`. El catálogo completo son **14 páginas**, accesibles sin tocar el backend.

## Decisión

### Índice de nombres
- Al abrir la pantalla de Equipos se carga el índice `{ id, name }` de todos los pokémon: una primera página para conocer `count` y luego el resto en paralelo, todo con `GET /api/pokemon?limit=100&offset=N`, que es el endpoint existente.
- El `id` se obtiene de la `url` de cada resultado (`…/pokemon/25/`), así que también se puede buscar por número.
- El índice se guarda en una **promesa a nivel de módulo**: se pide una vez por sesión de la página, y cambiar de pestaña no lo vuelve a pedir. Si falla, se descarta para permitir un reintento.
- Del lado del servidor, `pokeapi.service.js` ya cachea cada página 5 minutos.

### Búsqueda
- **100 % local:** filtrado del índice (primero los que *empiezan* con el texto, luego los que lo *contienen*; un número busca por id exacto), máx. 8 sugerencias.
- **Cero peticiones por tecla.** Al elegir una sugerencia ya se tienen `id` y `name`; no se pide el detalle. El backend valida igualmente cada pokémon al crear el equipo (ADR-0005).
- Se mantiene `useDebouncedValue` (150 ms) para no recalcular las sugerencias en cada tecla. Ya no protege la red, sólo evita trabajo inútil de render.
- Teclado: ↑/↓ para moverse, **Enter** agrega la sugerencia resaltada (por defecto, la primera), Esc limpia.

### Limpieza
- Se **revierten** los cambios a `client.ts` (`signal` en `api.get` y `ApiError`): ya no se usan, así el PR toca menos código compartido.

## Alternativas consideradas

1. **Mantener la búsqueda exacta y subir el debounce a ~600 ms.** Menos 404, pero no los elimina y la búsqueda se siente más lenta. **Rechazada.**
2. **Endpoint de búsqueda en el backend** (`GET /api/pokemon/search?q=`). Sería lo correcto con un catálogo grande o cambiante, pero amplía el backend y requeriría tocar o envolver el servicio. Para 1351 nombres estáticos (~40 KB) el índice en el cliente es suficiente. **Pospuesta.**
3. **Pedir el detalle (sprite) al elegir una sugerencia.** Una petición por pokémon agregado sólo para mostrar una imagen. **Rechazada** por ahora.
4. **Cargar el índice de forma secuencial** (más amable con la PokeAPI). Unas 14 veces más lento en la primera carga. Con la caché del backend, el impacto sobre la PokeAPI son como mucho 14 peticiones cada 5 minutos. **Rechazada.**

## Consecuencias

- **+** Sin 404 ni errores de consola al buscar; sugerencias instantáneas y búsqueda parcial ("pik" → pikachu).
- **+** Sin peticiones mientras se escribe (antes: una por pausa).
- **−** Costo fijo al abrir Equipos por primera vez: 14 peticiones (unos 40 KB). Mientras carga se muestra "Cargando catálogo…".
- **−** Las sugerencias no muestran sprite.
- **−** El índice incluye formas (`charizard-mega-x`), coherente con la limitación del ADR-0005.
