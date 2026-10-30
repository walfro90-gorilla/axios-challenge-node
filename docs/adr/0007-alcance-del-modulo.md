# ADR-0007: Alcance — qué entra y qué queda fuera

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

El reto está calibrado para ~1 hora y la rúbrica premia "poco código bien hecho" y penaliza la sobre-ingeniería. Hay una parte obligatoria y una lista de bonus opcionales.

## Decisión

### Dentro del alcance

| Elemento | Tipo |
|---|---|
| `GET` / `POST` / `DELETE /api/teams` | Obligatorio |
| Máx. 6 miembros (`422`), especies validadas contra la PokeAPI (`422`), ownership (`404`) | Obligatorio |
| Test con Jest + Supertest | Obligatorio (se cubren las 3 reglas + creación válida, no sólo 1) |
| `docs/AI_USAGE.md` | Obligatorio |
| Sin especies duplicadas (`409`) | Bonus: costo marginal casi nulo, ya forma parte del flujo de validación (ADR-0003) |
| JSON malformado → `400` en `error.middleware.js` | Corrección de un bug del boilerplate detectado en la revisión (ADR-0008) |
| Estos ADRs | Documentación de decisiones |

### Fuera del alcance (candidatos para "qué haría con más tiempo")

- `GET /api/teams/:id` y `PATCH /api/teams/:id` (renombrar / reemplazar miembros).
- Pantalla de Equipos en el frontend.
- Orden explícito (`position`) y apodos por miembro.
- Reportar todas las especies inválidas a la vez (`Promise.allSettled`).
- Paginación de `GET /api/teams`.
- Migraciones en lugar de `sync()`.
- Validar especies reales (`/pokemon-species/`) y normalizar ids con ceros a la izquierda (ADR-0005).
- Manejo genérico de errores 4xx de body-parser (`413` payload muy grande, etc.) (ADR-0008).
- Reintentos ante `429`/`5xx` de la PokeAPI.
- Concurrencia de escritura en SQLite: `POST` simultáneos pueden dar `500 SQLITE_BUSY` (ADR-0006). `retry` de Sequelize o modo WAL; en producción, Postgres.
- Agregar equipos de ejemplo al seed. Implicaría tocar `seed.js`; se evalúa por separado porque no es requisito.

## Alternativas consideradas

1. **Implementar todos los bonus.** Excede el tiempo sugerido y aumenta la superficie a revisar y defender en la entrevista. **Rechazada.**
2. **Sólo lo obligatorio, con 1 test.** Cumple, pero la regla de duplicados y unas pruebas más completas cuestan poco y reducen riesgo. **Rechazada.**

## Consecuencias

- **+** Entrega pequeña, completa y defendible.
- **+** Lo pospuesto queda listado explícitamente para el PR.
- **−** Sin interfaz para Teams: se prueba por API (curl / tests).
