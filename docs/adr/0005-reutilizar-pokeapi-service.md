# ADR-0005: Validación de especies reutilizando `pokeapi.service.js`

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

Cada miembro debe existir en la PokeAPI. El reto exige **reutilizar** `assertSpeciesExists` y penaliza reimplementar el consumo de la API. Ese servicio ya:

- Normaliza la entrada (`toLowerCase().trim()`), acepta nombre o id.
- Cachea respuestas en memoria con TTL de 5 minutos.
- Lanza `422` si la especie no existe y `502` si la PokeAPI falla.
- Devuelve `{ id, name, sprite, types }` canónicos.

Un equipo puede requerir hasta 6 consultas. La PokeAPI es pública y pide uso razonable.

## Decisión

- `teams.service.js` importa `assertSpeciesExists` y **no** usa `fetch` ni conoce URLs de la PokeAPI.
- Las especies se resuelven **en paralelo** con `Promise.all(pokemon.map((p) => assertSpeciesExists(p)))`. El tope de 6 (validado antes, ADR-0003) acota la concurrencia a 6 peticiones como máximo. La caché evita repetir consultas **entre peticiones** (un segundo equipo con pikachu no vuelve a salir a red). Ojo: **no** deduplica dentro de una misma petición en paralelo, porque la caché sólo se llena cuando llega la respuesta; `["pikachu", "pikachu"]` hace 2 llamadas antes de rechazarse con `409`. Con un tope de 6 es aceptable.
- Se usa una arrow function explícita en el `map` para no pasarle `(index, array)` al servicio por accidente.
- Se persisten `species.id` y `species.name` devueltos por el servicio.
- **No** se modifica `pokeapi.service.js`.

## Alternativas consideradas

1. **Resolución secuencial (`for … await`).** Corta en el primer error y nunca hace llamadas de más, pero suma latencias (hasta 6 viajes en serie). Con un tope de 6 y caché, el paralelo es más rápido y la carga sigue siendo razonable. **Rechazada.**
2. **`Promise.allSettled` para reportar todas las especies inválidas a la vez.** Mejor experiencia de usuario, pero complica el contrato de error. **Pospuesto** (mejora candidata).
3. **Deduplicar la entrada antes de consultar la API** para ahorrar llamadas. Ahorraría como mucho 5 llamadas en un caso que de todas formas termina en `409`, y la detección real de duplicados exige ids canónicos (ADR-0003). **Rechazada.**
4. **Consultar `/pokemon-species/` para validar especies "de verdad".** Exigiría modificar `pokeapi.service.js` o reimplementar el consumo, lo que el reto penaliza explícitamente. **Rechazada.**

## Consecuencias

- **+** Cero lógica de integración duplicada; cualquier mejora del servicio (caché, reintentos) beneficia a Teams.
- **+** En los tests, `mockPokeApi` de `tests/helpers.js` funciona sin cambios, porque mockea `fetch`, que es lo que usa el servicio.
- **−** Con `Promise.all`, si una especie falla las demás peticiones en curso terminan igualmente (sus resultados se descartan, aunque quedan en caché). Costo despreciable.
- **−** La caché es por proceso y en memoria; en un despliegue con varias instancias sería Redis o similar (ya anotado en el servicio).
- **−** **Limitación heredada (verificada contra la PokeAPI real):** el servicio consulta `/pokemon/{nameOrId}`, que identifica **formas**, no especies. Consecuencias:
  - `deoxys` → `404` (hay que usar `deoxys-normal`), igual con otras especies que tienen varias formas.
  - `025` → `404` (los ids con ceros a la izquierda no se normalizan); `25` → `200`.
  - `charizard-mega-x` es válido y tiene un id distinto de `charizard`, así que la regla de duplicados no los considera iguales.

  Se acepta porque Favoritos tiene exactamente el mismo comportamiento (consistencia) y porque corregirlo exige tocar el servicio. Queda en "qué haría con más tiempo".
- **−** Si la PokeAPI aplica rate-limit (`429`) o falla, el servicio responde `502`; no hay reintentos.
