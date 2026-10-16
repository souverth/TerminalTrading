// The footprint data engine: gathers aggressor trades for the newest bars (REST history) and the
// forming bar (WebSocket), aggregates them per price level and pushes the result to the
// `footprint` renderer layer. Only the newest `historyBars` bars carry footprints — older ones
// stay slim candles — so a busy market cannot exhaust Binance's public rate limit.
import type { SeriesDataEngine, SeriesDataEngineHost } from '../registry';
import { BarLedger, autoFootprintTick, barIndexAt } from './aggregate';
import { fetchTrades, streamTrades, TradeFeedError, type TradeStream } from './binance-trades';
import { FOOTPRINT_DEFAULTS, footprintSettingsOf, type FootprintPayload, type FootprintSettings, type Trade } from './types';

const CONCURRENCY = 2;
const PUSH_THROTTLE_MS = 200;

export function createFootprintEngine(): SeriesDataEngine {
    let host: SeriesDataEngineHost | null = null;
    let settings: FootprintSettings = { ...FOOTPRINT_DEFAULTS };
    let ticker: string | null = null;
    let tick = 0;
    let ledgers = new Map<number, BarLedger>();
    let queued: number[] = [];
    const inflight = new Set<number>();
    let abort = new AbortController();
    let stream: TradeStream | null = null;
    let status: FootprintPayload['status'] = 'ok';
    let message: string | undefined;
    let active = false;
    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    /** Highest aggregate-trade id folded into the forming bar by REST — WebSocket trades at or below it are duplicates. */
    let formingMaxId = -1;
    let formingTime = -1;

    const bars = (): ReturnType<SeriesDataEngineHost['bars']> => host?.bars() ?? [];

    function span(i: number): number {
        const b = bars();
        const next = b[i + 1]?.time;
        if (next !== undefined) return next - b[i]!.time;
        const prev = b[i - 1]?.time;
        return prev !== undefined ? b[i]!.time - prev : 60_000;
    }

    function chooseTick(): number {
        if (settings.tickSize > 0) return settings.tickSize;
        const b = bars();
        const recent = b.slice(-60);
        const last = recent[recent.length - 1];
        return autoFootprintTick(recent.map((x) => x.high - x.low), last?.close ?? 1);
    }

    function payload(): FootprintPayload {
        return { status, message, tick, bars: [...ledgers.values()].filter((l) => l.size > 0).map((l) => l.snapshot()) };
    }

    function push(now = false): void {
        if (!host || !active) return;
        if (now) {
            if (pushTimer) clearTimeout(pushTimer);
            pushTimer = undefined;
            host.pushData(payload());
            return;
        }
        if (pushTimer) return;
        pushTimer = setTimeout(() => {
            pushTimer = undefined;
            host?.pushData(payload());
        }, PUSH_THROTTLE_MS);
    }

    function pending(): void {
        const b = bars();
        host?.pushPending([...inflight, ...queued].map((t): [number, number] => {
            const i = barIndexAt(b.map((x) => x.time), t);
            return [t, t + (i >= 0 ? span(i) : 0)];
        }));
    }

    function fail(e: unknown): void {
        if (abort.signal.aborted) return;
        status = 'error';
        message = e instanceof TradeFeedError || e instanceof Error ? e.message : 'Footprint data is unavailable.';
        queued = [];
        push(true);
    }

    async function load(time: number): Promise<void> {
        if (!ticker) return;
        const b = bars();
        const i = barIndexAt(b.map((x) => x.time), time);
        if (i < 0) return;
        const end = time + span(i);
        const isForming = i === b.length - 1 && !!host?.live;
        const ledger = new BarLedger(time);
        ledgers.set(time, ledger);
        inflight.add(time);
        pending();
        try {
            const page = await fetchTrades(ticker, time, end, abort.signal);
            for (const t of page.trades) ledger.add(t, tick);
            ledger.truncated = page.truncated;
            if (isForming) {
                formingTime = time;
                formingMaxId = page.trades.reduce((m, t) => Math.max(m, t.id), -1);
            }
        } catch (e) {
            ledgers.delete(time);
            fail(e);
        } finally {
            inflight.delete(time);
            pending();
            push();
            pump();
        }
    }

    function pump(): void {
        while (active && inflight.size < CONCURRENCY && queued.length) load(queued.shift()!).catch(fail);
    }

    /** Queue every bar in the newest `historyBars` that has no ledger yet (newest first). */
    function schedule(): void {
        if (!active || status === 'unsupported') return;
        const b = bars();
        const from = Math.max(0, b.length - settings.historyBars);
        const want: number[] = [];
        for (let i = b.length - 1; i >= from; i -= 1) {
            const t = b[i]!.time;
            if (!ledgers.has(t) && !inflight.has(t) && !queued.includes(t)) want.push(t);
        }
        queued.push(...want);
        pending();
        pump();
    }

    function onTrade(t: Trade): void {
        const b = bars();
        if (!b.length) return;
        const i = b.length - 1;
        const time = b[i]!.time;
        if (t.time < time || t.time >= time + span(i)) return;
        // Skip until the REST history of the forming bar is in, then drop what it already counted.
        if (formingTime !== time || t.id <= formingMaxId) return;
        let ledger = ledgers.get(time);
        if (!ledger) {
            ledger = new BarLedger(time);
            ledgers.set(time, ledger);
        }
        ledger.add(t, tick);
        formingMaxId = t.id;
        push();
    }

    function reset(): void {
        abort.abort();
        abort = new AbortController();
        stream?.close();
        stream = null;
        ledgers = new Map();
        queued = [];
        inflight.clear();
        formingTime = -1;
        formingMaxId = -1;
        status = 'ok';
        message = undefined;
    }

    function begin(): void {
        if (!host) return;
        const r = host.data.resolve(host.symbol);
        if (!r || r.provider !== 'binance') {
            status = 'unsupported';
            message = 'Footprint needs the Binance data provider (trade-level volume).';
            ticker = null;
            push(true);
            return;
        }
        ticker = r.ticker;
        tick = chooseTick();
        schedule();
        if (host.live) stream = streamTrades(ticker, onTrade);
        push(true);
    }

    return {
        onSettings(values) {
            const next = footprintSettingsOf(values);
            const refetch = next.tickSize !== settings.tickSize || next.historyBars !== settings.historyBars;
            settings = next;
            if (refetch && host && active) {
                reset();
                begin();
            }
        },
        start(h) {
            host = h;
            active = true;
            begin();
        },
        suspend() {
            active = false;
            reset();
        },
        resume() {
            active = true;
            begin();
        },
        stop() {
            active = false;
            reset();
            if (pushTimer) clearTimeout(pushTimer);
            host = null;
        },
        onBars() {
            // A new bar opens at the tail: fetch it, and let the previous forming bar settle.
            schedule();
        },
    };
}
