import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import {
  getCandles,
  getQuote,
  getSymbolInfo,
  searchMarkets,
  watchCandles,
  type Timeframe,
} from "@mathieuc/tradingview/data";
import { createLimiter } from "./limiter.js";

/** Largest history window one request may ask for. */
const MAX_CANDLES = 5000;

export async function createServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  // Each upstream call opens its own socket; cap concurrency and share identical
  // in-flight candle requests so a burst of chart cells does not fail.
  const upstream = createLimiter(Number(process.env.UPSTREAM_CONCURRENCY) || 3);
  const fetchCandles = (query: Parameters<typeof getCandles>[0]) =>
    upstream.runShared(JSON.stringify(query), () => getCandles(query));

  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/api/search", async (request, reply) => {
    const { query = "", type } = request.query as { query?: string; type?: string };
    if (!query) return reply.code(400).send({ error: "Query parameter 'query' is required" });
    return { results: await upstream.run(() => searchMarkets(query, { type })) };
  });

  app.get("/api/quote", async (request, reply) => {
    const { symbol } = request.query as { symbol?: string };
    if (!symbol) return reply.code(400).send({ error: "Query parameter 'symbol' is required (e.g. BINANCE:BTCUSDT)" });
    return upstream.run(() => getQuote(symbol));
  });

  app.get("/api/symbol-info", async (request, reply) => {
    const { symbol } = request.query as { symbol?: string };
    if (!symbol) return reply.code(400).send({ error: "Query parameter 'symbol' is required" });
    return upstream.run(() => getSymbolInfo(symbol));
  });

  // `from` / `to` are Unix seconds. With `from`, history loads back to that time and
  // `count` is ignored; `to` alone returns the `count` bars ending at `to`.
  app.get("/api/candles", async (request, reply) => {
    const { symbol, timeframe = "D", count = "100", from, to } = request.query as {
      symbol?: string;
      timeframe?: string;
      count?: string;
      from?: string;
      to?: string;
    };
    if (!symbol) return reply.code(400).send({ error: "Query parameter 'symbol' is required" });
    const fromSec = from === undefined ? undefined : Number(from);
    const toSec = to === undefined ? undefined : Number(to);
    if ((fromSec !== undefined && !Number.isFinite(fromSec)) || (toSec !== undefined && !Number.isFinite(toSec))) {
      return reply.code(400).send({ error: "Query parameters 'from' and 'to' must be Unix seconds" });
    }
    const candles = await fetchCandles({
      symbol,
      timeframe: timeframe as Timeframe,
      count: Math.min(Number(count) || 100, MAX_CANDLES),
      ...(fromSec !== undefined ? { from: fromSec } : {}),
      ...(toSec !== undefined ? { to: toSec } : {}),
    });
    return { symbol, timeframe, count: candles.length, candles };
  });

  // Live bar stream: one `{ type: "candle", candle }` frame per update of the forming bar.
  app.get("/ws/candles", { websocket: true }, (socket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const symbol = url.searchParams.get("symbol") || "BINANCE:BTCUSDT";
    const timeframe = (url.searchParams.get("timeframe") || "1") as Timeframe;

    const send = (payload: unknown): void => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
    };

    let watcher: { stop(): void } | null = null;
    let closed = false;

    watchCandles(
      { symbol, timeframe, count: 2 },
      {
        onData: (candles) => {
          const last = candles.at(-1);
          if (last) send({ type: "candle", symbol, candle: last });
        },
        onError: (err) => send({ type: "error", message: err.message }),
      },
    )
      .then((w) => {
        // The client may have left before the upstream subscription came up.
        if (closed) w.stop();
        else watcher = w;
      })
      .catch((err: Error) => {
        send({ type: "error", message: err.message });
        socket.close();
      });

    socket.on("close", () => {
      closed = true;
      watcher?.stop();
    });
  });

  return app;
}
