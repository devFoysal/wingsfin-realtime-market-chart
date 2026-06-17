import pg from "pg";
import { config } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { publishInvalidation, publishTick } from "../../modules/market/ticks.service.js";
import type { InstrumentType, Tick } from "../../modules/market/types.js";

const { Client } = pg;
const CHANNEL = "market_ticks_changed";
const RECONNECT_DELAY_MS = 2_000;

interface TickNotification {
  action: "INSERT" | "UPDATE" | "DELETE" | "INVALIDATE";
  instrumentId: number;
  symbol: string;
  type: InstrumentType;
  time: string | null;
  value: number | null;
  yesterdayClose: number | null;
}

function parseNotification(payload: string): TickNotification | null {
  const parsed = JSON.parse(payload) as Partial<TickNotification>;
  if (
    (parsed.action === "INSERT" || parsed.action === "UPDATE" || parsed.action === "DELETE" || parsed.action === "INVALIDATE") &&
    typeof parsed.instrumentId === "number" &&
    typeof parsed.symbol === "string" &&
    (parsed.type === "index" || parsed.type === "stock")
  ) {
    return {
      action: parsed.action,
      instrumentId: parsed.instrumentId,
      symbol: parsed.symbol,
      type: parsed.type,
      time: typeof parsed.time === "string" ? parsed.time : null,
      value: typeof parsed.value === "number" ? parsed.value : null,
      yesterdayClose: typeof parsed.yesterdayClose === "number" ? parsed.yesterdayClose : null
    };
  }
  return null;
}

async function publishFromNotification(notification: TickNotification) {
  if (notification.action === "DELETE" || notification.action === "INVALIDATE") {
    await publishInvalidation(notification.type, notification.symbol, notification.action.toLowerCase());
    return;
  }

  if (notification.time === null || notification.value === null || notification.yesterdayClose === null) {
    await publishInvalidation(notification.type, notification.symbol, "market_tick_changed");
    return;
  }

  const tick: Tick = {
    instrumentId: notification.instrumentId,
    symbol: notification.symbol,
    type: notification.type,
    time: new Date(notification.time).toISOString(),
    value: notification.value,
    yesterdayClose: notification.yesterdayClose
  };
  await publishTick(tick);
}

export function startMarketTickListener() {
  let client: pg.Client | null = null;
  let stopped = false;
  let reconnectTimer: NodeJS.Timeout | null = null;

  const connect = async () => {
    if (stopped) return;

    const nextClient = new Client({ connectionString: config.DATABASE_URL });
    client = nextClient;

    nextClient.on("notification", (message) => {
      if (message.channel !== CHANNEL || !message.payload) return;
      const payload = message.payload;
      void (async () => {
        try {
          const notification = parseNotification(payload);
          if (!notification) {
            logger.warn({ payload }, "Ignoring malformed market tick notification");
            return;
          }
          await publishFromNotification(notification);
        } catch (error) {
          logger.error({ error }, "Failed to publish market tick notification");
        }
      })();
    });

    nextClient.on("error", (error) => {
      logger.error({ error }, "Market tick listener database connection failed");
      void scheduleReconnect();
    });

    nextClient.on("end", () => {
      if (!stopped) void scheduleReconnect();
    });

    try {
      await nextClient.connect();
      await nextClient.query(`listen ${CHANNEL}`);
      logger.info({ channel: CHANNEL }, "Listening for manual market tick database changes");
    } catch (error) {
      logger.error({ error }, "Unable to start market tick listener");
      await scheduleReconnect();
    }
  };

  const scheduleReconnect = async () => {
    if (stopped || reconnectTimer) return;
    await client?.end().catch(() => undefined);
    client = null;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, RECONNECT_DELAY_MS);
  };

  void connect();

  return async () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    await client?.end().catch(() => undefined);
  };
}
