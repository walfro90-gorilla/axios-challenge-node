# Documentación de uso de IA

> Entregable obligatorio del reto. Describe con honestidad cómo dirigí y validé a la IA.

---

## 1. Herramientas utilizadas

- **Claude Opus** (Anthropic) como agente de código dentro de **OpenCode**, con acceso al repositorio y a una terminal (lectura de archivos, ejecución de `npm test`, `curl`, `git`, `gh`).
- Un **subagente** de la misma herramienta, lanzado con contexto limpio y en modo sólo lectura, para la revisión independiente del código.

No usé otras herramientas de IA.

## 2. ¿Cómo la usaste? (flujo general)

Trabajé en modo **"decisiones primero, código después"**, con puntos de control donde la IA se detenía a esperar mi aprobación:

1. **Contexto:** le pedí a la IA leer todo el repo y resumir el reto.
2. **ADRs antes de código:** le pedí documentar como ADRs las decisiones que exige el challenge (`docs/adr/`).
3. **Plan:** a partir de los ADRs, un plan de implementación; le pedí que fuera agéntico sólo si tenía sentido (`docs/IMPLEMENTATION_PLAN.md`).
4. **Revisión de consistencia:** antes de implementar, le pedí cotejar todos los `.md` del reto contra los ADRs y verificar contra el código real. De ahí salieron 3 errores y 4 huecos en los ADRs, y 3 decisiones que tomé yo.
5. **Implementación por fases** con commits convencionales, tests y pruebas con `curl` contra la PokeAPI real.
6. **Revisión independiente** por un subagente, cuyos hallazgos se clasificaron en corregir / documentar / descartar.

## 3. Prompts clave

### Prompt 1: ADRs antes de escribir código
```
antes de eso, necesito que crees ADR's acerca de lo que pide el challenge.
```
**Para qué lo usé / resultado:** forzar que las decisiones (modelo de datos, códigos HTTP, 404 vs 403, reutilización de la PokeAPI, transacción, alcance) quedaran explícitas y revisables **antes** de que existiera código. Resultado: 7 ADRs iniciales (luego 8).

### Prompt 2: plan derivado de los ADRs
```
a base de las ADR's, crea un plan para implementarlo. Si es necesario que sea plan agentico, hazlo así.
```
**Para qué lo usé / resultado:** un plan por fases con criterio de "hecho" y verificación en cada una. La IA argumentó que paralelizar la escritura con varios agentes no convenía (pasos dependientes, riesgo de inconsistencias) y propuso un esquema híbrido: implementación secuencial + un subagente revisor con contexto limpio + puntos de control humanos. Acepté ese enfoque.

### Prompt 3: revisión de consistencia (el que más movió la aguja)
```
antes de continuar, revisemos si el proyecto es consistente, o si hay cosas que no podríamos
implementar? Revisa completo los .md donde viene información y cotejémoslo con los ADR's para
ver si los tenemos completos y correctos.
```
**Para qué lo usé / resultado:** obligar a la IA a validar sus propios documentos contra la realidad. Ejecutó pruebas y encontró, entre otros:
- **Un bug del boilerplate:** un JSON con sintaxis inválida devolvía `500` en vez de `400`.
- **Una afirmación falsa en su propio ADR** sobre la caché (ver sección 6).
- **Limitaciones de la PokeAPI** verificadas con peticiones reales: `deoxys` → 404, `025` → 404, `charizard-mega-x` cuenta como distinto de `charizard`.
- **Un riesgo de entrega:** en un fork, `gh pr create` apunta por defecto al repo original.

### Prompt 4: mis decisiones sobre los puntos abiertos
```
A. a   (corregir el 500 de JSON malformado en error.middleware.js)
B. si  (rechazar equipos vacíos con 422)
C. si  (nombre de equipo máx. 50 caracteres → 400)
```
**Para qué lo usé / resultado:** la IA presentó opciones con su recomendación y yo decidí. La decisión A se convirtió en el ADR-0008, con su propio commit `fix:` y su test.

## 4. Qué acepté, rechacé o corregí de la IA

