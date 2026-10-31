# Registro de hallazgos

Todo problema, error o suposición falsa detectado durante el desarrollo: **cómo se detectó, la causa, cómo se resolvió y cómo se verificó**. Complementa los ADRs (decisiones) y `AI_USAGE.md` (uso de IA).

**Estados:** ✅ resuelto · 📄 limitación aceptada y documentada · ⏳ pendiente

**Origen:** 🔍 revisión de consistencia · 🤖 revisión independiente (subagente) · 🧪 pruebas (tests, curl, E2E) · 👀 revisión visual o manual en el navegador · 🧠 revisión de código

## Resumen

| ID | Hallazgo | Origen | Estado | Solución |
|---|---|---|---|---|
| H-01 | JSON malformado respondía `500` | 🔍 | ✅ | ADR-0008 · `6c20291` |
| H-02 | ADR-0005 afirmaba algo falso sobre la caché | 🔍 | ✅ | Corrección del ADR |
| H-03 | `favorites.user_id` admite NULL | 🔍 | ✅ | FKs `NOT NULL` en Teams (ADR-0001) |
| H-04 | `/pokemon/` identifica formas, no especies | 🔍 | 📄 | ADR-0005 |
| H-05 | `gh pr create` en un fork apunta al repo original | 🔍 | ✅ | `--repo` explícito |
| H-06 | `--watch` creó tablas sin claves foráneas | 🧪 | ✅ | Recrear tablas (dev) |
| H-07 | Avisos de Prettier en archivos del boilerplate | 🧪 | 📄 | No se reformatean |
| H-08 | `DELETE /api/teams/1.0` borraba el equipo 1 | 🤖 | ✅ | `342c42a` |
| H-09 | Orden del listado de equipos no estable | 🤖 | ✅ | `5726cc4` |
| H-10 | `name: 123` respondía "es obligatorio" | 🤖 | ✅ | `d19c8fb` |
| H-11 | Tests que no cubrían lo que prometían los documentos | 🤖 | ✅ | `37976a2` |
| H-12 | `POST` concurrentes → `500 SQLITE_BUSY` | 🤖 | 📄 | ADR-0006 |
| H-13 | Strings como `"-1"` llegan a la PokeAPI | 🤖 | 📄 | ADR-0003 |
| H-14 | `422` o `502` no determinista en fallos mixtos | 🤖 | 📄 | ADR-0005 |
| H-15 | El servidor de Vite se cerró | 🧪 | ✅ | Reinicio |
| H-16 | Un 404 en consola por cada pausa al buscar, y favicon 404 | 👀 | ✅ | ADR-0010 · `73b02f3`, `8c8382f` |
| H-17 | ADR-0009 partía de una premisa falsa | 👀 | ✅ | ADR-0010 |
| H-18 | Selector incorrecto en una prueba E2E | 🧪 | ✅ | Corrección de la prueba |
| H-19 | Un commit intermedio dejaba el build roto | 🧠 | ✅ | Commits combinados |
| H-20 | Petición duplicada por página en desarrollo | 🧪 | ✅ | `8b3d0ec` |
| H-21 | Prueba E2E que suponía favoritos del demo | 🧪 | ✅ | Reescritura de la prueba |
| H-22 | Tarjetas apretadas y Favoritos desalineado | 👀 | ✅ | `5a334cb` |
| H-23 | La limpieza de una prueba E2E borraba datos reales | 🧠 | ✅ | Usuario nuevo por ejecución |
| H-24 | Columnas nuevas sin migraciones y con datos del usuario | 🧠 | ✅ | `ALTER TABLE` + fallback (ADR-0014) |
| H-25 | CSS que anulaba el tamaño de los sprites | 👀 | ✅ | Incluido en `18ce015` |
| H-26 | Apodo: doble `PATCH` con Enter y guardado al cancelar | 🧠 | ✅ | Incluido en `18ce015` |
| H-27 | Avisos del panel *Issues* de DevTools | 👀 | ⏳ | Pendiente menor |

---

## Backend

