# ADR-0006: Creación atómica de equipo + miembros en una transacción

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

Crear un equipo implica escribir una fila en `teams` y de 1 a 6 en `team_members`. Si alguna escritura falla a mitad del proceso (p. ej. el índice único `(team_id, pokemon_id)`), no debe quedar un equipo a medias.

Además, SQLite bloquea la base completa durante una transacción de escritura, así que conviene que las transacciones sean cortas.

## Decisión

- Todas las validaciones, **incluidas las llamadas a la PokeAPI**, ocurren **antes** de abrir la transacción.
- La escritura usa una transacción administrada de Sequelize:

  ```js
  await sequelize.transaction(async (transaction) => {
    const team = await Team.create({ name, userId }, { transaction });
    await TeamMember.bulkCreate(
      species.map((s) => ({ teamId: team.id, pokemonId: s.id, pokemonName: s.name })),
      { transaction },
    );
    return team;
  });
  ```

- Tras el commit se recarga el equipo con `include: members` para responder con la misma forma que `GET`.
- `DELETE` no necesita transacción explícita: es un único `DELETE` y la cascada la ejecuta la BD de forma atómica.

## Alternativas consideradas

1. **Sin transacción.** Riesgo de equipos huérfanos o incompletos ante un error. **Rechazada.**
2. **Llamadas a la PokeAPI dentro de la transacción.** Mantendría la BD bloqueada durante peticiones de red. **Rechazada.**
3. **`Team.create(..., { include: [members] })` (creación anidada).** Válida, pero `bulkCreate` explícito deja más claro qué se escribe. Cualquiera de las dos es aceptable; se elegirá la más legible al implementar.

## Consecuencias

- **+** Todo o nada: nunca hay equipos parciales.
- **+** La transacción dura sólo lo que tardan las escrituras locales.
- **−** Una lectura extra tras crear el equipo para devolverlo con sus miembros. Costo despreciable.
