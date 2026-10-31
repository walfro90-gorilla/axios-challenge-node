# ADR-0013: Estilos con CSS propio, sin dependencias

- **Estado:** Aceptado
- **Fecha:** 2026-10-30

## Contexto

Se pidió que la app "se vea bien". Hoy todo usa estilos inline mínimos y los controles nativos del navegador. No se puede modificar `Favorites.tsx`, pero conviene que toda la app luzca coherente.

## Decisión

- Un único `frontend/src/styles.css`, importado en `main.tsx`, con:
  - **Variables CSS** (colores, radios, sombras) y una tipografía del sistema.
  - **Estilos base de elementos** (`body`, `h1`, `h2`, `button`, `input`, `ul`). Mejoran también Favoritos y Login **sin tocar sus archivos**.
  - **Clases** para lo nuevo: `.card`, `.grid`, `.type-badge` + `.type-<tipo>` (los 18 colores oficiales), `.pager`, `.tabs`, `.btn-primary`, `.muted`.
- `Pokedex.tsx`, `Teams.tsx` y `App.tsx` pasan de estilos inline a clases.
- Sin preprocesadores, sin CSS-in-JS y sin frameworks.

## Alternativas consideradas

1. **Tailwind CSS.** Rápido de escribir, pero suma dependencia, configuración y un estilo de clases que el resto del proyecto no usa. **Rechazada.**
2. **Librería de componentes (MUI, Chakra).** Mucho peso para tres pantallas. **Rechazada.**
3. **CSS Modules por componente.** Mejor aislamiento, pero no alcanza a los estilos base de Favoritos y Login. **Rechazada.**

## Consecuencias

- **+** Toda la app gana coherencia visual sin dependencias nuevas.
- **−** Los estilos base son globales: cambian la apariencia de Favoritos y Login (no su comportamiento ni su código). Se declara en el PR.
- **−** Los estilos inline de `Favorites.tsx` tienen prioridad sobre el CSS global; su layout se mantiene como está.
