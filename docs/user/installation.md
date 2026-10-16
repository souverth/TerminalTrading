# Installation

Terminal Trading is not published on npm yet. Install it from the repository, which builds the package on install.

## Install from the repository

```bash
npm install github:souverth/TerminalTrading
```

The package ships ESM, CJS, and type declarations. Import the headless chart from the
root entry, and the other layers from their subpaths:

```js
import { TerminalTrading } from 'terminal-trading';
import { TerminalTradingWorkspace } from 'terminal-trading/workspace';
import { BinanceProvider } from 'terminal-trading/providers/binance';
```

| Entry | What it exports |
|---|---|
| `terminal-trading` | The headless chart core, native renderer, drawings, ports, plugin SDK re-exports. |
| `terminal-trading/workspace` | The full chart app (one chart or a multi-chart grid). |
| `terminal-trading/ui` | The component kit and `KeymapManager`. |
| `terminal-trading/plugin` | The extension SDK (chart types, renderer layers, widget contributions). |
| `terminal-trading/providers/binance` · `/coinbase` · `/hyperliquid` | Ready-made data providers. |

## Browser bundle (script tag)

For script-tag usage without a bundler, the package ships self-contained browser builds:

- `dist/terminal-trading.global.js` is the readable development build.
- `dist/terminal-trading.global.min.js` is the minified build to reference in production.

Either file attaches the library's public API, including the bundled providers, to
`window.TerminalTrading`. Scripting-engine addons (e.g. `vela-pinets.global.js`) load after it and
resolve `terminal-trading` to that same global, so the library is never loaded twice.

## What you install vs. what you supply

Terminal Trading is built around swappable **layers**. The core is small; you opt into the parts you need.

| Piece | Status | Notes |
|---|---|---|
| **Core + native renderer** | Included, default | Renders candles out of the box. |
| **Scripting engine** | **Not shipped** | Install an addon (Pine Script: `@luxalgo/vela-pinets` + its `pinets` peer) or write one against the port. See [Scripting engines](./scripting-engines.md). Candles work without any. |
| **Provider data feed** | Included | Used when you fetch bars instead of supplying them. |

- **Candles work with zero extra setup.** The native renderer is the default: WebGL2
  with a canvas2d fallback.
- **Indicators are opt-in.** They require a scripting engine (a separate package you
  install) **and** that engine registered on the chart. See
  [Scripting engines](./scripting-engines.md) and [quickstart.md](./quickstart.md).

## Recommended first run

For your first run, use **offline data**: pass an array of bars via the `data` option.
No network, no API key, fully reproducible. See [quickstart.md](./quickstart.md), then
[examples.md](./examples.md) for static and live setups.
