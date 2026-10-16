// Footprint aggregation — pure. Trades land in the bar whose time span contains them and in the
// price level `floor(price / tick)`, split into bid volume (taker sold) and ask volume (taker bought).
import type { FootprintBar, FootprintLevel, Trade } from './types';

/** The smallest "nice" step (1, 2, 2.5, 5 × 10^k) that is at least `raw`. */
export function niceStep(raw: number): number {
    if (!(raw > 0) || !Number.isFinite(raw)) return 1;
    const base = 10 ** Math.floor(Math.log10(raw));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * base >= raw * (1 - 1e-9)) return m * base;
    return 10 * base;
}

/** Index of the bar containing `time` in an ascending array of bar open times, or -1 before the first. */
export function barIndexAt(times: readonly number[], time: number): number {
    let lo = 0;
    let hi = times.length - 1;
    let ans = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid]! <= time) {
            ans = mid;
            lo = mid + 1;
        } else hi = mid - 1;
    }
    return ans;
}

/** A tick that gives a bar about `rowsPerBar` rows, from the median range of the given bars. */
export function autoFootprintTick(ranges: readonly number[], price: number, rowsPerBar = 10): number {
    const sorted = ranges.filter((r) => r > 0).sort((a, b) => a - b);
    const median = sorted.length ? sorted[sorted.length >> 1]! : price * 0.001;
    return niceStep(Math.max(median / rowsPerBar, price * 1e-7));
}

/** The mutable volume ledger of one bar, keyed by level. */
export class BarLedger {
    private readonly levels = new Map<number, FootprintLevel>();
    truncated = false;

    constructor(readonly time: number) {}

    add(trade: Trade, tick: number): void {
        const level = Math.floor(trade.price / tick + 1e-9);
        let row = this.levels.get(level);
        if (!row) {
            row = { level, bid: 0, ask: 0 };
            this.levels.set(level, row);
        }
        if (trade.sell) row.bid += trade.qty;
        else row.ask += trade.qty;
    }

    get size(): number {
        return this.levels.size;
    }

    snapshot(): FootprintBar {
        const levels = [...this.levels.values()].sort((a, b) => a.level - b.level).map((l) => ({ ...l }));
        return this.truncated ? { time: this.time, levels, truncated: true } : { time: this.time, levels };
    }
}

/** The point-of-control level of a bar (largest total volume), or -1 for an empty bar. */
export function pocIndex(bar: FootprintBar): number {
    let best = -1;
    let bestVol = -1;
    for (let i = 0; i < bar.levels.length; i += 1) {
        const v = bar.levels[i]!.bid + bar.levels[i]!.ask;
        if (v > bestVol) {
            bestVol = v;
            best = i;
        }
    }
    return best;
}

/**
 * The bar's value area: the contiguous run of levels around the POC that holds `pct` (a
 * fraction) of its volume. Grown the classic way: from the POC, absorb the two levels above or
 * below, whichever pair carries more volume. Returns level numbers, or null for an empty bar.
 */
export function valueArea(bar: FootprintBar, pct: number): { low: number; high: number } | null {
    if (!bar.levels.length) return null;
    const first = bar.levels[0]!.level;
    const last = bar.levels[bar.levels.length - 1]!.level;
    const vol = new Array<number>(last - first + 1).fill(0);
    for (const l of bar.levels) vol[l.level - first] = l.bid + l.ask;
    const total = vol.reduce((s, v) => s + v, 0);
    let poc = 0;
    for (let i = 1; i < vol.length; i += 1) if (vol[i]! > vol[poc]!) poc = i;
    let lo = poc;
    let hi = poc;
    let covered = vol[poc]!;
    while (covered < total * pct && (lo > 0 || hi < vol.length - 1)) {
        const up = (vol[hi + 1] ?? 0) + (vol[hi + 2] ?? 0);
        const down = (vol[lo - 1] ?? 0) + (vol[lo - 2] ?? 0);
        if (hi < vol.length - 1 && (lo === 0 || up >= down)) {
            covered += up;
            hi = Math.min(vol.length - 1, hi + 2);
        } else {
            covered += down;
            lo = Math.max(0, lo - 2);
        }
    }
    return { low: first + lo, high: first + hi };
}

/**
 * Diagonal imbalances: the ask at a level against the bid one level BELOW it (buyers lifting
 * through sellers), and the bid at a level against the ask one level ABOVE it. Returns the
 * level indexes (not array indexes) that are imbalanced on each side.
 */
export function imbalances(bar: FootprintBar, ratio: number): { ask: Set<number>; bid: Set<number> } {
    const byLevel = new Map(bar.levels.map((l) => [l.level, l]));
    const ask = new Set<number>();
    const bid = new Set<number>();
    for (const l of bar.levels) {
        const below = byLevel.get(l.level - 1);
        const above = byLevel.get(l.level + 1);
        if (below && below.bid > 0 && l.ask >= ratio * below.bid) ask.add(l.level);
        if (above && above.ask > 0 && l.bid >= ratio * above.ask) bid.add(l.level);
    }
    return { ask, bid };
}

/** Net aggressor volume of a bar: buying minus selling. */
export function barDelta(bar: FootprintBar): number {
    let d = 0;
    for (const l of bar.levels) d += l.ask - l.bid;
    return d;
}