### H-01 · JSON malformado respondía `500` ✅
- **Detección:** revisión de consistencia (🔍), `curl -d '{bad json'` → `500 Error interno del servidor`.
- **Causa:** `express.json()` lanza un error con `type: 'entity.parse.failed'` (status 400) que `error.middleware.js` no reconocía y trataba como genérico.
- **Solución:** caso específico en `errorHandler` → `400 "El cuerpo de la petición no es JSON válido"` (ADR-0008, `6c20291`). Afecta a todos los endpoints; es infraestructura compartida, no el módulo de Favoritos.
- **Verificación:** test `responde 400 ante JSON con sintaxis inválida` y `curl`.

### H-03 · `favorites.user_id` admite NULL ✅
- **Detección:** 🔍, inspección del esquema real (`user_id INTEGER REFERENCES users`, sin `NOT NULL`).
- **Causa:** la FK la crea implícitamente la asociación de Sequelize.
- **Solución:** en Teams, `foreignKey: { name, allowNull: false }` con el mismo objeto en `hasMany` y `belongsTo` (ADR-0001). Favoritos no se toca.
- **Verificación:** esquema de `teams` y `team_members` con `NOT NULL` y `ON DELETE CASCADE`.

### H-04 · `/pokemon/` identifica formas, no especies 📄
- **Detección:** 🔍, peticiones reales: `deoxys` → 404, `025` → 404, `charizard-mega-x` ≠ `charizard`.
- **Causa:** `pokeapi.service.js` consulta `/pokemon/{nameOrId}`; el reto pide reutilizarlo sin cambios.
- **Resolución:** limitación aceptada (ADR-0005). La regla "sin duplicados" compara formas. En el frontend, la búsqueda por número del autocompletado acepta `025` (lo convierte con `Number`).

### H-06 · `--watch` creó tablas sin claves foráneas ✅
- **Detección:** 🧪, al verificar el esquema tras la Fase 1: `teams` sin `user_id`.
- **Causa:** al guardar varios archivos seguidos, el servidor de desarrollo reinició con el modelo a medias, y `sync()` creó las tablas incompletas. Además hubo un `EADDRINUSE` por la carrera entre procesos.
- **Solución:** se borraron las dos tablas (vacías) y se reinició; `sync()` las recreó bien.
- **Prevención:** riesgo anotado en el plan. En el futuro, verificar el esquema tras cambios de modelo.

### H-08 · `DELETE /api/teams/1.0` borraba el equipo 1 ✅
- **Detección:** 🤖, verificado empíricamente por el subagente.
- **Causa:** afinidad de tipos de SQLite: `'1.0'` se compara como `1` contra una columna INTEGER.
- **Solución:** `deleteTeam` acepta sólo `/^\d+$/`; otro formato → `404` (`342c42a`).
- **Verificación:** test `responde 404 ante ids no enteros sin borrar nada` (`1.0`, `1abc`, `abc`), con prueba de mutación: sin la validación, el test falla.

### H-09 · Orden del listado de equipos no estable ✅
- **Causa:** `ORDER BY created_at DESC` empata si dos equipos se crean en el mismo milisegundo.
- **Solución:** desempate `['id', 'DESC']` (`5726cc4`).

### H-10 · `name: 123` respondía "es obligatorio" ✅
- **Solución:** mensaje "es obligatorio y debe ser un texto no vacío" (`d19c8fb`).

### H-11 · Tests que no cubrían lo que prometían los documentos ✅
- **Detección:** 🤖. El plan decía que un test "cubría la cascada de forma indirecta", pero pasaría aunque no hubiera cascada. Tampoco se verificaba que con 7 miembros no se llamara a la PokeAPI.
- **Solución:** `37976a2`: `TeamMember.count() === 0` tras borrar, contador de llamadas a `fetch` con nombres no cacheables, test de `502` y lista vacía tras un `422`.
- **Verificación:** **pruebas de mutación**: al alterar el orden de validación o quitar la validación del id, los tests correspondientes fallan.

