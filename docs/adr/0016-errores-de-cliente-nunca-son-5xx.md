# ADR-0016: Los errores de entrada del cliente nunca son 5xx

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Amplía:** ADR-0003 (validación) y ADR-0008 (errores de body-parser)

## Contexto

La QA a fondo (hallazgos H-29 y H-30 en `FINDINGS.md`) encontró dos entradas inválidas que se respondían como errores **del servidor**:

1. **Nombres que no son slugs** (`"../users"`, `"<script>"`, `"pika chu"`, `"mr.mime"`): la PokeAPI responde **403**, y `pokeapi.service.js` convierte toda respuesta distinta de 404 en **502 "PokeAPI respondió 403"**. Un error del usuario parecía una caída de la PokeAPI. Afectaba a `POST /api/teams` y a `GET /api/pokemon/:name`.
2. **Cuerpo mayor a 100 KB:** body-parser lanza `entity.too.large` (status 413), que el manejador de errores trataba como genérico → **500**.

El ADR-0003 delegaba la interpretación de strings al servicio (asimetría aceptada, H-13). Eso sigue siendo válido para *qué* pokémon existe, pero no para strings que **no pueden** ser un nombre.

## Decisión

- **Formato de nombre:** antes de consultar la PokeAPI se exige `/^[a-z0-9-]+$/i` (tras `trim()`):
  - en `teams.service.js` → **400** ("Cada pokémon debe ser un nombre o un id entero positivo");
  - en `pokemon.controller.js` (`GET /api/pokemon/:name`) → **404**, igual que un pokémon inexistente.

  `pokeapi.service.js` **no se modifica**.
- **Cuerpo demasiado grande:** caso `entity.too.large` en `error.middleware.js` → **413** "El cuerpo de la petición es demasiado grande". El límite de 100 KB por defecto se mantiene: un equipo válido ocupa menos de 1 KB.
- Regla general: **una entrada inválida del cliente responde 4xx**; 5xx queda para fallas reales (red, PokeAPI caída, bugs).

## Alternativas consideradas

1. **Que `pokeapi.service.js` mapee 403 → 404.** Arreglaría también Favoritos, pero el reto prohíbe modificar el servicio. **Rechazada.**
2. **Manejar en general cualquier `err.status` 4xx de body-parser.** Más amplio, pero expondría mensajes internos de terceros. **Rechazada:** se manejan explícitamente los dos casos conocidos.
3. **Subir el límite del body.** No resuelve el 500 y no hay necesidad de negocio. **Rechazada.**

## Consecuencias

- **+** Ningún input conocido produce 5xx; el 502 vuelve a significar "la PokeAPI falló".
- **+** Se ahorra una llamada externa por cada nombre imposible.
- **−** **Favoritos sigue respondiendo 502** ante `POST /api/favorites { "pokemon": "../x" }`: el módulo no se puede tocar. Se documenta como limitación (H-29).
- **−** Si la PokeAPI agregara nombres con otros caracteres, habría que ampliar el patrón. Hoy los 1351 nombres cumplen `[a-z0-9-]`.
