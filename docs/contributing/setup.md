# Local Setup

> **Status:** Stable · **Verified against code:** 2026-10-16 · **Audience:** contributors and AI agents

This page gets you from a fresh clone to a working Terminal Trading build. You install and build it **from source**.

## Prerequisites

- **Node.js and npm.** There is no pinned Node version in this repo (no `.nvmrc`, no `engines` range), so a current Node.js LTS and its bundled npm is the safe choice. If a pin is added later, treat that as the source of truth.
- **No scripting-engine dependency.** Terminal Trading ships no engine and has none installed here: engines are separate packages behind the `ScriptingEngine` port (Pine Script: `@luxalgo/vela-pinets`). The playground carries its own tiny demo engine (`playground/demo-engine.ts`) so the indicator path is exercisable with zero extra installs.

> **Standing rule:** Do **not** edit a sibling package (the engine addon, or any other) from within Terminal Trading work without explicit permission. Concurrent edits across packages cause conflicts. If a change seems to require touching a sibling, stop and ask first. See [workflow.md](./workflow.md) for where changes belong by layer.

## Clone and install

1. Clone the repository.
2. Install Terminal Trading's dependencies with `npm install`. Everything resolves normally from the npm registry — no sibling checkout or extra build step is required.

That is the whole bootstrap. Everything else is a thin npm script.

## The toolchain

Terminal Trading keeps a deliberately thin set of npm scripts. Each maps to one well-known tool, so there is little bespoke build machinery to learn.

| Task | Command | What it does |
| --- | --- | --- |
| **build** | `npm run build` | Bundles the library and the browser bundle (tsup). |
| **dev** / watch | `npm run dev` | Rebuilds on change (tsup `--watch`) for tight iteration. |
| **typecheck** | `npm run typecheck` | Type-checks the source with no emit (tsc `--noEmit`). |
| **lint** | `npm run lint` | Lints the source (eslint). This also enforces the architecture boundaries. |
| **test** | `npm test` | Runs the fast Node unit suite once (vitest). |
| **test:watch** | `npm run test:watch` | Re-runs the unit suite on change (vitest). |
| **playground** | `npm run playground` | Serves `playground/` (vite, `http://localhost:5190`, no build step, HMR). The index links two pages mounting straight from `src/`: `/widget.html` (the single-chart widget) and `/workspace.html` (the multi-chart workspace). The widget page needs no server: its Binance provider talks to the public API directly. The workspace page also expects a local server on port 3000; see [workflow.md](./workflow.md#the-playground). |

> One npm quirk worth internalizing: **`test` runs as `npm test`**, while everything else needs the `run` keyword (`npm run build`, `npm run lint`, and so on).

The four scripts that define "done" — **typecheck, lint, test, build** — are covered in [workflow.md](./workflow.md). Testing tiers are in [testing.md](./testing.md). Hands-on debugging is in [debugging.md](./debugging.md).

## Two artifacts from one source

A single source tree produces **two kinds of build artifacts** (`tsup.config.ts` defines three builds), and knowing which is which prevents a lot of confusion:

- **The library build** is what application code consumes. It ships ESM, CJS, and type definitions for the main entry and the subpath entries (`plugin`, `ui`, `widget`, `workspace`, and the `providers/*` data providers). Packages listed under `dependencies` stay external imports that the consumer's package manager resolves. Terminal Trading bundles no scripting engine, so none is linked. The default backends still wire themselves through the composition root; you supply your own only when you deliberately replace a default (see [workflow.md](./workflow.md#where-to-make-a-change-by-layer)).
- **The browser bundles** are self-contained IIFEs that **bundle all dependencies** and expose the library as a global (`window.TerminalTrading`). They come in a readable development form (`terminal-trading.global.js`) and a minified form (`terminal-trading.global.min.js`). An engine addon loads **after** one of them and resolves `terminal-trading` to that same `window.TerminalTrading`, so there is never a second copy of the library.

The **playground serves `src/` directly** (vite): changes appear on save with no build step. The browser bundle exists for CDN-style consumers of the library, not for development.
