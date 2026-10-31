# Documentación de uso de IA

> Entregable obligatorio del reto. Describe con honestidad cómo dirigí y validé a la IA.

---

## 1. Herramientas utilizadas

- **Claude Opus** (Anthropic) como agente de código dentro de **OpenCode**, con acceso al repositorio y a una terminal (lectura de archivos, ejecución de `npm test`, `curl`, `git`, `gh`).
- Un **subagente** de la misma herramienta, lanzado con contexto limpio y en modo sólo lectura, para la revisión independiente del código.

No usé otras herramientas de IA.

## 2. ¿Cómo la usaste? (flujo general)

Trabajé en modo **"decisiones primero, código después"**, con puntos de control donde la IA se detenía a esperar mi aprobación:

1. **Contexto:** le pedí a la IA leer todo el repo y resumir el reto.
2. **ADRs antes de código:** le pedí documentar como ADRs las decisiones que exige el challenge (`docs/adr/`).
3. **Plan:** a partir de los ADRs, un plan de implementación; le pedí que fuera agéntico sólo si tenía sentido (`docs/IMPLEMENTATION_PLAN.md`).
4. **Revisión de consistencia:** antes de implementar, le pedí cotejar todos los `.md` del reto contra los ADRs y verificar contra el código real. De ahí salieron 3 errores y 4 huecos en los ADRs, y 3 decisiones que tomé yo.
5. **Implementación por fases** con commits convencionales, tests y pruebas con `curl` contra la PokeAPI real.
6. **Revisión independiente** por un subagente, cuyos hallazgos se clasificaron en corregir / documentar / descartar.
7. **Mejora posterior a la entrega:** pedí una pantalla de Equipos con búsqueda **debounced** (que no llame a la API en cada tecla). Primero se registró como ADR-0009 y después se verificó con un navegador headless que **cuenta las peticiones**.
8. **Revisión manual en el navegador:** al probarla yo mismo con DevTools vi errores en la consola. Con esa captura le pedí a la IA revisar y mejorar, y de ahí salió el ADR-0010 (autocompletado local) más 5 mejoras de UI que elegí.
9. **Pedido de revisión:** me pidieron agregar paginación y que se viera bien. Con la IA definí el alcance (ADRs 0011–0013), se implementó con E2E y se pulió a partir de capturas de pantalla.
10. **Rediseño de Favoritos y Equipos:** pedí corazón para favorito, pokéball para equipo y una mejora considerable de la UI/UX. Decidí las dos disyuntivas (página nueva de favoritos y guardar fotos en los miembros) y la IA implementó, probó (36 pasos E2E) y pulió a partir de capturas.

## 3. Prompts clave

### Prompt 1: ADRs antes de escribir código
```
antes de eso, necesito que crees ADR's acerca de lo que pide el challenge.
```
**Para qué lo usé / resultado:** forzar que las decisiones (modelo de datos, códigos HTTP, 404 vs 403, reutilización de la PokeAPI, transacción, alcance) quedaran explícitas y revisables **antes** de que existiera código. Resultado: 7 ADRs iniciales (luego 8).

### Prompt 2: plan derivado de los ADRs
```
a base de las ADR's, crea un plan para implementarlo. Si es necesario que sea plan agentico, hazlo así.
```
**Para qué lo usé / resultado:** un plan por fases con criterio de "hecho" y verificación en cada una. La IA argumentó que paralelizar la escritura con varios agentes no convenía (pasos dependientes, riesgo de inconsistencias) y propuso un esquema híbrido: implementación secuencial + un subagente revisor con contexto limpio + puntos de control humanos. Acepté ese enfoque.

### Prompt 3: revisión de consistencia (el que más movió la aguja)
```
antes de continuar, revisemos si el proyecto es consistente, o si hay cosas que no podríamos
implementar? Revisa completo los .md donde viene información y cotejémoslo con los ADR's para
ver si los tenemos completos y correctos.
```
**Para qué lo usé / resultado:** obligar a la IA a validar sus propios documentos contra la realidad. Ejecutó pruebas y encontró, entre otros:
- **Un bug del boilerplate:** un JSON con sintaxis inválida devolvía `500` en vez de `400`.
- **Una afirmación falsa en su propio ADR** sobre la caché (ver sección 6).
- **Limitaciones de la PokeAPI** verificadas con peticiones reales: `deoxys` → 404, `025` → 404, `charizard-mega-x` cuenta como distinto de `charizard`.
- **Un riesgo de entrega:** en un fork, `gh pr create` apunta por defecto al repo original.

