# ADR-0012: Pestaña Pokédex paginada con borrador de equipo compartido

- **Estado:** Aceptado
- **Fecha:** 2026-10-30

## Contexto

Hoy el único catálogo visible vive dentro de `Favorites.tsx`: 20 pokémon fijos y sin paginación. El challenge prohíbe modificar el módulo de Favoritos, y estas mejoras van en el mismo PR que se evalúa.

## Decisión

### Pestaña nueva "Pokédex" (`frontend/src/pages/Pokedex.tsx`)
- **Cuadrícula de tarjetas:** foto, `#número`, nombre y tipos con color. Consume `GET /api/pokemon?details=true` (ADR-0011).
- **Paginación** de 20 por página con `count` y `offset`: `«` primera, `‹` anterior, "Página X de N", `›` siguiente, `»` última. Mientras carga, los controles se deshabilitan y se muestra un estado de carga, para evitar dobles clics y saltos.
- **Caché por página** en memoria (`Map<offset, página>`): volver a una página ya vista no sale a red.
- **Acciones por tarjeta:**
  - **+ favorito** → `POST /api/favorites` (API existente). Las que ya son favoritas se marcan con ✓ (se lee `GET /api/favorites` al entrar).
  - **+ equipo** → agrega el pokémon al **borrador de equipo**. Deshabilitado si ya está o si el borrador tiene 6.

### Borrador de equipo compartido (`TeamDraftContext`)
- El borrador (`PokemonRef[]`, máx. 6) pasa del estado local de `Teams.tsx` a un **contexto de React** montado en `App.tsx`. Así lo que se agrega desde la Pokédex aparece en Equipos, y cambiar de pestaña no lo borra.
- Vive sólo en memoria: se pierde al recargar la página. Es aceptable para un borrador.

### Navegación
- Pestañas: **Pokédex | Favoritos | Equipos**. Favoritos sigue siendo la pestaña inicial (comportamiento actual).

## Alternativas consideradas

1. **Paginar el catálogo dentro de `Favorites.tsx`.** Rompe la regla del challenge. **Rechazada.**
2. **Scroll infinito.** Peor para "ir a la página 30" y más complejo de probar. **Rechazada.**
3. **Paginación en la URL** (`?page=3`). Requiere un router, que el proyecto evita a propósito. **Rechazada.**
4. **Borrador en `localStorage`.** Sobreviviría a una recarga, pero agrega sincronización y limpieza para un estado efímero. **Pospuesta.**
5. **Librería de estado (Redux, Zustand).** Excesivo para una lista de 6 elementos. **Rechazada.**

## Consecuencias

- **+** Paginación y foto/tipos visibles sin tocar Favoritos.
- **+** Flujo natural: explorar en la Pokédex → agregar → crear el equipo en Equipos.
- **−** Dos lugares muestran un catálogo (Pokédex y el bloque original de Favoritos). Se acepta mientras rija la restricción del challenge.
- **−** `Teams.tsx` cambia de estado local a contexto. El cambio es interno a nuestro módulo.
