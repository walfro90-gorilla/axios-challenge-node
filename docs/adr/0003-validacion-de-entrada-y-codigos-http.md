# ADR-0003: Validación de entrada, orden de validaciones y códigos HTTP

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

El reto exige `422` cuando un equipo excede 6 miembros o incluye un pokémon inexistente, y `404` al tocar un equipo ajeno. Deja sin especificar otros casos: cuerpo mal formado, nombre vacío, equipo sin miembros, especies repetidas (bonus: `409`). El boilerplate ya distingue `400` (campo obligatorio faltante en Favoritos), `409` (duplicado) y `422` (especie inexistente, desde `pokeapi.service.js`).

## Decisión

### Contrato de `POST /api/teams`

```json
{ "name": "Equipo Kanto", "pokemon": ["pikachu", 6, "bulbasaur"] }
```

Cada elemento de `pokemon` acepta nombre o id (igual que Favoritos, que delega en `getPokemon(nameOrId)`).

### Criterio de códigos

- **`400 Bad Request`** → la petición está **mal formada** (forma/tipos): no se puede ni interpretar.
- **`422 Unprocessable Entity`** → la petición está bien formada pero **viola una regla de negocio**.
- **`409 Conflict`** → conflicto de unicidad (mismo criterio que Favoritos).

| Caso | Código |
|---|---|
| Cuerpo con sintaxis JSON inválida | `400` (ADR-0008; hoy el boilerplate responde `500`) |
| `name` ausente, no string o vacío tras `trim()` | `400` |
| `name` con más de 50 caracteres | `400` |
| `pokemon` ausente o no es arreglo | `400` |
| Algún elemento no es string no vacío ni entero positivo | `400` |
| `pokemon` vacío (0 miembros) | `422` |
| Más de 6 miembros | `422` |
| Especie inexistente en la PokeAPI | `422` (lo lanza `assertSpeciesExists`) |
| Misma especie repetida en el equipo | `409` |
| PokeAPI caída / responde error | `502` (ya lo maneja el servicio) |
| `DELETE` con `:id` inexistente, no numérico o ajeno | `404` (ADR-0004) |
| Éxito | `GET 200 { data: [...] }` · `POST 201 { ...team, members }` · `DELETE 204` |

### Orden de validación (de lo más barato a lo más caro)

1. Forma del cuerpo → `400` (sin I/O).
2. Cardinalidad 1..6 → `422` (sin I/O). **Antes** de consultar la PokeAPI: no tiene sentido hacer 7+ peticiones externas para un equipo que se va a rechazar.
3. Resolver especies contra la PokeAPI → `422` si alguna no existe (ADR-0005).
4. Duplicados por **`pokemonId` canónico** → `409`. Debe ir después de resolver, porque `"pikachu"`, `"Pikachu"` y `25` son el mismo pokémon y sólo la PokeAPI lo confirma. *Limitación aceptada:* el id es de **forma**, no de especie, así que `charizard` y `charizard-mega-x` no cuentan como duplicado (ver ADR-0005).
5. Persistir en transacción (ADR-0006).

## Alternativas consideradas

1. **`400` para todo error de validación.** Más simple, pero contradice el `422` exigido para reglas de negocio y pierde la distinción semántica. **Rechazada.**
2. **Permitir equipos vacíos.** Un "equipo" sin miembros no aporta y el reto habla de crear un equipo "con arreglo de pokémon". Se exige al menos 1. Es una decisión discutible y fácil de revertir. **Rechazada (documentada).**
3. **Detectar duplicados comparando el texto de entrada.** Falla con mezclas de nombre/id o mayúsculas. **Rechazada.**
4. **Nombre de equipo único por usuario (`409`).** No lo pide el reto y no hay una razón de negocio clara. **Pospuesto.**
5. **Validar la forma en un middleware de ruta.** Ver ADR-0002, alternativa 3. **Rechazada.**

## Consecuencias

- **+** Respuestas predecibles y alineadas con el criterio ya usado en el boilerplate.
- **+** Se evitan llamadas innecesarias a la PokeAPI (rate-limit) en peticiones inválidas.
- **−** Sólo se reporta el **primer** error encontrado, no todos a la vez. Aceptable para el alcance.
