# Architecture And Design Decisions

## System Architecture

The app is split into a React frontend, an Express API, PostgreSQL with TimescaleDB, Redis Pub/Sub, Nginx, and pgAdmin.

Nginx is the public entrypoint. It serves the web app and proxies `/api/*` requests to Express. The SSE endpoint has buffering disabled so live updates reach the browser immediately.

The API stores raw irregular source updates in a Timescale hypertable. Chart responses are produced by querying ticks for the active market session, bucketing by minute, keeping the latest tick inside each minute, and carrying the last known value forward so the frontend always receives a gapless 1-minute timeline.

Redis decouples database changes from connected clients. Market tick inserts, updates, and deletes fire a PostgreSQL `LISTEN/NOTIFY` trigger; the API listener converts those notifications into Redis Pub/Sub events. API instances subscribed to Redis can fan out matching updates to SSE clients, which supports horizontal scaling behind Nginx and also makes pgAdmin/manual database edits visible without a browser refresh.

## Technology Choices

- Node.js, Express, and TypeScript keep the backend simple, typed, and easy to review.
- Swagger UI documents the API directly at `/api/docs`.
- PostgreSQL plus TimescaleDB is a good fit for append-heavy time-series ticks and fast time-bounded queries.
- Redis Pub/Sub avoids polling and avoids every API instance querying the database for every tick.
- SSE is used instead of WebSocket because market data is server-to-client, lightweight, proxy-friendly, and efficient for many concurrent readers.
- React, Vite, Tailwind, and shadcn-style components keep the frontend fast and maintainable.
- Apache ECharts provides mature time-series chart behavior, mark lines, tooltips, and animated latest-point rendering.

## System Expectations

- Page load time should stay low by serving the app through Nginx and keeping the initial browser state minimal.
- Chart time to interactive should stay low by rendering a single active session and updating points in place rather than reloading the page.
- Real-time updates should feel instantaneous through SSE backed by Redis Pub/Sub and PostgreSQL `LISTEN/NOTIFY`.
- The solution should scale with minimal resource growth because read traffic is fanned out from memory instead of hitting the database repeatedly.
- The complete stack is containerized with Docker Compose so local development and demo setup are reproducible.

## Data Flow

1. Seed scripts insert irregular historical DSEX and GP data for the current market session using non-uniform intervals.
2. The simulator emits arbitrary live updates at unequal intervals under 3 seconds.
3. Index values fluctuate within +/-100 of yesterday close; stock values fluctuate within +/-1.
4. The curve is intentionally shaped to look like a real intraday market chart with an early dip, recovery, and noisy upward drift.
5. `POST /api/simulate/tick` validates source-style payloads with Zod.
6. Valid ticks are normalized and stored in `market_ticks`.
7. A PostgreSQL trigger notifies the API whenever `market_ticks` changes, including manual pgAdmin edits.
8. The API publishes matching tick or invalidation events to Redis.
9. `GET /api/charts/history` returns the full session timeline with gapless 1-minute points.
10. `GET /api/charts/stream` sends matching ticks to connected browsers.
11. The frontend updates the changed minute immediately, or silently reloads history after delete/time-shift invalidations.

## Scalability And Trade-Offs

The main read path is cache-friendly and bounded by a single market session. TimescaleDB indexes support fast instrument/time queries. SSE client fan-out is handled in API memory and coordinated through Redis, so adding API replicas does not multiply source ingestion work.

The frontend updates ordinary live tick events in place and only refetches history for invalidations, such as a deleted tick or a changed timestamp that may alter minute aggregation.

Authentication is intentionally omitted because the assignment asks for an evaluable demo, not a protected trading platform.

## Operational Notes

Default Docker Compose enables `MARKET_STATUS_OVERRIDE=open` so reviewers can see live charts immediately. Set it to `auto` to use the configured `MARKET_OPEN_TIME`, `MARKET_CLOSE_TIME`, and `MARKET_TIMEZONE`.

pgAdmin is included for database inspection. The Timescale hypertable is `market_ticks`; instrument metadata lives in `instruments`.
