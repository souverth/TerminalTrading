# Debugging

Most Vela™ bugs reduce to one question: **is it the data or engine side, or the renderer side?** Answer that first, then drill into the side at fault.

## Step 1 — reproduce it with known data

A bug that drifts with live market data is hard to pin down. Take the market out of the loop:

- Pass your own bars through the `data` option (an `OHLCV[]`). It replaces the provider entirely: no fetches, no live ticks, and every run is identical.
- In a unit test, inject a fake feed through `deps.dataFeed`. See [testing.md](./testing.md).

If the bug disappears with fixed bars, the cause is in the provider or in how live ticks arrive. If it stays, continue.

## Step 2 — split engine from renderer

To rule the renderer out, drive the core with a **fake renderer** and a **fake engine** in a unit test, then inspect what the core hands to the renderer. The neutral model is the only thing that crosses the port, so you can assert on it directly.

- If the model is already wrong, the bug is **upstream of the renderer**: the script, the engine, or the data feeding it.
- If the model is correct and the chart looks wrong, the bug is **in or after the renderer**.

Engines other than the playground's demo engine live in separate packages. To debug one, use that package's own tooling.

## Step 3 — debug in the playground

When the model is right but the picture is not, debug in the browser. Run `npm run playground`; it serves `src/` directly (vite HMR), and devtools shows the original TypeScript through the dev server's source maps.

The running instances are reachable from the console:

| Page | Handle |
| --- | --- |
| `widget.html` | `window.ws` |
| `workspace.html` | `window.__ws` |

Use `ws.cell(id)?.chart` to reach a single chart. See [workflow.md](./workflow.md#the-playground) for the pages and the servers they need.

## Capability "lies" — the silent failure mode

The core **trusts the capability flags** each backend declares (engines declare streaming, viewport-awareness, inputs; renderers declare panes, fills, backgrounds, horizontal lines, bar coloring, markers, drawings, tables, per-point color, inputs UI). Nothing re-checks them at runtime.

A backend whose declared capabilities do not match its real behavior produces **silent wrong output**: no error, just a chart that is blank, stale, or subtly off. When something renders **blank or stale**, check these two things first:

1. **Capability flags** — does the backend do what it claims? A renderer that declares support it lacks, or an engine that claims streaming it does not do, fails quietly.
2. **Value patch versus remount** — is the update arriving on the right path? Live ticks and viewport changes flow as **value patches** to existing elements, matched by stable, content-addressed ids. An input edit is a **structural remount**. A patch landing where a remount was needed, or the reverse, shows up as stale or missing visuals rather than an error.

These two account for most "it renders nothing and throws nothing" reports. Check them before you suspect the data or rewrite logic.

## Putting it together

1. Reproduce with fixed bars so the bug is deterministic.
2. Decide engine versus renderer with fakes in a unit test.
3. If it is the renderer, debug in the playground through `ws` or `__ws`.
4. For blank or stale output, check capability flags and patch versus remount first.
5. Once you find the cause, write the failing test before you fix it.

See [testing.md](./testing.md) for the two test tiers and [workflow.md](./workflow.md) for the quality gate.
