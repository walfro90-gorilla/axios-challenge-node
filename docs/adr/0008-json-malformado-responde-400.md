# ADR-0008: JSON con sintaxis inválida responde `400`, no `500`

- **Estado:** Aceptado
- **Fecha:** 2026-10-30

## Contexto

Durante la revisión de consistencia se verificó que el boilerplate responde **`500 Error interno del servidor`** cuando el cuerpo de la petición es JSON inválido:

```bash
curl -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{bad json'
# {"error":"Error interno del servidor"} [500]
```

Causa: `express.json()` (body-parser) lanza un `SyntaxError` con `type: 'entity.parse.failed'` y `status: 400`, pero `error.middleware.js` sólo reconoce `HttpError` y errores de Sequelize, así que cae en el caso genérico `500`.

Esto contradice el ADR-0003 (cuerpo mal formado → `400`) y afecta a **todos** los endpoints, incluido `POST /api/teams`. Un `500` además ensucia los logs con errores que no son del servidor. La rúbrica premia la "validación de entradas robusta".

`error.middleware.js` es infraestructura compartida, **no** forma parte del módulo de Favoritos, así que modificarlo no viola la restricción del reto.

## Decisión

Agregar en `errorHandler`, antes del caso genérico, un caso para los errores de parseo de body-parser:

```js
// JSON con sintaxis inválida (body-parser) → 400
if (err.type === 'entity.parse.failed') {
  return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
}
```

- Se discrimina por `err.type`, la propiedad documentada de body-parser, en lugar de `instanceof SyntaxError`, que también atraparía errores de sintaxis de otro origen.
- No se expone el mensaje interno del parser (posición o fragmento del cuerpo).
- Se cubre con un test en `teams.test.js` (caso de cuerpo mal formado).

## Alternativas consideradas

1. **Dejarlo como está y anotarlo en "qué haría con más tiempo".** No toca código compartido, pero `POST /api/teams` incumpliría su propio contrato (ADR-0003). **Rechazada.**
2. **Tratar en general cualquier error con `err.status` 4xx** (`res.status(err.status)`). Más amplio (cubriría también `entity.too.large` → 413), pero también más difícil de razonar y podría filtrar mensajes internos de terceros. **Rechazada** por alcance; anotada como mejora.

## Consecuencias

- **+** Todos los endpoints (auth, favorites, teams) responden `400` ante JSON inválido. Es un cambio de comportamiento sólo para un caso que hoy es un bug.
- **+** Cambio de 3 líneas, aislado y con test.
- **−** Se toca un archivo fuera del módulo Teams. Se declara explícitamente en el PR para que no parezca un cambio colateral.
