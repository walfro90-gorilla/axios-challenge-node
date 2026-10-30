# ADR-0002: Reglas de negocio en `teams.service.js`, controlador delgado

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

`docs/ARCHITECTURE.md` define el flujo `routes → middlewares → controllers → services → models` y establece que los controladores son **delgados** ("traducen HTTP ↔ servicios") y que los servicios contienen la **lógica de negocio**.

Sin embargo, el módulo de referencia `favorites.controller.js` tiene su lógica dentro del controlador (valida, consulta la PokeAPI y escribe en BD). Hay, por tanto, una tensión entre lo que dice la arquitectura documentada y lo que hace el código de referencia.

Teams tiene más reglas que Favoritos (cardinalidad, especies, duplicados, ownership, transacción), lo que haría crecer bastante un controlador "gordo".

## Decisión

Seguir la **arquitectura documentada**:

- `services/teams.service.js`: contiene las reglas de negocio y el acceso a modelos. Funciones puras respecto a HTTP, reciben `userId` explícito: `listTeams(userId)`, `createTeam(userId, { name, pokemon })`, `deleteTeam(userId, teamId)`. Lanzan `HttpError`.
- `controllers/teams.controller.js`: extrae datos de `req`, llama al servicio y responde con el status. Envuelto en `asyncHandler`, sin `try/catch`.
- `routes/teams.routes.js`: aplica `authenticate` a todo el router y se monta en `routes/index.js` como `/teams`.

No se toca `favorites.controller.js` para "alinearlo" (restricción del reto).

## Alternativas consideradas

1. **Copiar el patrón exacto de Favoritos (lógica en el controlador).** Máxima similitud visual con la referencia, pero contradice `ARCHITECTURE.md` y mezcla HTTP con reglas, dificultando probarlas de forma aislada. **Rechazada.**
2. **Además, un repositorio/DAO separado del servicio.** Sobre-ingeniería para tres endpoints sobre Sequelize, que ya actúa como capa de acceso a datos. **Rechazada.**
3. **Middleware de validación en la ruta.** `ARCHITECTURE.md` dibuja `routes → middlewares (auth, validación)`, pero el boilerplate **no tiene** ningún middleware de validación ni librería para ello (Joi, Zod, express-validator): Favoritos y auth validan dentro del flujo de negocio. Crear un middleware `validateCreateTeam` partiría las reglas de `POST /api/teams` en dos lugares (forma en el middleware, cardinalidad/especies/duplicados en el servicio), y agregar una librería sería sobre-ingeniería para un solo endpoint con cuerpo. **Rechazada:** toda la validación vive en el servicio, en el orden del ADR-0003. Si el proyecto creciera, el primer paso sería un middleware genérico con un esquema (p. ej. Zod).

## Consecuencias

- **+** Consistente con la arquitectura declarada; las reglas quedan en un solo lugar y son legibles.
- **+** El servicio podría reutilizarse (p. ej. desde un futuro `PATCH`) sin duplicar validaciones.
- **−** Teams se verá estructuralmente distinto de Favoritos. Se documenta aquí y en el PR para que no parezca inconsistencia accidental.
