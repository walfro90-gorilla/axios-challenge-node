# ADR-0014: Guardar foto y tipos en los miembros de equipo

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Amplía:** ADR-0001 (modelo `TeamMember`)

## Contexto

El rediseño de Equipos (ADR-0015) muestra cada miembro con **foto y tipos**. `TeamMember` sólo guarda `pokemonId` y `pokemonName`. Al crear un equipo, `assertSpeciesExists` ya devuelve `{ id, name, sprite, types }` y hoy `sprite` y `types` se descartan.

## Decisión

- `TeamMember` agrega:
  - `sprite`: `STRING`, **nullable** (las formas pueden no tener imagen).
  - `types`: `JSON` (arreglo de strings), no nulo, por defecto `[]`.
- `createTeam` persiste ambos campos a partir del resultado de `assertSpeciesExists`, sin llamadas extra.
- `GET /api/teams` los devuelve en cada miembro. El contrato existente no cambia; sólo se agregan campos.
- **Filas anteriores** (sin `sprite`): el frontend pide el detalle una vez y lo cachea (fallback).
- **Base de desarrollo existente:** `sync()` no altera tablas, así que en la base local se agregaron las columnas a mano (`ALTER TABLE … ADD COLUMN`) para **no perder datos del usuario**. `npm run seed` recrea todo desde cero. En producción esto sería una migración.

## Alternativas consideradas

1. **Pedir el detalle de cada miembro al listar.** Hasta 6 peticiones por equipo y por carga. **Rechazada.**
2. **Recrear las tablas en desarrollo.** Más simple, pero borraba un equipo que el usuario había creado a mano. **Rechazada.**
3. **Guardar sólo `sprite` y derivar los tipos.** Los tipos también requieren el detalle. **Rechazada.**

## Consecuencias

- **+** Listar equipos con imágenes no cuesta peticiones adicionales.
- **−** Es una foto del momento: si la PokeAPI cambiara un sprite, el guardado no se actualiza. Aceptable para datos prácticamente estáticos.
- **−** Sin migraciones, quien ya tenga una base local debe agregar las columnas o re-sembrar (`npm run seed`). Se documenta en el README.
