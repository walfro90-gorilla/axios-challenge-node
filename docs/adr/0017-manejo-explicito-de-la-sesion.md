# ADR-0017: Manejo explícito de la sesión (token expirado y backend caído)

- **Estado:** Aceptado
- **Fecha:** 2026-10-31
- **Amplía:** ADR-0016 (los errores del cliente nunca son 5xx) y el flujo de autenticación de `docs/ARCHITECTURE.md`

## Contexto

La QA a fondo (hallazgos H-31 y H-32 en `FINDINGS.md`) encontró dos fallas silenciosas en el frontend, ambas **sin mensaje para el usuario**:

1. **Token expirado al arrancar:** `AuthContext` leía el token de `localStorage` y lo daba por válido. Con un token vencido, la app se quedaba en "Cargando…" para siempre y mostraba "Token inválido o expirado" sin ninguna forma de volver a iniciar sesión. El usuario quedaba atrapado.
2. **Backend caído:** al recargar con el backend fuera de servicio, la app renderizaba un `#root` **vacío**: pantalla totalmente en blanco, sin login ni error. Con la sesión abierta, cada pantalla mostraba su propio error, pero el login mostraba el texto crudo **`Failed to fetch`** (en inglés y técnico).

Además, cuando el token expiraba **con la app abierta**, las peticiones follow-on fallaban con 401 sin cerrar la sesión: la app seguía "autenticada" pero no podía hacer nada.

## Decisión

### Validación de la sesión al arrancar
- `AuthProvider` valida el token guardado contra `GET /api/auth/me` antes de montar la app.
- **401 (token expirado o revocado):** se limpia el token y se vuelve al login.
- **Error de red (backend caído):** no se puede saber si el token es válido, así que **se conserva la sesión** y se muestra una pantalla "Sin conexión con el servidor" con botón **Reintentar**.
- Mientras valida, se muestra "Comprobando sesión…" (nunca una pantalla vacía).

### Cierre de sesión ante 401 en caliente
- `client.ts` detecta un `401` en cualquier petición con token y: limpia el token, emite el evento `axios:unauthorized` y `AuthContext` lo escucha para cerrar la sesión. Así, aunque el token expire con la app abierta, se vuelve al login de forma automática.

### Errores de red traducidos
- `fetch` rechaza con un `TypeError` genérico ("Failed to fetch"). `client.ts` lo traduce a **"No se pudo conectar con el servidor. Revisa que el backend esté corriendo."**
- El mensaje viaja en el `Error`, así que lo heredan **todas** las pantallas y el login del boilerplate, sin tocarlo.

### Atributos de accesibilidad
- Los inputs del login llevan `autocomplete="username"` y `autocomplete="current-password"` (H-27): Chrome dejaba un aviso en el panel *Issues*.

## Alternativas consideradas

1. **No validar el token al arrancar** (estado actual antes de este ADR). Deja al usuario atrapado. **Rechazada.**
2. **Validar el token y, ante cualquier error, cerrar la sesión.** Con el backend caído se expulsaría al usuario y vería el login, que además fallaría. Se pierde no se distingue entre "no tengo sesión" y "no hay servidor". **Rechazada.**
3. **Reintentar automáticamente sin avisar.** Oculta el problema y no deja al usuario actuar. **Rechazada.**
4. **Sondear `/api/health` antes de validar la sesión.** Una petición extra en cada arranque, sin unearthed. **Rechazada:** el propio `GET /auth/me` ya distingue 401 de error de red.

## Consecuencias

- **+** Ninguna falla deja una pantalla en blanco o un "Cargando…" infinito.
- **+** El token expirado con la app abierta se maneja sin que el usuario lo note.
- **+** Un solo punto donde traducir los errores de red.
- **−** Una petición extra al arrancar (`/auth/me`) cuando hay token guardado.
- **−** `Login.tsx` (boilerplate) recibe dos atributos; no se toca su lógica ni su estructura.
