# Market-data server

A small local server that gives the playground's `tv` data provider (`playground/tv-provider.ts`)
its history and live bars. It wraps the community package
[`@mathieuc/tradingview`](https://github.com/Mathieu2301/TradingView-API), which talks to an
**unofficial** upstream. Keep it for local development; it has no authentication.

## Run

```bash
cd server
npm install
npm run dev        # http://127.0.0.1:3000
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Listen port. The provider expects `3000`. |
| `HOST` | `127.0.0.1` | Listen address. Set `0.0.0.0` only on a network you trust. |
| `UPSTREAM_CONCURRENCY` | `3` | Maximum simultaneous upstream calls. |

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness check. |
| `GET /api/candles?symbol=OANDA:XAUUSD&timeframe=60&count=500` | History. `from` and `to` are Unix seconds; `from` loads back to that time and ignores `count`. `count` is capped at 5000. |
| `GET /api/search?query=gold&type=` | Symbol search. |
| `GET /api/quote?symbol=` | Latest quote. |
| `GET /api/symbol-info?symbol=` | Instrument metadata. |
| `WS /ws/candles?symbol=&timeframe=` | Live forming bar as `{ "type": "candle", "candle": {...} }`. |

Candles use Unix seconds for `time`, which is what the provider expects.