### H-12 · `POST` concurrentes → `500 SQLITE_BUSY` 📄
- **Detección:** 🤖. Reproducido: 20 `POST` simultáneos → 13 respondieron `500`.
- **Causa:** el dialecto SQLite de Sequelize abre una conexión aparte por transacción, y esas conexiones compiten por el bloqueo de escritura. Favoritos no lo sufre porque no usa transacciones.
- **Intento:** `busyTimeout` en el hook `afterConnect` → **no lo resolvió** (7–24 errores de cada 30); revertido.
- **Resolución:** limitación aceptada (ADR-0006). Uso real: un usuario creando equipos de a uno. Mejora futura: `retry` ante `SQLITE_BUSY`, modo WAL o Postgres. Los tests no crean equipos en paralelo.

### H-13 · Strings como `"-1"` llegan a la PokeAPI 📄
- Los números se validan localmente; los strings se delegan al servicio (`"-1"` → `422` tras consultar). Intencional para no duplicar lógica (ADR-0003).

### H-14 · `422` o `502` no determinista en fallos mixtos 📄
- Con `Promise.all`, si un pokémon no existe y otra consulta falla por red, gana el primer rechazo (ADR-0005).

### H-24 · Columnas nuevas sin migraciones y con datos del usuario ✅
- **Detección:** 🧠, antes de cambiar el modelo se revisó la base local: el usuario tenía un equipo "Test" (6 miembros) y 4 favoritos.
- **Causa:** `sync()` no altera tablas existentes; recrearlas borraba esos datos.
- **Solución:** respaldo de la base, `ALTER TABLE team_members ADD COLUMN sprite …` y `… types JSON NOT NULL DEFAULT '[]'`, más un fallback en el frontend (`useCompleteMembers`) para miembros sin foto (ADR-0014). El README documenta el paso para otras bases locales.
- **Verificación:** el equipo "Test" sigue intacto. La prueba E2E crea un equipo, le borra la foto en la base y comprueba que el fallback completa fotos y tipos.

## Frontend

### H-16 · Un 404 en consola por cada pausa al buscar, y favicon 404 ✅
- **Detección:** 👀, captura de DevTools del usuario: `/api/pokemon/pika 404` y 6 errores en consola.
- **Causa:** la búsqueda exacta con debounce dispara una consulta en cada pausa a media palabra, y Chrome registra cada 404 como error (no se puede suprimir desde JS). Aparte, `index.html` no declaraba un ícono.
- **Solución:** autocompletado local sobre un índice de 1351 nombres cargado una vez (ADR-0010, `73b02f3`) y `<link rel="icon" href="data:,">` (`8c8382f`).
- **Verificación:** E2E: 0 peticiones al escribir (incluso con pausas) y 0 errores de consola.

### H-17 · ADR-0009 partía de una premisa falsa ✅
- **Detección:** 👀, a raíz de H-16. La IA había afirmado que el autocompletado exigía modificar `pokeapi.service.js` por su límite de 100.
- **Causa:** el límite es **por página**; el endpoint acepta `offset` (verificado: `count=1351`, 14 páginas).
- **Solución:** ADR-0010 reemplaza la estrategia del ADR-0009; se revirtieron los cambios en `client.ts` que ya no se usaban.

### H-20 · Petición duplicada por página en desarrollo ✅
- **Detección:** 🧪, la E2E contaba 2 peticiones para la página 1.
- **Causa:** el modo estricto de React ejecuta los efectos dos veces en desarrollo; la primera petición se cancelaba, pero ya había salido.
- **Solución:** caché de la **promesa** en curso por página (`8b3d0ec`), con el mismo patrón en `pokemonIndex.ts` y `pokemonDetails.ts`.
- **Verificación:** E2E: 1 petición por página nueva, 0 al volver.

### H-22 · Tarjetas apretadas y Favoritos desalineado ✅
- **Detección:** 👀, capturas de la Pokédex.
- **Causa:** 4 columnas de 140 px apilaban botones y tipos; `.page` (640 px + padding) no coincidía con el layout inline de `Favorites.tsx` (640 px sin padding, margen de 40 px).
- **Solución:** 3 columnas, acciones al pie (`margin-top: auto`) y `.page` de 672 px con margen de 40 px (`5a334cb`), sólo con CSS.

