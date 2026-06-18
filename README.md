# WingsFin Real-Time Market Chart

WingsFin real-time index and stock charts.

- **Demo Video:** [Watch the demo](https://www.awesomescreenshot.com/video/53722103?key=ca0c2fc1dc9b2acb46de9a7e2921ef63)
- **GitHub Repository:** [devFoysal/wingsfin-realtime-market-chart](https://github.com/devFoysal/wingsfin-realtime-market-chart.git)

## System Expectations

- Page load time stays low by serving the web app through Nginx and keeping the initial experience focused.
- Chart time to interactive stays low by loading only the active market session and updating live data in place.
- Real-time updates feel instantaneous through SSE, Redis fan-out, and PostgreSQL notifications.
- The solution scales with minimal resource growth because clients do not poll the database.
- Everything runs in Docker Compose, including the API, frontend, Postgres/TimescaleDB, Redis, Nginx, and pgAdmin.

## What It Does

- Shows index and stock charts with a full market-session x-axis.
- Loads irregular historical ticks from market open to the current minute.
- Seeds historical data with non-uniform intervals for mid-market testing.
- Keeps the timeline gapless at 1-minute intervals by carrying the latest known value forward.
- Uses the latest update when multiple ticks arrive in the same minute.
- Streams live updates through Server-Sent Events.
- Reflects manual `market_ticks` database edits through PostgreSQL notifications without a browser refresh.
- Shows a dotted yesterday-close reference line and colors points by above/below/equal rules.
- Includes a built-in irregular simulator for DSEX and GP.
- The simulator emits updates at unequal intervals under 3 seconds.
- Index values fluctuate within +/-100 of yesterday close; stock values fluctuate within +/-1.
- The simulator curve is shaped to resemble an intraday market chart with an initial dip, recovery, and noisy upward drift.
- The UI includes a live simulator feed so reviewers can see fake source ticks arriving in real time.
- Runs with TimescaleDB, Redis, API, web, Nginx, and pgAdmin through Docker Compose.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Running `docker compose up --build` is intended to start the full system: API, web app, PostgreSQL/TimescaleDB, Redis, Nginx, and pgAdmin.
If Docker is reusing stale state after a teardown, run `make clean && make up` once to force a fresh stack.
If Redis still fails with a cached-image style error, `make down && docker compose pull redis && make up` will force a fresh Redis image before starting again.

Open:

- App: http://localhost:8080
- API Swagger: http://localhost:8080/api/docs
- Health: http://localhost:8080/health
- pgAdmin: http://localhost:5050

pgAdmin login:

- Email: `admin@example.com`
- Password: `admin`

The WingsFin database is auto-registered as `WingsFin TimescaleDB`. If you ever need to register manually:

- Host: `postgres`
- Port: `5432`
- Database: `wingsfin`
- Username: `wingsfin`
- Password: `wingsfin`

## Useful Commands

```bash
make up
make down
make logs
make migrate
make seed
make test
make lint
```

## Testing

Run the automated checks:

```bash
npm test --workspaces --if-present
npm run build -w backend
npm run build -w frontend
npm run lint --workspaces --if-present
```

For a full end-to-end demo, start the stack with `docker compose up --build`, then open `http://localhost:8080`.

## Local Development

```bash
npm install
npm run migrate -w backend
npm run seed -w backend
npm run dev -w backend
npm run dev -w frontend
```

For local development without Docker, run PostgreSQL with TimescaleDB and Redis, then set:

```bash
DATABASE_URL=postgres://wingsfin:wingsfin@localhost:5432/wingsfin
REDIS_URL=redis://localhost:6379
```

Docker maps PostgreSQL to host port `5433` by default to avoid conflicts with local Postgres installs. Inside Docker and pgAdmin, keep using `postgres:5432`.

## Configuration

Key env vars:

- `MARKET_TIMEZONE=Asia/Dhaka`
- `MARKET_OPEN_TIME=10:00`
- `MARKET_CLOSE_TIME=14:30`
- `MARKET_STATUS_OVERRIDE=auto|open|closed`
- `DEFAULT_INDEX_SYMBOL=DSEX`
- `DEFAULT_STOCK_SYMBOL=GP`
- `SIMULATOR_ENABLED=true|false`

`MARKET_STATUS_OVERRIDE=auto` strictly follows the configured clock hours. Use `open` only when you want to force the live demo outside market hours, or `closed` to test the closed-market message.

## Project Tree

```text
.
├── backend
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   ├── eslint.config.js
│   ├── migrations/
│   ├── package.json
│   ├── src
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── http/
│   │   ├── infrastructure/
│   │   ├── modules/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── server.ts
│   │   └── swagger/
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docker-compose.yml
├── docs/
├── frontend
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── src
│   │   ├── __tests__/
│   │   ├── App.tsx
│   │   ├── assets/
│   │   ├── components/
│   │   ├── dtos/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── main.tsx
│   │   ├── schema/
│   │   ├── services/
│   │   ├── store/
│   │   ├── test-setup.ts
│   │   ├── utils/
│   │   └── vite-env.d.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── infra/
├── Makefile
├── package-lock.json
├── package.json
└── README.md
```

## API Examples

Inject an index update:

```bash
curl -X POST http://localhost:8080/api/simulate/tick \
  -H 'content-type: application/json' \
  -d '{"index_id":"DSEX","time":1779336701000,"capital_value":5222.22,"percentage_change_from_yesterday_close_value":4.12}'
```

Inject a stock update:

```bash
curl -X POST http://localhost:8080/api/simulate/tick \
  -H 'content-type: application/json' \
  -d '{"trade_code":"GP","time":1779336913000,"close_price":238.79,"yesterday_close_price":238.88}'
```

Read chart history:

```bash
curl 'http://localhost:8080/api/charts/history?type=index&symbol=DSEX'
```

Manual database changes are realtime too. In pgAdmin, update or insert a row in `market_ticks`; the PostgreSQL trigger notifies the API, Redis fans it out, and the open chart updates without refreshing the page.

## Tests

```bash
npm test --workspaces --if-present
npm run build
```

The backend tests cover market status, payload validation, latest-per-minute aggregation, and carry-forward behavior. The frontend tests cover closed-market rendering and default index selection.

## Deliverables

- Architecture diagram: [docs/architecture.mmd](./docs/architecture.mmd)
- Architecture and design decisions: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Demo script: [docs/DEMO.md](./docs/DEMO.md)
