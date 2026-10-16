// Binance public aggregated-trade feed: REST history for the bars already closed, a WebSocket
// for the forming one. No API key; mirrors the provider's spot / `.P` perpetual routing.
import { parseTicker } from '../../data/providers/binance/BinanceProvider';
import type { Trade } from './types';

const SPOT_REST = ['https://api.binance.com/api/v3', 'https://api.binance.us/api/v3'];
const FUTURES_REST = ['https://fapi.binance.com/fapi/v1'];
const SPOT_WS = 'wss://stream.binance.com:9443/ws';
const FUTURES_WS = 'wss://fstream.binance.com/ws';
const PAGE = 1000;
/** Upper bound on pages per bar, so one very busy bar cannot exhaust the rate limit. */
export const MAX_PAGES_PER_BAR = 25;

interface RawAggTrade {
    a: number;
    p: string;
    q: string;
    T: number;
    m: boolean;
}

export const toTrade = (r: RawAggTrade): Trade => ({ id: r.a, time: r.T, price: Number(r.p), qty: Number(r.q), sell: r.m });

export class TradeFeedError extends Error {}

async function getJson(bases: string[], path: string, signal: AbortSignal): Promise<RawAggTrade[]> {
    let lastError: unknown;
    for (const base of bases) {
        try {
            const res = await fetch(`${base}${path}`, { signal });
            if (res.status === 429 || res.status === 418) throw new TradeFeedError('Binance rate limit reached — try again in a minute.');
            if (!res.ok) throw new TradeFeedError(`Binance returned ${res.status} for aggregated trades.`);
            return (await res.json()) as RawAggTrade[];
        } catch (e) {
            if (signal.aborted) throw e;
            if (e instanceof TradeFeedError && /rate limit/.test(e.message)) throw e;
            lastError = e;
        }
    }
    throw lastError instanceof Error ? lastError : new TradeFeedError('Binance aggregated trades are unreachable.');
}

export interface TradePage {
    trades: Trade[];
    /** True when the page limit stopped the fetch before `endMs` was reached. */
    truncated: boolean;
}

/** Aggregated trades of `[startMs, endMs)` for a Terminal Trading ticker (`BTCUSDT`, `BTCUSDT.P`). */
export async function fetchTrades(ticker: string, startMs: number, endMs: number, signal: AbortSignal): Promise<TradePage> {
    const { apiSymbol, isFutures } = parseTicker(ticker);
    const bases = isFutures ? FUTURES_REST : SPOT_REST;
    const out: Trade[] = [];
    let path = `/aggTrades?symbol=${apiSymbol}&startTime=${startMs}&limit=${PAGE}`;
    for (let page = 0; page < MAX_PAGES_PER_BAR; page += 1) {
        const rows = await getJson(bases, path, signal);
        for (const r of rows) {
            if (r.T >= endMs) return { trades: out, truncated: false };
            out.push(toTrade(r));
        }
        if (rows.length < PAGE) return { trades: out, truncated: false };
        path = `/aggTrades?symbol=${apiSymbol}&fromId=${rows[rows.length - 1]!.a + 1}&limit=${PAGE}`;
    }
    return { trades: out, truncated: true };
}

export interface TradeStream {
    close(): void;
}

/** Live aggregated trades; reconnects after a drop until `close()`. */
export function streamTrades(ticker: string, onTrade: (t: Trade) => void): TradeStream {
    const { apiSymbol, isFutures } = parseTicker(ticker);
    const url = `${isFutures ? FUTURES_WS : SPOT_WS}/${apiSymbol.toLowerCase()}@aggTrade`;
    let socket: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const open = (): void => {
        if (closed || typeof WebSocket === 'undefined') return;
        socket = new WebSocket(url);
        socket.onmessage = (ev) => {
            try {
                const m = JSON.parse(String(ev.data)) as { a: number; p: string; q: string; T: number; m: boolean };
                if (m && m.a !== undefined) onTrade(toTrade(m));
            } catch {
                /* ignore a malformed frame */
            }
        };
        socket.onclose = () => {
            if (!closed) timer = setTimeout(open, 2000);
        };
    };
    open();
    return {
        close() {
            closed = true;
            if (timer) clearTimeout(timer);
            socket?.close();
        },
    };
}
