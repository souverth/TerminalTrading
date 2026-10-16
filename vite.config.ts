import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Playground server: `npm run playground` serves playground/ with Terminal Trading imported STRAIGHT
 * from src/ (no build step, hot reload). Terminal Trading ships no scripting engine, so the page
 * registers `@luxalgo/vela-pinets` (Pine Script via PineTS) next to its own tiny demo
 * engine (playground/demo-engine.ts).
 *
 * `@luxalgo/vela-pinets` imports the `terminal-trading` package root as a peer; alias it to
 * src/ so the engine and the playground share ONE copy of the SDK registries.
 */
export default defineConfig({
    root: 'playground',
    resolve: {
        alias: [{ find: /^@luxalgo\/vela$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }],
    },
    server: { port: 5190, strictPort: true },
});
