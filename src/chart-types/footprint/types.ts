import { BEARISH, BULLISH } from '../../core/palette';

export const FOOTPRINT_ID = 'footprint';

/** One aggressor trade. `sell` = the taker sold (hit the bid); otherwise the taker bought (lifted the ask). */
export interface Trade {
    id: number;
    time: number;
    price: number;
    qty: number;
    sell: boolean;
}

/** Volume traded at one price level of a bar, split by aggressor side. */
export interface FootprintLevel {
    /** Level index: the level covers prices `[level * tick, (level + 1) * tick)`. */
    level: number;
    bid: number;
    ask: number;
}

export interface FootprintBar {
    /** The bar's open time (epoch ms) — the key the layer matches against the chart's bars. */
    time: number;
    /** Ascending by level. */
    levels: FootprintLevel[];
    /** True while the history fetch for this bar stopped early (a very busy bar). */
    truncated?: boolean;
}

/** The payload the data engine pushes to the footprint layer. */
export interface FootprintPayload {
    status: 'ok' | 'unsupported' | 'error';
    message?: string;
    tick: number;
    bars: FootprintBar[];
}

export interface FootprintSettings {
    /** Price step per row; 0 = automatic. */
    tickSize: number;
    /** How many of the newest bars get footprint data (older bars stay as slim candles). */
    historyBars: number;
    showText: boolean;
    showImbalance: boolean;
    imbalanceRatio: number;
    showPoc: boolean;
    showValueArea: boolean;
    valueAreaPct: number;
    showDock: boolean;
    bidColor: string;
    askColor: string;
    pocColor: string;
}

export const FOOTPRINT_DEFAULTS: FootprintSettings = {
    tickSize: 0,
    historyBars: 40,
    showText: true,
    showImbalance: true,
    imbalanceRatio: 3,
    showPoc: true,
    showValueArea: true,
    valueAreaPct: 70,
    showDock: true,
    bidColor: BEARISH,
    askColor: BULLISH,
    pocColor: '#ffffff',
};

export function footprintSettingsOf(raw: Record<string, unknown>): FootprintSettings {
    const out = { ...FOOTPRINT_DEFAULTS } as Record<string, unknown>;
    for (const k of Object.keys(FOOTPRINT_DEFAULTS) as Array<keyof FootprintSettings>) {
        const v = raw[k];
        if (typeof v === typeof FOOTPRINT_DEFAULTS[k]) out[k] = v;
    }
    return out as unknown as FootprintSettings;
}
