# ADR-0015: Rediseño de Favoritos y Equipos (corazón y pokéball)

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Amplía:** ADR-0012 (Pokédex y borrador compartido) y ADR-0013 (estilos)

## Contexto

Se pidió mejorar considerablemente la UI/UX de Favoritos y Equipos, con un **corazón** para favorito y una **pokéball** para equipo. `Favorites.tsx` es la pantalla de referencia del challenge y no debe modificarse.

## Decisión

### Íconos y acciones
- Íconos **SVG propios** (`components/icons.tsx`): corazón (vacío/lleno) y pokéball (gris/roja). Sin librerías de íconos.
- Botones de ícono **conmutables**, con `aria-pressed`, `aria-label` y `title`:
  - ♥ agrega o **quita** de favoritos (`POST` / `DELETE /api/favorites`), con actualización optimista y reversión si falla.
  - Pokéball agrega o **quita** del equipo en armado.
- Componentes compartidos: `PokemonCard` y `TypeBadges`, usados por la Pokédex y por Favoritos.

### Favoritos: página nueva `MyFavorites.tsx`
- La pestaña **Favoritos** muestra la página nueva; `Favorites.tsx` queda **intacto en el repo** como código de referencia, aunque ya no se use.
- Cuadrícula de tarjetas con foto y tipos (detalle pedido por favorito y cacheado), **apodo editable en línea** (`PATCH /api/favorites/:id`; Enter guarda, Esc cancela), corazón para quitar con **"Deshacer"** durante unos segundos (vuelve a crearlo con su apodo) y pokéball para agregar al equipo.
- Estado vacío con llamada a la acción "Explorar la Pokédex".

### Equipos
- El equipo en armado se muestra como **6 casillas**: las ocupadas con foto, nombre, tipos y ×; las vacías con una pokéball tenue.
- Cada equipo guardado es una tarjeta con las fotos de sus miembros (ADR-0014), la **cobertura de tipos** (tipos únicos del equipo) y eliminación con **confirmación en dos pasos**.
- **Bandeja del equipo** fija abajo en Pokédex y Favoritos cuando hay pokémon en el borrador: casillas en miniatura y botón "Armar equipo →". Reemplaza la tarjeta "Equipo en armado".

### Datos de detalle en el cliente
- `api/pokemonDetails.ts`: caché de promesas `{ id, name, sprite, types }` por nombre (una petición por pokémon como máximo). La Pokédex la "siembra" con cada página, así que los detalles ya vistos no se vuelven a pedir.

## Alternativas consideradas

1. **Modificar `Favorites.tsx`.** Rompe la regla del challenge. **Rechazada** (decisión del usuario).
2. **Librería de íconos** (react-icons, lucide). Dependencia para dos íconos. **Rechazada.**
3. **Confirmación con `window.confirm`.** Bloqueante y fuera del estilo visual. **Rechazada.**
4. **Sistema global de notificaciones (toasts).** Sólo se necesita en "deshacer favorito". **Rechazada:** se resuelve localmente en la página.

## Consecuencias

- **+** Acciones reconocibles (♥ / pokéball) y reversibles (toggle, deshacer, confirmación).
- **+** Favoritos muestra foto, tipos y apodo sin tocar el código de referencia.
- **−** `Favorites.tsx` queda sin uso en la navegación. Se conserva a propósito y se declara en el PR.
- **−** Favoritos pide el detalle de cada favorito no cacheado (una vez por pokémon). Aceptable para listas personales.
