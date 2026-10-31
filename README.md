# Axios Challenge — Backend Node.js + Frontend React

Reto técnico para la posición **Backend Sr / Frontend Mid** en el equipo de TI de **Axios Mobile** (Evolución Ventamovil).

Este repositorio es un **boilerplate funcional y operativo**: una pequeña "Pokédex" con autenticación por JWT y un módulo de **Favoritos** (CRUD) que consume la [PokeAPI](https://pokeapi.co/docs/v2). Todo corre sobre **SQLite**, sin dependencias externas de infraestructura.

> 📄 **Tu reto está en [`CHALLENGE.md`](./CHALLENGE.md). Léelo antes de empezar.**

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20+, Express, Sequelize, SQLite, JWT (bcrypt) |
| Frontend | React 18, TypeScript, Vite |
| Tests | Jest + Supertest |
| Integración | PokeAPI v2 |

## Requisitos

- Node.js **20 o superior** (`node --version`)
- npm

## Cómo levantar el proyecto

### 1. Backend

```bash
cd backend
cp .env.example .env      # ajusta JWT_SECRET si quieres
npm install
npm run seed              # crea la BD SQLite + usuario demo + favoritos de ejemplo
npm run dev               # arranca en http://localhost:4000
```

**Usuario demo precargado:**
- email: `demo@axiosmobile.mx`
- password: `demo1234`

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev               # arranca en http://localhost:5173
```

Abre http://localhost:5173, inicia sesión con el usuario demo y verás el catálogo de pokémon y tus favoritos. El frontend hace proxy de `/api` hacia el backend (ver `frontend/vite.config.ts`).

> **¿Ya tenías una base local de una versión anterior?** Los miembros de equipo ahora guardan foto y tipos (ADR-0014). Como el proyecto usa `sync()` sin migraciones, ejecuta `npm run seed` para recrear la base, o agrega las columnas a mano:
> `ALTER TABLE team_members ADD COLUMN sprite VARCHAR(255);` y `ALTER TABLE team_members ADD COLUMN types JSON NOT NULL DEFAULT '[]';`

### 3. Tests del backend

```bash
cd backend
npm test
```

## Endpoints disponibles (boilerplate)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Healthcheck |
| POST | `/api/auth/register` | — | Registra un usuario |
| POST | `/api/auth/login` | — | Devuelve un JWT |
| GET | `/api/auth/me` | ✅ | Usuario actual |
| GET | `/api/pokemon?limit&offset[&details=true]` | ✅ | Listado (proxy PokeAPI); con `details=true` incluye foto y tipos |
| GET | `/api/pokemon/:name` | ✅ | Detalle de un pokémon |
| GET | `/api/favorites` | ✅ | Lista tus favoritos |
| POST | `/api/favorites` | ✅ | Agrega un favorito |
| PATCH | `/api/favorites/:id` | ✅ | Actualiza el nickname |
| DELETE | `/api/favorites/:id` | ✅ | Elimina un favorito |
| GET | `/api/teams` | ✅ | Lista tus equipos con sus miembros |
| POST | `/api/teams` | ✅ | Crea un equipo `{ name, pokemon: [nombre o id, …] }` (1–6, sin repetidos) |
| DELETE | `/api/teams/:id` | ✅ | Elimina un equipo propio |

## Estructura

```
backend/         API Express + Sequelize (auth, pokemon, favorites)
frontend/        React + Vite (login + pestañas Pokédex paginada, Favoritos y Equipos)
docs/            Arquitectura, ADRs (docs/adr/), plan, hallazgos (FINDINGS.md), uso de IA, rúbrica
AGENTS.md        Memoria del proyecto para agentes de IA (reglas, comandos, trampas conocidas)
CHALLENGE.md     El reto que debes resolver
```

Más detalle de arquitectura en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
