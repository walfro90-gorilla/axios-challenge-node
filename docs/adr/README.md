# Architecture Decision Records (ADR)

Registro de las decisiones de arquitectura tomadas para el módulo **Teams** (ver [`CHALLENGE.md`](../../CHALLENGE.md)).

Cada ADR sigue el formato de Michael Nygard: **Contexto → Decisión → Consecuencias**, más las alternativas consideradas. Un ADR no se edita una vez aceptado: si la decisión cambia, se crea uno nuevo que lo reemplaza (`Reemplazado por ADR-XXXX`).

**Estados:** `Propuesto` · `Aceptado` · `Rechazado` · `Reemplazado`

## Índice

| # | Decisión | Estado |
|---|---|---|
| [0001](./0001-modelo-de-datos-team-teammember.md) | Modelo de datos: `Team` + `TeamMember` en tablas separadas | Propuesto |
| [0002](./0002-capa-de-servicio-para-reglas-de-negocio.md) | Reglas de negocio en `teams.service.js`, controlador delgado | Propuesto |
| [0003](./0003-validacion-de-entrada-y-codigos-http.md) | Validación de entrada, orden de validaciones y códigos HTTP | Propuesto |
| [0004](./0004-ownership-responde-404.md) | Ownership: equipos ajenos responden `404`, no `403` | Propuesto |
| [0005](./0005-reutilizar-pokeapi-service.md) | Validación de especies reutilizando `pokeapi.service.js` | Propuesto |
| [0006](./0006-creacion-atomica-con-transaccion.md) | Creación atómica de equipo + miembros en una transacción | Propuesto |
| [0007](./0007-alcance-del-modulo.md) | Alcance: qué entra y qué queda fuera | Propuesto |
| [0008](./0008-json-malformado-responde-400.md) | JSON con sintaxis inválida responde `400`, no `500` | Propuesto |
