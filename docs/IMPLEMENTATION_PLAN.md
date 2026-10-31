# Plan de implementación — Módulo Teams

Basado en los ADRs de [`docs/adr/`](./adr/README.md). Cada paso indica qué ADR lo respalda, qué archivos toca y cómo se verifica que está terminado.

## Estrategia de ejecución (¿agéntico o no?)

El alcance es pequeño (~6 archivos nuevos y 2 líneas de registro) y los pasos dependen unos de otros: modelos → servicio → controlador → rutas → tests. Repartir la **escritura** de código entre varios agentes en paralelo no ahorra tiempo y sí genera riesgo de inconsistencias en nombres, imports y contrato.

Por eso el plan es **híbrido**:

| Fase | Ejecutor | Modo |
|---|---|---|
| 0–5 Implementación y tests | Agente principal | Secuencial, con verificación al final de cada fase |
| 6 Revisión independiente | **Subagente revisor** (contexto limpio) | Paralelo a la fase 7, sólo lectura |
| 7 Documentación (AI_USAGE, PR) | Agente principal + **humano** | Borrador del agente; el humano completa sus decisiones y experiencia |

El subagente revisor aporta lo que un solo agente no puede: ojos frescos que comparan el código contra los ADRs y la rúbrica sin el sesgo de haberlo escrito.

**Puntos de control humano (⛳):** al final de las fases 0, 5 y 7. El agente se detiene y espera aprobación antes de continuar.

---

## Fase 0 — Preparación ⛳

Remotos (ya configurados): `origin` → fork `walfro90-gorilla/axios-challenge-node` (push) · `upstream` → `ventamovil/axios-challenge-node` (original, sólo lectura).

1. Crear la rama `feat/teams-module` desde `main`.
2. Commit de la documentación previa:
   - `docs: ADRs del módulo Teams`
   - `docs: plan de implementación del módulo Teams`
3. Línea base: `cd backend && npm test` debe pasar **antes** de tocar código (verificado: 9/9, con 5 de auth y 4 de Favoritos; `npm run lint` sin errores).

**Hecho cuando:** la rama existe, los tests base pasan y el árbol de trabajo está limpio.

---

## Fase 1 — Modelos · ADR-0001

**Archivos nuevos**
- `backend/src/models/team.model.js` → clase `Team`, `initTeamModel(sequelize)`
  - `id` INTEGER PK autoincrement
  - `name` STRING no nulo
  - `tableName: 'teams'`
- `backend/src/models/team-member.model.js` → clase `TeamMember`, `initTeamMemberModel(sequelize)`
  - `id`, `pokemonId` INTEGER no nulo, `pokemonName` STRING no nulo
  - `tableName: 'team_members'`
  - `indexes: [{ unique: true, fields: ['team_id', 'pokemon_id'] }]`

**Archivo modificado**
- `backend/src/models/index.js`: inicializar ambos modelos, agregar las asociaciones (`User` 1:N `Team` como `teams`; `Team` 1:N `TeamMember` como `members`, ambas con `onDelete: 'CASCADE'`) y exportar `Team` y `TeamMember`. Reemplazar el comentario "NOTA PARA EL CANDIDATO".
  - FKs **no nulas**: `foreignKey: { name: 'userId', allowNull: false }` y `foreignKey: { name: 'teamId', allowNull: false }`, con el mismo objeto en `hasMany` y en `belongsTo` para que no se pisen.

**Estilo:** imitar `favorite.model.js` (JSDoc corto, `Model.init`, sin lógica extra).

**Hecho cuando:** `npm test` sigue verde (los modelos se sincronizan en memoria sin errores), el servidor dev reinicia sin errores (log: `Base de datos SQLite conectada`) y el esquema real de `teams` y `team_members` muestra `NOT NULL` y `ON DELETE CASCADE` en las FKs.

**Commit:** `feat(teams): modelos Team y TeamMember con asociaciones`

---

## Fase 2 — Servicio · ADR-0002, 0003, 0005, 0006

