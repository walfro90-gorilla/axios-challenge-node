# ADR-0004: Ownership — equipos ajenos responden `404`, no `403`

- **Estado:** Propuesto
- **Fecha:** 2026-10-30

## Contexto

Un usuario sólo puede ver y eliminar **sus** equipos. El reto exige que intentar borrar el equipo de otro usuario responda `404` y no `403`, "para no filtrar existencia". El boilerplate ya resuelve esto en Favoritos filtrando **todas** las queries por `req.user.id`.

## Decisión

- El ownership se aplica **en la propia query**, no como verificación posterior:
  - `GET`: `Team.findAll({ where: { userId } , include: members })`.
  - `DELETE`: `Team.destroy({ where: { id, userId } })`; si afecta 0 filas → `HttpError.notFound('Equipo no encontrado')`.
- No existe ningún camino de código que cargue un equipo sólo por `id` y luego compare `userId`.
- El mismo `404` y el mismo mensaje se devuelven para "no existe" y "existe pero es de otro usuario"; las dos situaciones son indistinguibles para el cliente.

## Alternativas consideradas

1. **`findByPk(id)` y luego `if (team.userId !== userId) throw 403`.** Revela que el recurso existe (enumeración de ids) y es fácil olvidar el chequeo en un endpoint nuevo. **Rechazada.**
2. **Middleware genérico de autorización por recurso.** Sobre-ingeniería para un solo recurso con tres endpoints. **Rechazada.**

## Consecuencias

- **+** Imposible por construcción filtrar o tocar datos ajenos; no se puede enumerar qué ids existen.
- **+** Consistente con el patrón de Favoritos (`where: { id, userId }`).
- **−** Un usuario legítimo con un id equivocado recibe el mismo `404` que un atacante; es el comportamiento deseado.
- Este caso se cubre explícitamente en pruebas (usuario B intenta borrar el equipo de A → `404`, y el equipo de A sigue existiendo).