### H-25 · CSS que anulaba el tamaño de los sprites ✅
- **Detección:** 👀, capturas del rediseño: sprites gigantes en la bandeja y la 6ª casilla desbordada. **Las pruebas pasaban**: sólo se vio en la revisión visual.
- **Causa:** `.poke-sprite { width: 96px; height: 96px }` tenía prioridad sobre los atributos `width`/`height` del `<img>`; las columnas `1fr` no podían achicarse por debajo del contenido.
- **Solución:** el tamaño se fija inline desde `PokemonSprite`, las columnas pasan a `minmax(0, 1fr)`, se ajustó el espaciado y los nombres largos terminan en "…" con `title`. Corregido antes del commit `18ce015`.

### H-26 · Apodo: doble `PATCH` con Enter y guardado al cancelar ✅
- **Detección:** 🧠, revisión del código antes de probar.
- **Causa:** Enter guardaba y el `blur` posterior volvía a guardar; Esc también dispara `blur`, que guardaba lo escrito.
- **Solución:** una bandera `finished` (`useRef`) marca la edición como terminada; Esc la cierra sin guardar.
- **Verificación:** E2E: Enter → exactamente 1 `PATCH`; Esc → 0 `PATCH` y el apodo se conserva.

### H-27 · Avisos del panel *Issues* de DevTools ⏳
- **Detección:** 👀, ícono 🚩1 en la captura del usuario. No es un error de consola.
- **Causa probable:** inputs sin `id`/`name` (p. ej. en `Login.tsx`, del boilerplate).
- **Pendiente:** confirmar el aviso exacto. Si viene de `Login.tsx`, decidir si se toca el boilerplate.

## Proceso, pruebas y entorno

### H-02 · ADR-0005 afirmaba algo falso sobre la caché ✅
- Decía que la caché evitaba consultas repetidas al resolver en paralelo; con `Promise.all` la caché se llena al llegar la respuesta, así que `["pikachu","pikachu"]` hace 2 llamadas. Corregido en el ADR (🔍).

### H-05 · `gh pr create` en un fork apunta al repo original ✅
- Se usa siempre `--repo walfro90-gorilla/axios-challenge-node`. Verificado: no se abrió nada en el repo de ventamovil.

### H-07 · Avisos de Prettier en archivos del boilerplate 📄
- `config/database.js`, `config/env.js` y líneas viejas de `error.middleware.js` ya fallaban `prettier --check` en `main`. No se reformatean para no ensuciar el diff. El código nuevo se formatea con `backend/.prettierrc.json`, también en el frontend.

### H-15 · El servidor de Vite se cerró ✅
- El proceso en segundo plano terminó con su sesión de shell. Se volvió a levantar; la E2E falló con `ERR_CONNECTION_REFUSED`, que lo hizo evidente.

### H-18 · Selector incorrecto en una prueba E2E ✅
- `ul li button` tomaba los botones "quitar" en lugar de las sugerencias. Diagnosticado leyendo el texto capturado; ahora se usan clases semánticas (`.suggestion`, `.slot-filled`) y atributos `data-pokemon` / `data-team`.

### H-19 · Un commit intermedio dejaba el build roto ✅
- Revertir `client.ts` antes de reescribir `Teams.tsx` rompía la compilación en ese commit. Se deshizo (`reset --soft`) y se juntaron ambos cambios. Regla: **cada commit debe compilar**.

### H-21 · Prueba E2E que suponía favoritos del demo ✅
- Esperaba que el demo tuviera a charizard; el usuario lo había quitado. Se verificó contra la API antes de tocar código y se reescribió la prueba sin depender de datos previos.

### H-23 · La limpieza de una prueba E2E borraba datos reales ✅
- **Detección:** 🧠, al revisar la base antes del rediseño: el usuario tenía a ivysaur como favorito y la limpieza de la prueba de la Pokédex borraba "ivysaur" del demo.
- **Solución:** cada ejecución E2E registra un usuario nuevo (`e2e-<timestamp>@test.mx`) y nunca toca el demo.
