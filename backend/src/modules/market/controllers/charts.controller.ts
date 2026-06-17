import type { NextFunction, Request, Response } from "express";
import type { ChartHistoryDto, ChartQueryDto } from "../dtos/market.dto.js";
import { redisSubscriber } from "../../../infrastructure/redis/client.js";
import { getMarketSession } from "../services/session.service.js";
import { chartQuerySchema } from "../schemas/market.schema.js";
import { getHistory, type MarketStreamEvent } from "../services/ticks.service.js";

export async function getChartHistory(
  req: Request<unknown, ChartHistoryDto, unknown, ChartQueryDto>,
  res: Response<ChartHistoryDto>,
  next: NextFunction
) {
  try {
    const query = chartQuerySchema.parse(req.query);
    const session = getMarketSession();
    res.json(await getHistory(query.type, query.symbol, session));
  } catch (error) {
    next(error);
  }
}

export function streamChartTicks(req: Request, res: Response, next: NextFunction) {
  const parsedQuery = chartQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) return next(parsedQuery.error);

  const { type, symbol } = parsedQuery.data;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const handler = (_channel: string, message: string) => {
    const parsedEvent = JSON.parse(message) as MarketStreamEvent;
    const event =
      "event" in parsedEvent && "data" in parsedEvent
        ? parsedEvent
        : ({ event: "tick", data: parsedEvent } as MarketStreamEvent);

    if (event.data.type === type && event.data.symbol === symbol) {
      res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }
  };

  redisSubscriber.on("message", handler);
  req.on("close", () => {
    redisSubscriber.off("message", handler);
    res.end();
  });
}