**Archivo nuevo:** `backend/src/services/teams.service.js`

Constantes: `MAX_MEMBERS = 6`, `MIN_MEMBERS = 1`, `MAX_NAME_LENGTH = 50`.

| Función | Comportamiento |
|---|---|
| `listTeams(userId)` | `Team.findAll({ where: { userId }, include: [{ model: TeamMember, as: 'members' }], order: [['created_at','DESC'], [members, 'id','ASC']] })` |
| `createTeam(userId, body)` | Pipeline de validación en el orden del ADR-0003 (ver abajo) → transacción → recarga con `members` |
| `deleteTeam(userId, teamId)` | `Team.destroy({ where: { id: teamId, userId } })`; si devuelve 0 → `HttpError.notFound('Equipo no encontrado')` |

**Pipeline de `createTeam`** (cada paso es una función privada pequeña):

1. `parseTeamInput(body)` → `400` si:
   - `name` no es string, queda vacío tras `trim()` o excede 50 caracteres;
   - `pokemon` no es arreglo;
   - algún elemento no es string no vacío ni entero positivo.
2. Cardinalidad → `422` si `length < 1` o `length > 6`. **Sin I/O todavía.**
3. `const species = await Promise.all(pokemon.map((p) => assertSpeciesExists(p)))` → `422` / `502` los lanza el servicio existente.
4. Duplicados por `species.id` (`new Set`) → `HttpError.conflict` con el nombre del pokémon repetido. Se compara por id de forma, no de especie (limitación aceptada, ADR-0005).
5. `sequelize.transaction(...)`: `Team.create` + `TeamMember.bulkCreate`.
6. `Team.findByPk(id, { include: members })` y devolver.

**Restricciones:**
- Prohibido usar `fetch` o URLs de la PokeAPI aquí; sólo `assertSpeciesExists`.
- No se toca `pokeapi.service.js`.
- Todo error es `HttpError`; sin `try/catch`.

**Hecho cuando:** el archivo pasa `npm run lint` y lo validan los tests de la fase 4.

**Commit:** `feat(teams): servicio con reglas de negocio de equipos`

---

## Fase 3 — Controlador y rutas · ADR-0002, 0004

**Archivos nuevos**
- `backend/src/controllers/teams.controller.js`, cada handler envuelto en `asyncHandler`:
  - `listTeams` → `res.json({ data })` (misma forma que Favoritos)
  - `createTeam` → `res.status(201).json(team)`
  - `deleteTeam` → `res.status(204).send()`
  - Siempre pasa `req.user.id`, nunca un `userId` que venga del cliente.
- `backend/src/routes/teams.routes.js`: `router.use(authenticate)`, más `GET /`, `POST /`, `DELETE /:id`.

**Archivo modificado**
- `backend/src/routes/index.js`: importar `teamsRoutes`, `router.use('/teams', teamsRoutes)` y quitar el comentario "NOTA PARA EL CANDIDATO".

**Archivo modificado (ADR-0008)**
- `backend/src/middlewares/error.middleware.js`: antes del caso genérico `500`, si `err.type === 'entity.parse.failed'` → `400 { error: 'El cuerpo de la petición no es JSON válido' }`. Va en un commit aparte: `fix: responder 400 ante JSON malformado en lugar de 500`.

