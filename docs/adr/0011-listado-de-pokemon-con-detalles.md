# ADR-0011: Listado paginado de pokémon con detalles (`?details=true`)

- **Estado:** Aceptado
- **Fecha:** 2026-10-30

## Contexto

Se pidió paginación y que la app "se vea bien": una Pokédex con **foto y tipos** de cada pokémon.

- `GET /api/pokemon?limit&offset` ya pagina, pero devuelve sólo `{ name, url }` (el formato del listado de la PokeAPI).
- `pokeapi.service.js` ya expone `getPokemon(nameOrId)` → `{ id, name, sprite, types }`, con caché de 5 minutos.
- Mostrar 20 tarjetas con foto y tipos exige el detalle de cada una. Si lo pidiera el frontend, serían **21 peticiones por página** desde el navegador.

## Decisión

Agregar un parámetro opcional al endpoint existente:

```
GET /api/pokemon?limit=20&offset=40&details=true
→ { count, results: [{ id, name, sprite, types }, …] }
```

- Lo implementa `pokemon.controller.js`, **reutilizando** `listPokemon` y `getPokemon` del servicio. `pokeapi.service.js` no se modifica.
- Los detalles se resuelven **en el servidor, en paralelo** (`Promise.all`, máx. 100 por el límite del listado) y aprovechan la caché del servicio.
- Sin `details=true` la respuesta es idéntica a la actual (retrocompatible: Favoritos y el índice del ADR-0010 no cambian).
- Si un pokémon del listado no tiene detalle (404 en la PokeAPI), se omite. Si la PokeAPI falla, `502`, como el resto del servicio.
- Se devuelven `count` y `results`. `next`/`previous` apuntan a la PokeAPI (no a nuestra API), así que el cliente pagina con `count` y `offset`.

## Alternativas consideradas

1. **Que el frontend pida el detalle de cada tarjeta.** 21 peticiones por página desde el navegador y lógica de agregación en la UI. **Rechazada.**
2. **Endpoint nuevo** (`GET /api/pokedex`). Duplica la ruta de listado para una variación. **Rechazada:** un parámetro opcional es más simple y retrocompatible.
3. **Construir la URL del sprite a partir del id** (patrón del repositorio de sprites). Evita las peticiones de detalle, pero no da los tipos y acopla la app a una URL interna de la PokeAPI. **Rechazada.**
4. **`Promise.allSettled` para devolver la página aunque falle un detalle.** Más tolerante, pero obliga a la UI a manejar tarjetas a medias. **Pospuesta.**

## Consecuencias

- **+** Una sola petición por página desde el navegador.
- **+** Respeta el límite de la PokeAPI: la primera visita a una página genera 1 + 20 peticiones externas, y las siguientes salen de la caché durante 5 minutos.
- **−** La primera carga de una página nunca visitada tarda lo que la consulta de detalle más lenta.
- **−** Las formas (`ids > 10000`) pueden no tener sprite (`null`); la UI muestra un marcador en su lugar.
