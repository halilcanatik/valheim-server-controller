# Valheim Server Controller

Use this file as compact project context. Read the relevant source before changing behavior; keep changes small and preserve the existing Docker/TypeScript architecture.

## Purpose

Self-hosted Valheim dedicated-server controller for private LAN/Tailscale use. It provides a React control panel, API-key-protected server controls, live status, player history, world statistics, world downloads, and automatic idle shutdown.

## Architecture

- `packages/client`: React 19 + TypeScript + Vite, Bootstrap/Bootswatch, Bootstrap Icons, `ky`.
- `packages/server`: Express + TypeScript + Dockerode, Helmet, CORS, Archiver.
- `docker-proxy`: `tecnativa/docker-socket-proxy`; the controller talks to Docker only through `DOCKER_HOST`.
- `valheim-server`: `lloesche/valheim-server`; exposes Valheim UDP/TCP `2456-2457` and status HTTP on `80`.
- `client`: nginx serves the built SPA on host port `8080` and proxies `/api` to `server:3000`.
- API entry point: `packages/server/src/index.ts`; routes: `packages/server/src/routes/server.ts`.

## Runtime Flow

- `/health` is unauthenticated. Every `/api/*` route requires `X-API-Key` via `middleware/authenticate.ts`.
- `/api/status` combines Docker state, Valheim `http://<container>/status.json`, log-tracked players, persisted player history, world statistics, and idle timing.
- Client keeps the API key only in React state. It polls every 30 seconds, or every 5 seconds while stopping/restarting.
- Start/stop/restart operate on `VALHEIM_CONTAINER_NAME`. Stop is rejected with HTTP 409 when `player_count > 0`; accepted stops use a 30-second Docker grace period and a `.stopping` marker.
- Idle monitoring runs immediately and every minute. A zero-player status starts an in-memory timer; after `IDLE_TIMEOUT_MINUTES`, the Valheim container is stopped.
- `playerLogTracker.ts` follows container logs and infers joins/leaves from Valheim log patterns. `playerHistory.ts` persists sessions and playtime atomically.
- World files are stored in per-world directories under `<VALHEIM_CONFIG_PATH>/worlds_local/<name>`. Downloads are available only when the container state is `exited` and stream the selected directory as a ZIP.
- World statistics are stored beside player history as `<PLAYER_HISTORY_PATH>.world-stats`; the world-time recording function exists but currently has no caller.

## API

All `/api` routes require `X-API-Key`.

- `GET /health`: health JSON.
- `GET /api/status`: status, players, current/recorded worlds, player history, world stats, idle minutes, shutdown countdown.
- `POST /api/start`, `POST /api/stop`, `POST /api/restart`: container controls.
- `GET /api/worlds`: world directories, current world first.
- `GET /api/worlds/:world/download`: ZIP download; server must be stopped.

## Configuration

Server defaults are in `packages/server/src/config/config.ts`:

- `PORT=3000`
- `API_KEY` (fallback is `secure-api-key`; always set a real value)
- `VALHEIM_CONTAINER_NAME=valheim-server`
- `IDLE_TIMEOUT_MINUTES=30`
- `DOCKER_HOST=tcp://docker-proxy:2375`
- `VALHEIM_CONFIG_PATH=/valheim-config`
- `PLAYER_HISTORY_PATH=/player-history/player-history.json`
- `WORLD_NAME` (empty becomes `Unknown World` in responses)

Compose/Valheim variables: `SERVER_NAME`, `SERVER_PASS`, `PUID`, `PGID`, `VALHEIM_CONFIG_HOST_PATH`, and `PLAYER_HISTORY_HOST_PATH`. See `.env.example` and the compose files for mappings and defaults.

## Commands

Run from the package directory:

- Client: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.
- Server: `npm run dev`, `npm run typecheck`, `npm run build`, `npm start`.

Docker workflows from the repository root:

- Development: `docker compose -f docker-compose.dev.yml up` (Vite is exposed as `8080:5173`; source is bind-mounted).
- Production: `docker compose -f docker-compose.prod.yml up -d` (nginx on `8080`; multi-stage images).
- Published images: `.github/workflows/docker-publish.yml` builds and pushes both images to GHCR on pushes to `master`.

There is no test suite or test script; use client lint/build and server typecheck/build for validation.

## Source Map

- Client composition/state: `packages/client/src/App.tsx`, `hooks/useServerApi.ts`, `types/index.ts`.
- Client UI: `components/ServerStatus.tsx`, `ServerControls.tsx`, `Statistics.tsx`, `WorldFiles.tsx`, `ApiKeyInput.tsx`.
- Docker/status: `services/docker.ts`.
- Idle shutdown: `services/idleMonitor.ts`.
- Player tracking/history: `services/playerLogTracker.ts`, `services/playerHistory.ts`.
- World listing/download: `services/worlds.ts`.
- World uptime: `services/worldStats.ts`.
- Transition marker/errors: `services/containerTransition.ts`, `middleware/errorHandler.ts`.
- Deployment: `docker-compose*.yml`, `docker/server/*`, `docker/client/*`, `docker/client/nginx/nginx.conf`.

## Important Constraints

- Intended for Tailscale/private LAN, not public internet: static API key, permissive CORS, no rate limiting, and no built-in HTTPS.
- Do not expose the Docker socket directly; retain the socket proxy boundary and its least-required permissions.
- Do not allow world downloads while the server is running.
- Player status from HTTP and logs can disagree. The status route merges names and currently associates score/duration by array index; account for this when changing player display logic.
- Log tracking starts with `tail: 0`, so players already online at controller startup may not be reconstructed immediately.
- Preserve mounted `/valheim-config` and `/player-history` paths in deployments; they are required for world access and persistent statistics.
