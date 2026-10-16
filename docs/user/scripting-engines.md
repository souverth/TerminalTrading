# Scripting engines

**Terminal Trading ships no scripting engine.** It defines the `ScriptingEngine` port, owns the bars,
and routes whatever an engine produces onto panes — but the language runtime itself is
always something you plug in. A bare chart draws candles, drawings and native indicators;
`addIndicator()` without a matching engine raises an actionable error.

There are two ways to get one:

- **install an addon** — [Pine Script](#pine-script-luxalgovela-pinets) today;
- **write your own** — the port is public and documented in
  [adding an engine](../contributing/adding-an-engine.md).

## Pine Script (`@luxalgo/vela-pinets`)

```bash
npm install @luxalgo/vela-pinets pinets
```

`pinets` is the Pine Script runtime the addon executes; it is a peer dependency, so you
install it alongside.

```ts
import { TerminalTrading } from 'terminal-trading';
import { PineEngine } from '@luxalgo/vela-pinets';

const chart = new TerminalTrading('#chart', { symbol: 'BTCUSDT', timeframe: '60' });
chart.registerEngine('pine', new PineEngine());

chart.addIndicator(`//@version=5
indicator("EMA 20", overlay=true)
plot(ta.ema(close, 20), color=color.orange, linewidth=2)`);
```

The addon exports two engines with **identical Pine semantics**:

| Export | Where scripts run | Use it when |
| --- | --- | --- |
| `PineEngine` | the main thread | simplest setup; light scripts |
| `PineWorkerEngine` | a Web Worker | heavy scripts must never block the chart |

`PineWorkerEngine` needs no configuration: the worker source is inlined into the addon's
bundle at build time and spawned from a Blob URL. Under a Content-Security-Policy that
blocks `blob:`, host the worker file yourself and pass
`new PineWorkerEngine({ workerUrl: '/tt-pine-worker.js' })`.

Both engines report `{ streaming: true, visibleRange: true, inputs: true }` — live
incremental re-execution, viewport-dependent scripts, and an inputs schema that drives
the settings dialog. `request.security` (HTF/LTF/cross-symbol, extended-ticker aware)
resolves through Terminal Trading's own cached data feed: the engine never fetches market data.

### In the widget and the workspace

The shells take engine **factories**, keyed by language — one instance per chart, so a
worker engine gets its own thread and dies with its chart:

```ts
import { TerminalTradingWorkspace } from 'terminal-trading/workspace';
import { PineWorkerEngine } from '@luxalgo/vela-pinets';

new TerminalTradingWorkspace('#app', {
    layout: false, // one chart; any grid layout takes the same options
    symbol: 'BTCUSDT',
    engines: { pine: () => new PineWorkerEngine() },
    indicators: [{ name: 'EMA 20', enabled: true, script: '…' }], // manifest entries default to `pine`
});
```

The `engines` factories are instantiated once per chart (each workspace cell gets its
own — a worker engine per chart). See [the workspace](./workspace.md).

### Registering it once, app-wide

`registerDefaultEngine` (from `terminal-trading/plugin`) installs a language for **every**
chart built afterwards — widgets, workspace cells, everything — so feature packages can
wire Pine in once instead of threading an `engines` option through every call site:

```ts
import { registerDefaultEngine } from 'terminal-trading/plugin';
import { PineWorkerEngine } from '@luxalgo/vela-pinets';

registerDefaultEngine('pine', () => new PineWorkerEngine());
```

An explicit `engines` entry still wins for its language.

### Script tag / CDN

The addon publishes browser globals next to Terminal Trading's. **Load order is the contract** —
`terminal-trading.global.js` first, because the addon resolves `terminal-trading` to the page's
`window.TerminalTrading` rather than bundling a second copy of the library:

```html
<script src="terminal-trading.global.js"></script>
<script src="vela-pinets.global.js"></script>
<script>
    const chart = new TerminalTrading.TerminalTrading('#chart', { data: bars, timeframe: '60' });
    chart.registerEngine('pine', new TerminalTradingPinets.PineEngine());
</script>
```

### Licensing

`pinets` is **AGPL-3.0**, so `@luxalgo/vela-pinets` is AGPL-3.0 too. That is precisely
why it is a separate package: Terminal Trading itself stays **Apache-2.0** and contains no Pine code.
Installing the addon brings the AGPL obligations into *your* deployment — decide that
deliberately. If you cannot take them on, write an engine for the language you need
against the port instead.

## Writing your own engine

The port is small — `prepare()` (parse a script: inputs + declaration metadata, no market
data) and `execute()` (return a session handle; emit models through the handlers). Terminal Trading
owns the bars and passes them in; the engine never fetches candles.

[**Adding an engine**](../contributing/adding-an-engine.md) is the full contract, and
`playground/demo-engine.ts` in this repo is a ~300-line working engine you can read in
one sitting — the one the Terminal Trading playground itself runs.

## Related

- [Adding an engine](../contributing/adding-an-engine.md) — the port, in full.
- [The plugin SDK](../contributing/plugin-sdk.md) — `registerDefaultEngine` and the model
  vocabulary engines build with.
- [Native indicators](./api-reference.md) — core-computed indicators (volume, VPVR) that
  need no engine at all.