**Hecho cuando:** smoke test manual contra el servidor dev (que reinicia solo por `--watch`):

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@axiosmobile.mx","password":"demo1234"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -X POST localhost:4000/api/teams -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Kanto","pokemon":["pikachu","charizard"]}'          # 201
curl -s localhost:4000/api/teams -H "Authorization: Bearer $TOKEN"  # 200 con members
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE localhost:4000/api/teams/1 -H "Authorization: Bearer $TOKEN"  # 204
curl -s -w ' [%{http_code}]\n' -X POST localhost:4000/api/teams -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{bad json'                                              # 400 (antes 500)
```

**Commit:** `feat(teams): endpoints GET/POST/DELETE /api/teams`

---

## Fase 4 — Tests · ADR-0003, 0004, 0007

**Archivo nuevo:** `backend/src/tests/teams.test.js`, con el mismo estilo que `favorites.test.js`: `resetDatabase` y `mockPokeApi` en `beforeEach`, `closeDatabase` en `afterAll`. Datos de prueba: 7 pokémon de mentira.

| # | Caso | Esperado |
|---|---|---|
| 1 | Crea un equipo válido (mezcla nombre e id) | `201`, `members` con ids y nombres canónicos |
| 2 | 7 miembros | `422` y **no** se creó nada (`GET` → `[]`) |
| 3 | Especie inexistente | `422` |
| 4 | Especie duplicada (`"pikachu"` + `25`) | `409` |
| 5 | Cuerpo mal formado: sin `name`, `pokemon` no es arreglo, JSON con sintaxis inválida (ADR-0008) | `400` |
| 5b | Equipo vacío (`pokemon: []`) | `422` |
| 6 | Ownership: B lista → no ve el equipo de A; B borra el de A → `404`; A sigue viéndolo | `404` |
| 7 | A elimina su equipo | `204`, luego `GET` → `[]` |

La función `authToken(email)` recibe el email como parámetro para poder registrar dos usuarios.

**Hecho cuando:** `npm test` en verde (auth + favorites + teams) y `npm run lint` sin errores.

**Commit:** `test(teams): reglas de negocio y ownership del módulo Teams`

---

## Fase 5 — Verificación integral ⛳

1. `npm test` y `npm run lint` en verde.
2. Repetir el smoke test con curl, incluyendo un caso `422` y uno `404` con un segundo usuario.
3. Comprobar que `git diff --stat main -- ':(glob)backend/src/**/favorite*' frontend/` está **vacío** (Favoritos y frontend intactos), y que los únicos archivos modificados fuera de `team*` son `models/index.js`, `routes/index.js`, `middlewares/error.middleware.js`, `README.md` y `docs/`.
4. Comprobar el criterio de aceptación de `CHALLENGE.md`: el backend levanta, los tests pasan y los 3 endpoints aplican sus reglas.

**Hecho cuando:** todo lo anterior se cumple → se presenta el resultado al humano.

---

## Fase 6 — Revisión independiente (subagente)

Lanzar un subagente `general` **de sólo lectura** con este encargo:

> Revisa `backend/src/{models,services,controllers,routes,tests}/team*` contra `docs/adr/*.md`, `CHALLENGE.md` y `docs/EVALUATION.md`. Reporta: (a) desviaciones respecto a algún ADR, (b) reglas mal implementadas o sin cubrir, (c) inconsistencias de estilo con el módulo Favoritos, (d) bugs o casos borde (ids no numéricos, nombres con espacios, mayúsculas, PokeAPI caída). No modifiques archivos.

El agente principal clasifica cada hallazgo como **corregir**, **documentar** o **descartar (con motivo)**. Esos hallazgos alimentan también la sección 4 de `AI_USAGE.md`.

Si hay correcciones: `fix(teams): …`, una por hallazgo.

---

## Fase 7 — Documentación y entrega ⛳

1. Actualizar el estado de los ADRs de `Propuesto` a `Aceptado`, o crear un ADR nuevo si alguno cambió durante la implementación.
2. `README.md`: agregar las 3 filas de `/api/teams` a la tabla de endpoints.
3. **Borrador** de `docs/AI_USAGE.md` con el flujo real: ADRs → plan → implementación → revisión del subagente. ⚠️ **El humano debe revisarlo y completarlo**: la rúbrica premia la honestidad, y las secciones 5 y 6 (decisiones propias y alucinaciones detectadas) son suyas.
4. Borrador del cuerpo del PR a partir de `.github/PULL_REQUEST_TEMPLATE.md`: resumen, decisiones (enlazando los ADRs), cómo probar, checklist y "qué haría con más tiempo" (lista del ADR-0007).
5. Commit: `docs: AI_USAGE, endpoints de Teams y estado de ADRs`.
6. El humano hace push y abre el PR hacia `main` **del fork**. ⚠️ En un fork, `gh pr create` apunta por defecto al repo **original** (ventamovil). Hay que indicarlo explícitamente:

   ```bash
   git push -u origin feat/teams-module
   gh pr create --repo walfro90-gorilla/axios-challenge-node --base main --head feat/teams-module \
     --title "feat: módulo Teams" --body-file /tmp/opencode/pr-body.md
   ```

---

## Fase 8: mejora posterior a la entrega (frontend)

No estaba en el plan original (el ADR-0007 dejaba el frontend fuera). Se agregó a pedido, tras abrir el PR:

1. **Pantalla de Equipos con búsqueda debounced por nombre exacto** (ADR-0009). Verificada E2E contando peticiones: 4 frente a 32 sin debounce.
2. **Revisión manual en el navegador:** cada pausa a media palabra generaba un 404 en consola, y la premisa del ADR-0009 resultó falsa (el catálogo sí se puede paginar sin tocar el backend).
3. **Autocompletado local con índice de nombres** (ADR-0010) y mejoras de UI: pestaña activa, explicar "Crear equipo", Enter/↑/↓/Esc, espaciado y favicon. Verificado E2E en 21 pasos: 0 peticiones por tecla y 0 errores de consola.

Sin cambios en `Favorites.tsx`, `client.ts` ni `pokeapi.service.js`.

---

## Mapa de trazabilidad

| Requisito (`CHALLENGE.md`) | ADR | Fase | Test |
|---|---|---|---|
| `GET /api/teams` con miembros | 0001, 0002 | 1–3 | 1, 6, 7 |
| `POST /api/teams` | 0002, 0003, 0006 | 2–3 | 1 |
| `DELETE /api/teams/:id` | 0004 | 2–3 | 6, 7 |
| Máx. 6 → `422` | 0003 | 2 | 2 |
| Especie inexistente → `422` reutilizando el servicio | 0005 | 2 | 3 |
| Ownership → `404` | 0004 | 2–3 | 6 |
| Bonus: duplicados → `409` | 0001, 0003 | 2 | 4 |
| No modificar Favoritos | 0002, 0007 | 5 | — |
| Validación de entradas robusta (rúbrica) | 0003, 0008 | 2–3 | 5, 5b |
| `AI_USAGE.md` completo | — | 7 | — |
| Conventional Commits en rama `feat/teams-module` | — | todas | — |
| Bonus: pantalla de Equipos | 0009, 0010 | 8 | E2E manual (21 pasos) |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El servidor dev (`--watch`) se cae a media edición por imports incompletos | Es esperado; reinicia solo al guardar el archivo completo. Validar al cierre de cada fase |
| `sync()` no altera tablas ya existentes en `data/dev.sqlite` | Las tablas de Teams son nuevas, así que `sync()` las crea. Si se cambia el esquema después: `npm run seed` |
| La cascada no se ejecuta en SQLite | Sequelize activa `PRAGMA foreign_keys=ON` por defecto. El test de eliminación verifica `TeamMember.count() === 0` tras el `DELETE` (agregado tras la revisión de la fase 6) |
| `POST` concurrentes → `500 SQLITE_BUSY` (detectado en la fase 6) | Limitación aceptada y documentada en el ADR-0006; los tests no crean equipos en paralelo |
| `PR` abierto por error contra el repo original (ventamovil) | Usar siempre `--repo walfro90-gorilla/axios-challenge-node` (fase 7) |
| Definir la FK en `hasMany` y `belongsTo` con opciones distintas hace que una pise a la otra (`allowNull`) | Mismo objeto `foreignKey` en ambas; verificar el esquema real al cerrar la fase 1 |
| Ordenar `members` dentro de un `include` en Sequelize es propenso a errores de sintaxis | Usar `order: [[{ model: TeamMember, as: 'members' }, 'id', 'ASC']]` y cubrirlo en el test 1 |
