# Demo Script

1. Start the stack:

   ```bash
   cp .env.example .env
   docker compose up --build
   ```

2. Open http://localhost:8080.

3. Confirm the default chart type is `Index · DSEX`.

4. Observe:

   - full market-session x-axis
   - dotted yesterday-close line
   - latest value in the top-right corner
   - blinking latest point
   - live stream status
   - point colors changing around yesterday close

5. Switch chart type to `Stock · GP`.

6. Inject a manual tick:

   ```bash
   curl -X POST http://localhost:8080/api/simulate/tick \
     -H 'content-type: application/json' \
     -d '{"trade_code":"GP","time":1779336913000,"close_price":239.51,"yesterday_close_price":238.88}'
   ```

7. Open Swagger at http://localhost:8080/api/docs and inspect the available endpoints.

8. Open pgAdmin at http://localhost:5050 and register:

   - Host: `postgres`
   - Port: `5432`
   - Database: `wingfin`
   - Username: `wingfin`
   - Password: `wingfin`

9. Inspect:

   ```sql
   select * from instruments;
   select * from market_ticks order by time desc limit 50;
   ```

10. Change the latest `market_ticks.value` in pgAdmin and save it. The chart should update through SSE without refreshing the browser.

11. Optional closed-market check:

    ```bash
    MARKET_STATUS_OVERRIDE=closed docker compose up --build
    ```

    The frontend should show the market-closed message instead of charts.
