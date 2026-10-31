# Architecture Decision Records (ADR)

Registro de las decisiones de arquitectura tomadas para el módulo **Teams** (ver [`CHALLENGE.md`](../../CHALLENGE.md)).

Cada ADR sigue el formato de Michael Nygard: **Contexto → Decisión → Consecuencias**, más las alternativas consideradas. Un ADR no se edita una vez aceptado: si la decisión cambia, se crea uno nuevo que lo reemplaza (`Reemplazado por ADR-XXXX`).

**Estados:** `Propuesto` · `Aceptado` · `Rechazado` · `Reemplazado`

## Índice

| # | Decisión | Estado |
|---|---|---|
| [0001](./0001-modelo-de-datos-team-teammember.md) | Modelo de datos: `Team` + `TeamMember` en tablas separadas | Aceptado |
| [0002](./0002-capa-de-servicio-para-reglas-de-negocio.md) | Reglas de negocio en `teams.service.js`, controlador delgado | Aceptado |
| [0003](./0003-validacion-de-entrada-y-codigos-http.md) | Validación de entrada, orden de validaciones y códigos HTTP | Aceptado |
| [0004](./0004-ownership-responde-404.md) | Ownership: equipos ajenos responden `404`, no `403` | Aceptado |
| [0005](./0005-reutilizar-pokeapi-service.md) | Validación de especies reutilizando `pokeapi.service.js` | Aceptado |
| [0006](./0006-creacion-atomica-con-transaccion.md) | Creación atómica de equipo + miembros en una transacción | Aceptado |
| [0007](./0007-alcance-del-modulo.md) | Alcance: qué entra y qué queda fuera | Aceptado (parcialmente reemplazado por 0009) |
| [0008](./0008-json-malformado-responde-400.md) | JSON con sintaxis inválida responde `400`, no `500` | Aceptado |
| [0009](./0009-pantalla-de-equipos-con-busqueda-debounced.md) | Pantalla de Equipos con búsqueda debounced por nombre exacto | Aceptado (parcialmente reemplazado por 0010) |
| [0010](./0010-autocompletado-local-con-indice-de-nombres.md) | Autocompletado local con índice de nombres | Aceptado |
