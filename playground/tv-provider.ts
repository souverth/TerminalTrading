// Vela data provider backed by the local TradingView API server (~/code/trading):
// REST `/api/candles` for history and WebSocket `/ws/candles` for the live bar.
// Serves anything TradingView does — forex, metals, indices, stocks — as `EXCHANGE:SYMBOL`.
import type { OHLCV } from "../src/core/model/ohlcv";
import type { BarRange, SymbolInfo } from "../src/core/ports/MarketDataFeed";
import type {
  DataProvider,
  ProviderInfo,
  SymbolDescriptor,
} from "../src/core/ports/DataProvider";
import type { Unsubscribe } from "../src/core/util/types";

const SYMBOLS: Array<[string, string, string]> = [
  ["OANDA:XAUUSD", "Gold / US Dollar", "commodity"],
  ["OANDA:XAGUSD", "Silver / US Dollar", "commodity"],
  ["OANDA:EURUSD", "Euro / US Dollar", "forex"],
  ["OANDA:GBPUSD", "British Pound / US Dollar", "forex"],
  ["OANDA:USDJPY", "US Dollar / Japanese Yen", "forex"],
  ["OANDA:USDCHF", "US Dollar / Swiss Franc", "forex"],
  ["OANDA:AUDUSD", "Australian Dollar / US Dollar", "forex"],
  ["OANDA:NZDUSD", "New Zealand Dollar / US Dollar", "forex"],
  ["OANDA:USDCAD", "US Dollar / Canadian Dollar", "forex"],
  ["OANDA:EURGBP", "Euro / British Pound", "forex"],
  ["OANDA:EURJPY", "Euro / Japanese Yen", "forex"],
  ["OANDA:GBPJPY", "British Pound / Japanese Yen", "forex"],
  ["TVC:DXY", "US Dollar Index", "index"],
];

interface ServerCandle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Minute timeframes TradingView serves natively. */
const NATIVE_MINUTES = [1, 3, 5, 15, 30, 45, 60, 120, 180, 240];

/** Aggregate ascending sub-bars into `bucketMs` buckets aligned to the epoch. */
function aggregate(sub: OHLCV[], bucketMs: number): OHLCV[] {
  const buckets = new Map<number, OHLCV>();
  for (const b of sub) {
    const key = Math.floor(b.time / bucketMs) * bucketMs;
    const cur = buckets.get(key);
    if (!cur) {
      buckets.set(key, { time: key, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 });
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume = (cur.volume ?? 0) + (b.volume ?? 0);
    }
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

const toBar =(c: ServerCandle): OHLCV => ({
  time: c.time * 1000,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
  volume: c.volume ?? 0,
});

export class TradingViewServerProvider implements DataProvider {
  constructor(private readonly base = "http://localhost:3000") {}

  info(): ProviderInfo {
    return {
      name: "tv",
      displayName: "TradingView",
      requiresApiKey: false,
      supportedTimeframes: ["1", "3", "5", "15", "30", "45", "60", "120", "180", "240", "D", "W", "M"],
      capabilities: { enumerate: true, stream: true, symbolInfo: true },
    };
  }

  async getBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    try {
      const limit = range.limit ?? 500;
      const minutes = /^\d+$/.test(timeframe) ? Number(timeframe) : null;
      if (minutes !== null && !NATIVE_MINUTES.includes(minutes)) {
        // Timeframe TradingView doesn't serve (e.g. 10m): fetch a divisor and aggregate.
        const sub = NATIVE_MINUTES.filter((m) => m < minutes && minutes % m === 0).pop();
        if (!sub) {
          console.warn(`[vela] TradingView: timeframe "${timeframe}" is not supported.`);
          return [];
        }
        const ratio = minutes / sub;
        const bars = await this.fetchBars(ticker, String(sub), { ...range, limit: limit * ratio + ratio });
        const agg = aggregate(bars, minutes * 60_000);
        return agg.length > limit ? agg.slice(-limit) : agg;
      }
      return await this.fetchBars(ticker, timeframe, range);
    } catch (e) {
      console.warn(`[vela] TradingView: failed to fetch ${ticker} ${timeframe} — ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  /** One server call. `range.to` pages backwards (lazy load); `range.from` loads back to that time. */
  private async fetchBars(ticker: string, timeframe: string, range: BarRange): Promise<OHLCV[]> {
    const params = new URLSearchParams({ symbol: ticker, timeframe });
    if (range.from != null) params.set("from", String(Math.floor(range.from / 1000)));
    else params.set("count", String(Math.min(range.limit ?? 500, 5000)));
    if (range.to != null) params.set("to", String(Math.floor(range.to / 1000)));
    // The server opens one TradingView socket per call; a burst of cells loading together
    // can make some fail with 5xx, so retry those with a short backoff.
    let res = await fetch(`${this.base}/api/candles?${params}`);
    for (let attempt = 1; !res.ok && res.status >= 500 && attempt <= 3; attempt++) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      res = await fetch(`${this.base}/api/candles?${params}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { candles?: ServerCandle[] };
    const byTime = new Map<number, OHLCV>();
    for (const c of data.candles ?? []) byTime.set(c.time * 1000, toBar(c));
    return [...byTime.values()].sort((a, b) => a.time - b.time);
  }

  async getSymbolInfo(ticker: string): Promise<SymbolInfo | undefined> {
    const [prefix, name = ticker] = ticker.includes(":") ? ticker.split(":") : ["", ticker];
    const row = SYMBOLS.find(([t]) => t === ticker);
    return {
      ticker,
      tickerid: ticker,
      prefix,
      description: row?.[1] ?? name,
      type: row?.[2] ?? "forex",
      mintick: name.includes("JPY") ? 0.001 : name.startsWith("XA") ? 0.001 : 0.00001,
      pricescale: name.includes("JPY") || name.startsWith("XA") ? 1000 : 100000,
      // Strategy position sizing reads these (`syminfo.pointvalue` / `syminfo.mincontract`).
      // Assumption, not TradingView's own values: 1 unit of the instrument, whole units.
      pointvalue: 1,
      mincontract: 1,
      timezone: "Etc/UTC",
      session: "24x7",
    };
  }

  async listSymbols(): Promise<SymbolDescriptor[]> {
    return SYMBOLS.map(([ticker, description, type]) => ({ ticker, description, type }));
  }

  subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void): Unsubscribe {
    let closed = false;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const wsBase = this.base.replace(/^http/, "ws");

    const open = (): void => {
      if (closed) return;
      ws = new WebSocket(
        `${wsBase}/ws/candles?symbol=${encodeURIComponent(ticker)}&timeframe=${encodeURIComponent(timeframe)}`,
      );
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; candle?: ServerCandle };
          if (msg.type === "candle" && msg.candle) onBar(toBar(msg.candle));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(open, 3000);
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* already closed */
        }
      };
    };
    open();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }
}