### Prompt 4: mis decisiones sobre los puntos abiertos
```
A. a   (corregir el 500 de JSON malformado en error.middleware.js)
B. si  (rechazar equipos vacíos con 422)
C. si  (nombre de equipo máx. 50 caracteres → 400)
```
**Para qué lo usé / resultado:** la IA presentó opciones con su recomendación y yo decidí. La decisión A se convirtió en el ADR-0008, con su propio commit `fix:` y su test.

### Prompt 5: debounce en la búsqueda
```
quiero agregar mejoras, como debounce; no estar llamando la api cada que se busca, si no tenerlo debounced.
```
**Para qué lo usé / resultado:** la IA revisó primero el frontend y me hizo notar que **no existía ningún buscador** (Favoritos carga una lista fija de 20) y que la PokeAPI **no busca por texto parcial**. Me presentó opciones y elegí: pantalla de Equipos (bonus, sin tocar Favoritos) + búsqueda por nombre exacto con debounce de 400 ms, cancelación con `AbortController` y caché de resultados (incluidos los 404). Verificación E2E: escribiendo como una persona salieron **4 peticiones** en todo el recorrido; con el debounce desactivado, **32**.

### Prompt 6: revisión con mi captura de DevTools
```
[captura de la pantalla de Equipos con DevTools: 404 en /api/pokemon/pika y 6 errores en consola]
revisa y mejoremos
```
**Para qué lo usé / resultado:** la IA reprodujo mi sesión en un navegador headless capturando la consola y explicó los errores: el `favicon.ico` 404 del boilerplate y un 404 por cada pausa a media palabra (Chrome los registra como errores y no se pueden suprimir). También **reconoció que su ADR-0009 partía de una premisa falsa**: el autocompletado sí era posible sin tocar el backend, paginando con `offset` (1351 pokémon en 14 páginas, verificado). Elegí el autocompletado local y 5 mejoras de UI: pestaña activa visible, explicar por qué "Crear equipo" está deshabilitado, Enter para agregar, espaciado y favicon. Resultado verificado E2E (21 pasos): **0 peticiones por tecla**, índice cargado una sola vez y **0 errores de consola**.

### Prompt 7: paginación y diseño
```
me dijo que agregue paginación y que se vea bien; si ya cumplimos con el challenge, vayamos a mejorarlo,
podemos agregar paginación y agregar más datos de la API, fotos, tipo? o qué sería mejoría?
```
**Para qué lo usé / resultado:** la IA revisó qué datos ya exponía el servicio (foto y tipos sí; estadísticas no, porque exigían modificar `pokeapi.service.js`) y me planteó opciones con sus trade-offs: dónde paginar sin romper la regla de no tocar Favoritos, cómo evitar 21 peticiones por página y CSS propio frente a Tailwind. Elegí: pestaña Pokédex nueva, foto y tipos agregados en el backend (`details=true`), CSS propio y el mismo PR.

### Prompt 8: corazón, pokéball y rediseño
```
mejora la sección favorito y equipo. Mejora la UI/UX, agrega un corazón en favorito y una pokéball
en equipo. Y en sí mejóralo considerablemente
```
**Para qué lo usé / resultado:** antes de diseñar, la IA me planteó dos disyuntivas: (1) mejorar Favoritos chocaba con la regla de no tocar ese módulo, y (2) para mostrar fotos en los equipos había que guardarlas o pedirlas en cada carga. Elegí una página nueva de favoritos (`Favorites.tsx` intacto) y guardar foto y tipos en los miembros. La IA detectó además que yo tenía un equipo y favoritos propios en la base local: **en lugar de recrear las tablas agregó las columnas con `ALTER TABLE`** (con respaldo previo) y cambió las pruebas E2E para usar un usuario nuevo en cada ejecución.