| Sugerencia de la IA | ¿Acepté / rechacé / corregí? | ¿Por qué? |
|---|---|---|
| ADR-0005 afirmaba que "la caché evita repetir consultas" al resolver especies en paralelo | **Corregí** | Es falso con `Promise.all`: la caché sólo se llena al llegar la respuesta, así que `["pikachu","pikachu"]` hace 2 llamadas. Se detectó en la revisión de consistencia. |
| Modelo con `userId` nullable, copiando a Favoritos | **Corregí** | Verificamos en el esquema real que `favorites.user_id` admite NULL. En Teams las FKs se declararon `NOT NULL`. |
| Validar en un middleware, como sugiere el diagrama de `ARCHITECTURE.md` | **Rechacé** | El boilerplate no tiene middlewares de validación y partiría las reglas en dos lugares. Queda justificado en el ADR-0002. |
| Arreglar el 500 por JSON inválido tocando `error.middleware.js` | **Acepté** (decisión A) | Es infraestructura compartida, no Favoritos. Son 3 líneas con test y la rúbrica premia la validación robusta. |
| Implementar todos los bonus | **Rechacé** | El reto está calibrado para ~1 h. Sólo se hizo el bonus de duplicados (`409`), que casi no costaba nada. Ver ADR-0007. |
| Reformatear con Prettier los archivos del boilerplate que no pasaban `--check` | **Rechacé** | Eran avisos previos (se verificó contra `main`). Reformatearlos ensuciaría el diff con cambios ajenos al reto. |
| Hallazgos del subagente revisor (11) | **Acepté 4 correcciones, documenté 4, descarté 1** (los 2 restantes ya estaban previstos para la última fase) | Correcciones: `DELETE /1.0` borraba el equipo 1 (afinidad de tipos de SQLite), orden inestable, mensaje confuso y tests que no cubrían lo que los ADRs prometían. Documentados: concurrencia SQLite, asimetría de validación, `422`/`502` no determinista. |
| Configurar `busyTimeout` para arreglar `SQLITE_BUSY` con `POST` concurrentes | **Rechacé tras probarlo** | Se aplicó en forma temporal, se midió (seguía habiendo 7–24 errores de cada 30) y se revirtió. Quedó como limitación documentada en el ADR-0006. |
| Usar `retry` de Sequelize ante `SQLITE_BUSY` (sugerencia del subagente) | **Pospuse** | Toca `config/database.js` (compartido) y no se verificó. Queda en "qué haría con más tiempo". |

## 5. Decisiones de diseño que tomaste tú

Lo que yo dirigí o decidí (la IA propuso opciones y redactó, pero no decidió esto):

- **Proceso:** escribir **ADRs antes de cualquier código**, derivar el plan **de los ADRs** y exigir una **revisión de consistencia** de toda la documentación del reto contra los ADRs antes de implementar.
- **Plan agéntico sólo si tenía sentido:** acepté el esquema híbrido y la revisión independiente por un subagente.
- **Puntos de control:** avanzar por fases con mi aprobación (Fase 0, luego 1–5, luego 6 y 7).
- **JSON malformado → `400`:** corregir el bug del boilerplate en lugar de sólo anotarlo (ADR-0008).
- **Equipos vacíos → `422`:** un equipo debe tener al menos 1 pokémon.
- **Nombre máx. 50 caracteres → `400`.**
- **Entrega:** trabajar sobre un **fork propio** (`walfro90-gorilla/axios-challenge-node`) en la rama `feat/teams-module`.
- **Herramienta:** usar sólo Claude Opus y documentar honestamente su uso.

Las decisiones que venían dictadas por el reto (máx. 6 → `422`, especie inexistente → `422` reutilizando `pokeapi.service.js`, ownership → `404`) quedaron registradas en los ADRs 0003–0005.

## 6. ¿Dónde te falló o te "alucinó" la IA?

- **Afirmación falsa sobre la caché (ADR-0005).** La IA aseguró que la caché evitaba consultas repetidas dentro de un equipo; con `Promise.all` no es así. Lo detectó la propia IA, pero **sólo porque le pedí la revisión de consistencia**.
- **Afirmación falsa sobre la cobertura de tests (plan).** El plan decía que un test "cubría la cascada de forma indirecta". El subagente revisor señaló que no: el test pasaría aunque la cascada no existiera. Se agregó una verificación explícita (`TeamMember.count() === 0`).
- **Suposición de que no habría problemas de concurrencia.** El ADR-0006 sólo se preocupaba de que la transacción fuera "corta". La revisión demostró que con `POST` simultáneos SQLite responde `500 SQLITE_BUSY` (13 de 20 en una prueba). No estaba previsto.
- **Efecto colateral al editar con el servidor en `--watch`.** Al guardar los modelos en varios pasos, el servidor de desarrollo se reinició a mitad de camino y creó las tablas **sin** sus claves foráneas (`sync()` no altera tablas ya existentes). La IA lo detectó al verificar el esquema, borró las tablas (vacías) y se recrearon bien. El riesgo estaba anotado en el plan, pero igual ocurrió.
- **Un intento de arreglo que no funcionó** (`busyTimeout`). Lo valioso fue que la IA midió antes de dar el arreglo por bueno y lo revirtió.

Lección: la IA escribió afirmaciones plausibles pero falsas en su propia documentación. **Pedirle que verificara contra el código y que pasara por una revisión independiente fue lo que las sacó a la luz.**

## 7. ¿Qué harías distinto con más tiempo?

- Resolver la concurrencia de escritura en SQLite (`retry` ante `SQLITE_BUSY` o modo WAL); en producción, Postgres.
- `GET /api/teams/:id` y `PATCH /api/teams/:id`, y la pantalla de Equipos en el frontend.
- Validar especies reales (`/pokemon-species/`) y normalizar ids como `025`. Implica evolucionar `pokeapi.service.js` (beneficiaría también a Favoritos).
- Reportar todas las especies inválidas a la vez (`Promise.allSettled`) con una precedencia clara entre `422` y `502`.
- Reintentos ante `429`/`5xx` de la PokeAPI.
- Orden explícito (`position`) y apodos por miembro.
- Migraciones en lugar de `sync()`.
- Desde el proceso: poner antes el chequeo empírico (scripts de casos borde) en lugar de dejarlo a la revisión final.
