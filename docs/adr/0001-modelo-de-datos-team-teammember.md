# ADR-0001: Modelo de datos `Team` + `TeamMember` en tablas separadas

- **Estado:** Aceptado
- **Fecha:** 2026-10-30

## Contexto

Un usuario administra equipos Pokémon. Un equipo tiene un **nombre** y una lista de **miembros** (máx. 6). El reto sugiere `Team(id, name, userId)` y `TeamMember(id, teamId, pokemonId, pokemonName)`, y permite ajustarlo si se justifica.

El boilerplate usa Sequelize sobre SQLite con `underscored: true` (columnas en snake_case) y `sequelize.sync()` sin migraciones. El módulo de referencia `Favorite` guarda `pokemonId` + `pokemonName` y protege la unicidad con un índice compuesto.

## Decisión

Adoptar el modelo sugerido, en dos tablas:

| Modelo | Tabla | Campos | Restricciones |
|---|---|---|---|
| `Team` | `teams` | `id`, `name`, `userId`, timestamps | `name` no nulo; `user_id` **no nulo**, FK a `users` con `ON DELETE CASCADE` |
| `TeamMember` | `team_members` | `id`, `teamId`, `pokemonId`, `pokemonName`, timestamps | `team_id` **no nulo**, FK a `teams` con `ON DELETE CASCADE`; índice **único** `(team_id, pokemon_id)` |

**FKs no nulas.** En Favoritos, `userId` lo agrega implícitamente la asociación y queda **nullable** (verificado en el esquema real: `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`, sin `NOT NULL`). En Teams se declara `allowNull: false` en las asociaciones (`foreignKey: { name: 'userId', allowNull: false }`), para que la BD rechace un equipo o un miembro huérfano. Es una mejora sobre la referencia sin tocarla.

Asociaciones en `models/index.js`, siguiendo el patrón de `Favorite`:

- `User.hasMany(Team, { foreignKey: 'userId', as: 'teams', onDelete: 'CASCADE' })` / `Team.belongsTo(User)`
- `Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members', onDelete: 'CASCADE' })` / `TeamMember.belongsTo(Team)`

Se persisten `pokemonId` y `pokemonName` **canónicos** (los que devuelve la PokeAPI, no el texto que envió el cliente).

## Alternativas consideradas

1. **Columna JSON en `teams`** (`members: [{ id, name }]`). Más simple, pero no permite índices ni restricciones a nivel BD (unicidad de especie), dificulta consultas futuras ("¿en cuántos equipos está pikachu?") y se aleja del estilo relacional del boilerplate. **Rechazada.**
2. **Reutilizar `Favorite` como miembro.** Acopla dos módulos con reglas distintas y viola la restricción explícita de no modificar Favoritos. **Rechazada.**
3. **Agregar `position` (orden en el equipo) o `nickname` al miembro.** Útil en un producto real, pero no lo pide el reto. Se ordena por `id` de inserción, que preserva el orden en que se enviaron. **Pospuesto** (ver ADR-0007).

## Consecuencias

- **+** La unicidad de especie dentro de un equipo queda protegida también en BD (defensa en profundidad); si se viola, el `errorHandler` existente ya traduce `SequelizeUniqueConstraintError` a `409`.
- **+** Al eliminar un equipo, sus miembros se borran por cascada. Sequelize activa `PRAGMA foreign_keys = ON` por defecto en SQLite, así que la cascada es efectiva (verificado: la tabla `favorites` real se creó con `ON DELETE CASCADE`).
- **−** `pokemonId` es el id del endpoint `/pokemon/` de la PokeAPI, que identifica **formas** y no especies (ver ADR-0005). La unicidad protege contra la misma forma repetida, no contra dos formas de la misma especie.
- **−** El límite de 6 miembros **no** se puede expresar como restricción de BD; vive en la capa de aplicación (ADR-0002). Es aceptable porque el equipo se crea completo en una sola operación atómica (ADR-0006) y no existe endpoint para agregar miembros sueltos.
- **−** Al no haber migraciones, las tablas nuevas se crean con `sync()` (crea las faltantes sin tocar las existentes). En producción se usarían migraciones.