## 4. Qué acepté, rechacé o corregí de la IA

| Sugerencia de la IA | ¿Acepté / rechacé / corregí? | ¿Por qué? |
|---|---|---|
| ADR-0005 afirmaba que "la caché evita repetir consultas" al resolver especies en paralelo | **Corregí** | Es falso con `Promise.all`: la caché sólo se llena al llegar la respuesta, así que `["pikachu","pikachu"]` hace 2 llamadas. Se detectó en la revisión de consistencia. |
| Modelo con `userId` nullable, copiando a Favoritos | **Corregí** | Verificamos en el esquema real que `favorites.user_id` admite NULL. En Teams las FKs se declararon `NOT NULL`. |
| Validar en un middleware, como sugiere el diagrama de `ARCHITECTURE.md` | **Rechacé** | El boilerplate no tiene middlewares de validación y partiría las reglas en dos lugares. Queda justificado en el ADR-0002. |
| Arreglar el 500 por JSON inválido tocando `error.middleware.js` | **Acepté** (decisión A) | Es infraestructura compartida, no Favoritos. Son 3 líneas con test y la rúbrica premia la validación robusta. |
| Implementar todos los bonus | **Rechacé** | El reto está calibrado para ~1 h. Sólo se hizo el bonus de duplicados (`409`), que casi no costaba nada. Ver ADR-0007. |
| Reformatear con Prettier los archivos del boilerplate que no pasaban `--check` | **Rechacé** | Eran avisos previos (se verificó contra `main`). Reformatearlos ensuciaría el diff con cambios ajenos al reto. |
| Hallazgos del subagente revisor (11) | **Acepté 4 correcciones, documenté 4, descarté 1** (los 2 restantes ya estaban previstos para la última fase) | Correcciones: `DELETE /1.0` borraba el equipo 1 (afinidad de tipos de SQLite), orden inestable, mensaje confuso y tests que no cubrían lo que los ADRs prometían. Documentados: concurrencia SQLite, asimetría de validación, `422`/`502` no determinista. |
| Configurar `busyTimeout` para arreglar `SQLITE_BUSY` con `POST` concurrentes | **Rechacé tras probarlo** | Se aplicó en forma temporal, se midió (seguía habiendo 7–24 errores de cada 30) y se revirtió. Quedó como limitación documentada en el ADR-0006. |
| Autocompletado parcial ("pik" → pikachu) para el buscador | **Rechacé primero, luego lo adopté** | La IA dijo que exigía cambiar `pokeapi.service.js`, así que elegí búsqueda exacta (ADR-0009). Al probarla en el navegador vi 404 en consola; la IA revisó y reconoció que la premisa era falsa (el endpoint acepta `offset`). Se adoptó el autocompletado local (ADR-0010). |
| Mantener los cambios de `client.ts` (`signal`, `ApiError`) tras pasar a búsqueda local | **Rechacé** | Ya no se usaban. Se revirtieron para tocar menos código compartido. |
| Librería de debounce o React Router | **Rechacé** | Dependencias nuevas para ~10 líneas y dos pantallas. |
| Confiar en que el debounce funcionaba porque compila | **Corregí** | Se exigió una prueba E2E que cuenta peticiones, y se comprobó que **falla** con el debounce desactivado (32 peticiones frente a 4). |
| Paginar el catálogo dentro de `Favorites.tsx` | **Rechacé** | Rompe la regla del challenge en el mismo PR que se evalúa. Se creó una pestaña Pokédex aparte (ADR-0012). |
| Que el frontend pida el detalle (foto/tipos) de cada tarjeta | **Rechacé** | Serían 21 peticiones por página desde el navegador. El backend las agrega con `details=true` (ADR-0011). |
| Tailwind o una librería de componentes | **Rechacé** | Dependencias y configuración para tres pantallas. CSS propio (ADR-0013). |
| Estadísticas, altura y peso | **Pospuse** | Exigen modificar `pokeapi.service.js`. |
| Primera versión visual de la Pokédex (4 columnas) | **Corregí** | Las capturas mostraron botones y tipos apilados, tarjetas de distinta altura y Favoritos desalineado. Se pasó a 3 columnas y se alineó el layout sólo con CSS. |
| Recrear las tablas de equipos para agregar `sprite` y `types` | **Rechacé** | Borraba un equipo que yo había creado a mano. Se agregaron las columnas con `ALTER TABLE` y un fallback en el frontend para filas sin foto. |
| Pruebas E2E con el usuario demo | **Corregí** | Una versión anterior borraba favoritos del demo (ivysaur) al limpiar. Ahora cada ejecución registra un usuario nuevo. |
| Primera versión del rediseño | **Corregí** | Las capturas mostraron sprites gigantes en la bandeja (el CSS fijaba 96 px y anulaba el tamaño pedido), la 6ª casilla desbordada, espaciado pegado y "Charmande/r" partido. Se corrigió y se volvió a verificar. |
| Usar `retry` de Sequelize ante `SQLITE_BUSY` (sugerencia del subagente) | **Pospuse** | Toca `config/database.js` (compartido) y no se verificó. Queda en "qué haría con más tiempo". |

## 5. Decisiones de diseño que tomaste tú

Lo que yo dirigí o decidí (la IA propuso opciones y redactó, pero no decidió esto):

- **Proceso:** escribir **ADRs antes de cualquier código**, derivar el plan **de los ADRs** y exigir una **revisión de consistencia** de toda la documentación del reto contra los ADRs antes de implementar.
- **Plan agéntico sólo si tenía sentido:** acepté el esquema híbrido y la revisión independiente por un subagente.
- **Puntos de control:** avanzar por fases con mi aprobación (Fase 0, luego 1–5, luego 6 y 7).
- **JSON malformado → `400`:** corregir el bug del boilerplate en lugar de sólo anotarlo (ADR-0008).
- **Equipos vacíos → `422`:** un equipo debe tener al menos 1 pokémon.
- **Nombre máx. 50 caracteres → `400`.**
- **Entrega:** trabajar sobre un **fork propio** (`walfro90-gorilla/axios-challenge-node`) en la rama `feat/teams-module`.
- **Herramienta:** usar sólo Claude Opus y documentar honestamente su uso.
- **Debounce en la búsqueda:** la mejora fue idea mía. Elegí la pantalla de Equipos y la búsqueda por nombre exacto entre las opciones presentadas.
- **Probar en el navegador con DevTools** y llevarle a la IA la evidencia (captura). Eso destapó los 404 y la premisa falsa del ADR-0009.
- **Corazón y pokéball:** pedí estos íconos y la mejora de Favoritos y Equipos; decidí página nueva de favoritos (sin tocar `Favorites.tsx`) y guardar foto y tipos en los miembros.
- **Paginación y diseño:** pestaña Pokédex nueva en lugar de tocar Favoritos, foto y tipos en el catálogo, CSS propio y entregar en el mismo PR.
- **Autocompletado local** (ADR-0010) y las mejoras de UI: pestaña activa clara, explicar "Crear equipo", Enter para agregar, espaciado y quitar el 404 del favicon.

Las decisiones que venían dictadas por el reto (máx. 6 → `422`, especie inexistente → `422` reutilizando `pokeapi.service.js`, ownership → `404`) quedaron registradas en los ADRs 0003–0005.

## 6. ¿Dónde te falló o te "alucinó" la IA?

> El registro completo de hallazgos (27, con causa, solución y verificación) está en [`FINDINGS.md`](./FINDINGS.md). Aquí sólo los relacionados con errores de la IA.

- **Afirmación falsa sobre la caché (ADR-0005).** La IA aseguró que la caché evitaba consultas repetidas dentro de un equipo; con `Promise.all` no es así. Lo detectó la propia IA, pero **sólo porque le pedí la revisión de consistencia**.
- **Afirmación falsa sobre la cobertura de tests (plan).** El plan decía que un test "cubría la cascada de forma indirecta". El subagente revisor señaló que no: el test pasaría aunque la cascada no existiera. Se agregó una verificación explícita (`TeamMember.count() === 0`).
- **Suposición de que no habría problemas de concurrencia.** El ADR-0006 sólo se preocupaba de que la transacción fuera "corta". La revisión demostró que con `POST` simultáneos SQLite responde `500 SQLITE_BUSY` (13 de 20 en una prueba). No estaba previsto.
- **Efecto colateral al editar con el servidor en `--watch`.** Al guardar los modelos en varios pasos, el servidor de desarrollo se reinició a mitad de camino y creó las tablas **sin** sus claves foráneas (`sync()` no altera tablas ya existentes). La IA lo detectó al verificar el esquema, borró las tablas (vacías) y se recrearon bien. El riesgo estaba anotado en el plan, pero igual ocurrió.
- **Premisa falsa en el ADR-0009.** La IA afirmó que el autocompletado requería modificar `pokeapi.service.js` por su límite de 100. El límite es **por página** y el endpoint acepta `offset`: el catálogo completo se trae en 14 páginas sin tocar el backend. No lo detectó ninguna revisión automática: **lo destapé yo al probar en el navegador** y ver los 404 que provocaba la búsqueda exacta.
- **Una prueba E2E que borraba datos reales.** La limpieza de la prueba de la Pokédex quitaba a ivysaur de los favoritos del usuario demo, aunque yo lo había agregado por mi cuenta. La IA lo notó al revisar la base antes del rediseño y pasó todas las pruebas a usuarios nuevos.
- **CSS que anulaba el tamaño de las imágenes.** `.poke-sprite` fijaba 96 px y anulaba el tamaño pedido por cada componente: la bandeja mostraba sprites gigantes. Se detectó en las capturas, no en las pruebas (que pasaban).
- **Una prueba E2E que suponía datos que ya no existían.** Daba por hecho que el usuario demo tenía a charizard como favorito; yo lo había quitado al probar. La IA verificó contra la API antes de tocar el código y reescribió la prueba para que no dependiera de datos previos.
- **Una petición duplicada que sólo se veía en desarrollo.** El modo estricto de React ejecutaba dos veces la carga de cada página. Se detectó porque la prueba contaba peticiones, y se corrigió cacheando la promesa en curso.
- **Un selector incorrecto en su propia prueba E2E.** Dos pasos fallaron porque el selector tomaba los botones "quitar" en lugar de las sugerencias. La IA lo diagnosticó como error de la prueba (no de la app) leyendo el texto capturado, y lo corrigió.
- **Un intento de arreglo que no funcionó** (`busyTimeout`). Lo valioso fue que la IA midió antes de dar el arreglo por bueno y lo revirtió.

Lección: la IA escribió afirmaciones plausibles pero falsas en su propia documentación. **Pedirle que verificara contra el código y que pasara por una revisión independiente fue lo que las sacó a la luz.**

## 7. ¿Qué harías distinto con más tiempo?

- Versionar las pruebas E2E en el repo (hoy viven fuera, en `/tmp`) y correrlas en CI.
- Resolver el aviso pendiente del panel *Issues* de DevTools (H-27).

- Resolver la concurrencia de escritura en SQLite (`retry` ante `SQLITE_BUSY` o modo WAL); en producción, Postgres.
- `GET /api/teams/:id` y `PATCH /api/teams/:id`.
- Tests automatizados de frontend (Vitest + Testing Library) para el hook de debounce, `searchPokemon` y la pantalla de Equipos, y versionar la prueba E2E (Playwright). Hoy se verifica con `tsc` y una prueba E2E manual fuera del repo.
- Endpoint de búsqueda en el backend (`GET /api/pokemon/search?q=`) si el catálogo creciera, y sprites en las sugerencias.
- Validar especies reales (`/pokemon-species/`) y normalizar ids como `025`. Implica evolucionar `pokeapi.service.js` (beneficiaría también a Favoritos).
- Reportar todas las especies inválidas a la vez (`Promise.allSettled`) con una precedencia clara entre `422` y `502`.
- Reintentos ante `429`/`5xx` de la PokeAPI.
- Orden explícito (`position`) y apodos por miembro.
- Migraciones en lugar de `sync()`.
- Desde el proceso: poner antes el chequeo empírico (scripts de casos borde) en lugar de dejarlo a la revisión final.
