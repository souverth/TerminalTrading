import type { BasePaintingModulation, RendererLayerArgs, RendererLayerInstance } from '../../renderers/native/layers';
import { imbalances, pocIndex, valueArea } from './aggregate';
import { FOOTPRINT_ID, footprintSettingsOf, type FootprintBar, type FootprintLevel, type FootprintPayload, type FootprintSettings } from './types';

function withAlpha(hex: string, alpha: number): string {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1]!, 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Short enough for a half-bar cell: 1234 gives "1.2k", 0.5 gives "0.5", 12 gives "12". */
export function compactVolume(v: number): string {
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
    if (v >= 100) return v.toFixed(0);
    if (v >= 10) return v.toFixed(1);
    return v.toFixed(2).replace(/\.?0+$/, '') || '0';
}

const isPayload = (d: unknown): d is FootprintPayload => !!d && typeof d === 'object' && Array.isArray((d as FootprintPayload).bars);
const FADE_MS = 280;

/**
 * The footprint renderer layer. Per bar, a column of price levels: sell (bid) volume grows left
 * of the bar's centre, buy (ask) volume grows right, each as a bar proportional to its size.
 * The busiest price is outlined, lopsided prices are filled solid, and the net delta prints
 * under the bar. Zoomed out, the cells collapse into a symmetric volume silhouette. Hovering a
 * row highlights it and opens a detail card. While trades load, a spiral of stacked layers
 * turns in the middle of the pane and each pending bar pulses as a placeholder.
 */
export function createFootprintLayer(): RendererLayerInstance {
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let index = new Map<number, FootprintBar>();
    let indexed: unknown = null;
    /** When each bar's footprint first painted (frame clock, ms); drives the fade-in. */
    const shownAt = new Map<number, number>();
    let busy = false;

    return {
        animating: () => busy,
        mount(c) {
            canvas = c;
            ctx = c.getContext('2d');
        },
        destroy() {
            canvas = null;
            ctx = null;
            index = new Map();
        },
        modulateBase(args: RendererLayerArgs): BasePaintingModulation | null {
            return args.priceStyle === FOOTPRINT_ID ? { gridAlpha: 0.6 } : null;
        },
        render(args: RendererLayerArgs) {
            if (!ctx || !canvas) return;
            const { bars, coords, scale, bounds, theme, priceStyle } = args;
            const dpr = coords.dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            busy = false;
            if (priceStyle !== FOOTPRINT_ID || bars.length === 0 || bounds.height <= 0) return;

            // No payload yet (the engine has not started) reads as "nothing loaded", so the
            // pending bars below still spiral.
            const data: FootprintPayload = isPayload(args.data) ? args.data : { status: 'ok', tick: 0, bars: [] };
            if (data.status !== 'ok') {
                ctx.fillStyle = withAlpha(theme.textColor, 0.7);
                ctx.font = `13px ${theme.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.fillText(data.message ?? 'Footprint data is unavailable.', coords.width / 2, bounds.top + 28);
                return;
            }
            if (indexed !== args.data) {
                indexed = args.data;
                index = new Map(data.bars.map((b) => [b.time, b]));
            }

            const s = footprintSettingsOf(args.settings);
            const range = coords.visibleLogicalRange();
            const i0 = Math.max(0, Math.floor(range.from));
            const i1 = Math.min(bars.length - 1, Math.ceil(range.to));
            const tick = data.tick;
            const yOf = (level: number): number => coords.priceToY(level * tick, scale, bounds);
            const rowH = Math.abs(yOf(0) - yOf(1));
            const barW = Math.max(1, coords.pxPerBar() * 0.92);
            const half = barW / 2;

            let maxVol = 0;
            let maxTotal = 0;
            for (let i = i0; i <= i1; i += 1) {
                const fb = index.get(bars[i]!.time);
                if (!fb) continue;
                for (const l of fb.levels) {
                    maxVol = Math.max(maxVol, l.bid, l.ask);
                    maxTotal = Math.max(maxTotal, l.bid + l.ask);
                }
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, bounds.top, coords.width, bounds.height);
            ctx.clip();

            // Bars without a footprint (older, or still loading) keep their candle.
            for (let i = i0; i <= i1; i += 1) {
                if (index.has(bars[i]!.time)) continue;
                const lane = candleLane(coords.logicalToX(i), barW);
                paintCandle(ctx, args, i, lane.candleX, lane.candleW);
            }

            // Bars still being fetched show a turning spiral of layers until their data lands.
            if (args.pending.length) {
                const waiting: number[] = [];
                for (let i = i0; i <= i1; i += 1) {
                    const t = bars[i]!.time;
                    if (!index.has(t) && args.pending.some(([a, b]) => t >= a && t < b)) waiting.push(i);
                }
                for (const i of waiting) paintLoadingColumn(ctx, args, i);
                if (waiting.length) busy = true;
            }

            if (maxVol > 0) {
                const hover = hoverOf(args, bars, index, i0, i1, tick);
                for (let i = i0; i <= i1; i += 1) {
                    const fb = index.get(bars[i]!.time);
                    if (!fb) continue;
                    const born = shownAt.get(fb.time) ?? args.nowMs;
                    shownAt.set(fb.time, born);
                    const fade = Math.min(1, (args.nowMs - born) / FADE_MS);
                    if (fade < 1) busy = true;
                    ctx.globalAlpha = fade;
                    paintBar(ctx, fb, i, args, s, { tick, rowH, half, barW, maxVol, maxTotal, yOf, hoverLevel: hover?.index === i ? hover.level : null });
                }
                ctx.globalAlpha = 1;
                const dockHover = s.showDock && coords.width > 520 ? paintDock(ctx, args, bars, index, i0, i1, s, { tick, rowH, yOf }) : null;
                const tip = dockHover ?? hover;
                if (tip) paintTooltip(ctx, tip, args, tick);
            }
            ctx.restore();
        },
    };
}

interface BarGeom {
    tick: number;
    rowH: number;
    half: number;
    barW: number;
    maxVol: number;
    maxTotal: number;
    yOf: (level: number) => number;
    hoverLevel: number | null;
}

function paintBar(ctx: CanvasRenderingContext2D, fb: FootprintBar, i: number, args: RendererLayerArgs, s: FootprintSettings, g: BarGeom): void {
    const { coords, theme } = args;
    const { rowH, maxVol, maxTotal, yOf } = g;
    // The candle sits on the bar's left edge; the numbers occupy the rest, around their own axis.
    const lane = candleLane(coords.logicalToX(i), g.barW);
    const cx = lane.cx;
    const barW = lane.width;
    const half = barW / 2;
    const left = cx - half;
    const detailed = half >= 9 && rowH >= 3;

    if (!detailed) {
        // Zoomed out: a grey silhouette of each level's total volume, symmetric around the
        // bar's axis, with the candle running through its middle.
        const sx = coords.logicalToX(i);
        ctx.fillStyle = withAlpha(theme.textColor, 0.2);
        for (const l of fb.levels) {
            const w = Math.max(1, ((l.bid + l.ask) / maxTotal) * g.barW);
            const top = Math.min(yOf(l.level), yOf(l.level + 1));
            ctx.fillRect(sx - w / 2, top, w, Math.max(1, Math.abs(yOf(l.level) - yOf(l.level + 1)) - 1));
        }
        paintCandle(ctx, args, i, sx, 1);
        return;
    }
    paintCandle(ctx, args, i, lane.candleX, lane.candleW);

    const imb = s.showImbalance ? imbalances(fb, s.imbalanceRatio) : null;
    const poc = s.showPoc ? pocIndex(fb) : -1;
    const showText = s.showText && half >= 17 && rowH >= 8;
    const font = Math.min(11, rowH * 0.78);

    if (s.showValueArea) {
        // The two lines that bound the value area, across the bar's whole footprint lane.
        const va = valueArea(fb, s.valueAreaPct / 100);
        if (va) {
            ctx.strokeStyle = withAlpha(theme.textColor, 0.55);
            ctx.lineWidth = 1;
            for (const y of [yOf(va.high + 1), yOf(va.low)]) {
                ctx.beginPath();
                ctx.moveTo(left, Math.round(y) + 0.5);
                ctx.lineTo(left + barW, Math.round(y) + 0.5);
                ctx.stroke();
            }
        }
    }

    for (let k = 0; k < fb.levels.length; k += 1) {
        const l = fb.levels[k]!;
        const yA = yOf(l.level);
        const yB = yOf(l.level + 1);
        const top = Math.min(yA, yB);
        const h = Math.max(1, Math.abs(yA - yB) - (rowH > 4 ? 1 : 0));
        if (g.hoverLevel === l.level) {
            ctx.fillStyle = withAlpha(theme.textColor, 0.12);
            ctx.fillRect(left - 3, top, barW + 6, h);
        }
        const bidHot = imb?.bid.has(l.level) ?? false;
        const askHot = imb?.ask.has(l.level) ?? false;
        const bidW = Math.max(l.bid > 0 ? 1 : 0, (l.bid / maxVol) * (half - 0.5));
        const askW = Math.max(l.ask > 0 ? 1 : 0, (l.ask / maxVol) * (half - 0.5));
        ctx.fillStyle = withAlpha(s.bidColor, bidHot ? 0.95 : 0.55);
        ctx.fillRect(cx - bidW, top, bidW, h);
        ctx.fillStyle = withAlpha(s.askColor, askHot ? 0.95 : 0.55);
        ctx.fillRect(cx + 0.5, top, askW, h);
        if (showText) {
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            ctx.fillStyle = withAlpha(theme.textColor, 0.95);
            ctx.font = `${bidHot ? 'bold ' : ''}${font}px ${theme.fontFamily}`;
            ctx.fillText(compactVolume(l.bid), cx - 2, top + h / 2 + 0.5);
            ctx.textAlign = 'left';
            ctx.font = `${askHot ? 'bold ' : ''}${font}px ${theme.fontFamily}`;
            ctx.fillText(compactVolume(l.ask), cx + 2, top + h / 2 + 0.5);
        }
        if (k === poc) {
            ctx.strokeStyle = withAlpha(s.pocColor, 0.95);
            ctx.lineWidth = 1;
            ctx.strokeRect(left + 0.5, top + 0.5, barW - 1, Math.max(1, h - 1));
        }
    }
}

/**
 * The docked ladder beside the price axis: the visible bars' footprints summed per price level,
 * so the busiest prices of the whole screen read at a glance whatever the pan or zoom. It
 * keeps the bar columns' look: sell volume grows left, buy volume right, the busiest level is
 * boxed and the two value-area lines bound the bulk of the volume.
 */
function paintDock(
    ctx: CanvasRenderingContext2D,
    args: RendererLayerArgs,
    bars: RendererLayerArgs['bars'],
    index: Map<number, FootprintBar>,
    i0: number,
    i1: number,
    s: FootprintSettings,
    g: { tick: number; rowH: number; yOf: (level: number) => number },
): Hover | null {
    const { coords, theme, bounds } = args;
    const sums = new Map<number, FootprintLevel>();
    for (let i = i0; i <= i1; i += 1) {
        const fb = index.get(bars[i]!.time);
        if (!fb) continue;
        for (const l of fb.levels) {
            const row = sums.get(l.level) ?? { level: l.level, bid: 0, ask: 0 };
            row.bid += l.bid;
            row.ask += l.ask;
            sums.set(l.level, row);
        }
    }
    if (!sums.size) return null;
    const levels = [...sums.values()].sort((a, b) => a.level - b.level);
    const total: FootprintBar = { time: 0, levels };
    let maxSide = 0;
    for (const l of levels) maxSide = Math.max(maxSide, l.bid, l.ask);
    const poc = s.showPoc ? pocIndex(total) : -1;
    const width = Math.min(150, coords.width * 0.2);
    const half = width / 2;
    const cx = coords.width - half - 6;
    const left = cx - half;
    const font = Math.min(11, g.rowH * 0.78);
    const text = s.showText && g.rowH >= 8;

    // Pointing at a row of the ladder highlights it and opens the same detail card as a bar row.
    let hover: Hover | null = null;
    const cur = args.cursor;
    if (cur && cur.x >= left - 4 && cur.x <= left + width + 4) {
        const level = Math.floor(coords.yToPrice(cur.y, args.scale, bounds) / g.tick + 1e-9);
        const row = sums.get(level);
        if (row) hover = { index: -1, level, row, x: cur.x, y: cur.y };
    }

    ctx.save();
    if (hover) {
        const top = Math.min(g.yOf(hover.level), g.yOf(hover.level + 1));
        ctx.fillStyle = withAlpha(theme.textColor, 0.12);
        ctx.fillRect(left - 3, top, width + 6, Math.max(1, Math.abs(g.yOf(hover.level) - g.yOf(hover.level + 1))));
    }
    ctx.strokeStyle = withAlpha(theme.textColor, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, bounds.top);
    ctx.lineTo(Math.round(cx) + 0.5, bounds.top + bounds.height);
    ctx.stroke();

    if (s.showValueArea) {
        const va = valueArea(total, s.valueAreaPct / 100);
        if (va) {
            ctx.strokeStyle = withAlpha(theme.textColor, 0.55);
            for (const y of [g.yOf(va.high + 1), g.yOf(va.low)]) {
                ctx.beginPath();
                ctx.moveTo(left - 14, Math.round(y) + 0.5);
                ctx.lineTo(left + width + 4, Math.round(y) + 0.5);
                ctx.stroke();
            }
        }
    }
    for (let k = 0; k < levels.length; k += 1) {
        const l = levels[k]!;
        const yA = g.yOf(l.level);
        const yB = g.yOf(l.level + 1);
        const top = Math.min(yA, yB);
        const h = Math.max(1, Math.abs(yA - yB) - (g.rowH > 4 ? 1 : 0));
        if (top > bounds.top + bounds.height || top + h < bounds.top) continue;
        const bidW = (l.bid / maxSide) * (half - 0.5);
        const askW = (l.ask / maxSide) * (half - 0.5);
        ctx.fillStyle = withAlpha(s.bidColor, k === poc ? 0.95 : 0.6);
        ctx.fillRect(cx - bidW, top, bidW, h);
        ctx.fillStyle = withAlpha(s.askColor, k === poc ? 0.95 : 0.6);
        ctx.fillRect(cx + 0.5, top, askW, h);
        if (text) {
            ctx.font = `${font}px ${theme.fontFamily}`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = withAlpha(theme.textColor, 0.95);
            ctx.textAlign = 'right';
            ctx.fillText(compactVolume(l.bid), cx - 2, top + h / 2 + 0.5);
            ctx.textAlign = 'left';
            ctx.fillText(compactVolume(l.ask), cx + 2, top + h / 2 + 0.5);
        }
        if (k === poc) {
            ctx.strokeStyle = withAlpha(s.pocColor, 0.95);
            ctx.strokeRect(left + 0.5, top + 0.5, width - 1, Math.max(1, h - 1));
        }
    }
    ctx.restore();
    return hover;
}

/** Splits a bar's slot into a thin candle lane on the left and the footprint lane beside it. */
function candleLane(slotCx: number, slotW: number): { candleX: number; candleW: number; cx: number; width: number } {
    const candleW = Math.max(2, Math.min(7, slotW * 0.1));
    const left = slotCx - slotW / 2;
    const gap = slotW >= 30 ? 3 : 1;
    const width = Math.max(1, slotW - candleW - gap);
    return { candleX: left + candleW / 2, candleW, cx: left + candleW + gap + width / 2, width };
}

/** The bar's own candle, drawn thin at the left of its footprint (the base candles are off). */
function paintCandle(ctx: CanvasRenderingContext2D, args: RendererLayerArgs, i: number, x: number, w: number): void {
    const bar = args.bars[i];
    if (!bar) return;
    const { coords, scale, bounds, theme } = args;
    const y = (p: number): number => coords.priceToY(p, scale, bounds);
    const color = bar.close >= bar.open ? theme.upColor : theme.downColor;
    ctx.fillStyle = color;
    const hi = y(bar.high);
    const lo = y(bar.low);
    ctx.fillRect(x - 0.5, hi, 1, Math.max(1, lo - hi));
    const top = Math.min(y(bar.open), y(bar.close));
    const bodyH = Math.max(1, Math.abs(y(bar.open) - y(bar.close)));
    ctx.fillRect(x - w / 2, top, w, bodyH);
}

interface Hover {
    index: number;
    level: number;
    row: FootprintLevel;
    x: number;
    y: number;
}

/** The footprint row under the pointer, or null. */
function hoverOf(args: RendererLayerArgs, bars: RendererLayerArgs['bars'], index: Map<number, FootprintBar>, i0: number, i1: number, tick: number): Hover | null {
    const cur = args.cursor;
    if (!cur) return null;
    const { coords, scale, bounds } = args;
    const i = Math.round(coords.xToLogical(cur.x));
    if (i < i0 || i > i1 || !bars[i]) return null;
    const lane = candleLane(coords.logicalToX(i), Math.max(1, coords.pxPerBar() * 0.92));
    if (Math.abs(lane.cx - cur.x) > lane.width / 2 + 3) return null;
    const fb = index.get(bars[i]!.time);
    if (!fb) return null;
    const level = Math.floor(coords.yToPrice(cur.y, scale, bounds) / tick + 1e-9);
    const row = fb.levels.find((l) => l.level === level);
    return row ? { index: i, level, row, x: cur.x, y: cur.y } : null;
}

function paintTooltip(ctx: CanvasRenderingContext2D, h: Hover, args: RendererLayerArgs, tick: number): void {
    const { theme, coords, bounds } = args;
    const decimals = Math.min(8, Math.max(0, Math.ceil(-Math.log10(tick) - 1e-9)));
    const s = footprintSettingsOf(args.settings);
    const title = `${(h.level * tick).toFixed(decimals)} – ${((h.level + 1) * tick).toFixed(decimals)}`;
    const vol = h.row.bid + h.row.ask;
    const delta = h.row.ask - h.row.bid;
    const w = 168;
    const hh = 92;
    let x = h.x + 16;
    let y = h.y + 16;
    if (x + w > coords.width - 4) x = h.x - w - 16;
    if (y + hh > bounds.top + bounds.height - 4) y = h.y - hh - 16;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = withAlpha(theme.background, 0.96);
    ctx.beginPath();
    ctx.roundRect(x, y, w, hh, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(theme.textColor, 0.18);
    ctx.stroke();

    ctx.font = `bold 12px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.textColor;
    ctx.fillText(title, x + w / 2, y + 16);
    ctx.strokeStyle = withAlpha(theme.textColor, 0.14);
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 29);
    ctx.lineTo(x + w - 10, y + 29);
    ctx.stroke();

    ctx.font = `12px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    const row = (label: string, yy: number): void => {
        ctx.fillStyle = withAlpha(theme.textColor, 0.65);
        ctx.fillText(label, x + 12, yy);
    };
    row('Bid × Ask', y + 45);
    row('Volume', y + 63);
    row('Delta', y + 81);
    ctx.textAlign = 'right';
    const xr = x + w - 12;
    // "bid x ask" is right-aligned as three pieces so each side keeps its own colour.
    const askText = compactVolume(h.row.ask);
    const sep = ' × ';
    const askW = ctx.measureText(askText).width;
    const sepW = ctx.measureText(sep).width;
    ctx.fillStyle = s.askColor;
    ctx.fillText(askText, xr, y + 45);
    ctx.fillStyle = withAlpha(theme.textColor, 0.65);
    ctx.fillText(sep, xr - askW, y + 45);
    ctx.fillStyle = s.bidColor;
    ctx.fillText(compactVolume(h.row.bid), xr - askW - sepW, y + 45);
    ctx.fillStyle = theme.textColor;
    ctx.font = `bold 12px ${theme.fontFamily}`;
    ctx.fillText(compactVolume(vol), xr, y + 63);
    ctx.fillStyle = delta >= 0 ? s.askColor : s.bidColor;
    ctx.fillText(`${delta >= 0 ? '+' : ''}${compactVolume(delta)}`, xr, y + 81);
    ctx.restore();
}

/**
 * The loading state of one bar: grey layers stacked along the bar's range and centred on its
 * candle line (coloured by direction). Each layer's width follows its own phase of a
 * turning helix, so the column twists like a coil while its trades load; neighbouring
 * columns turn at different phases and never flip in step.
 */
function paintLoadingColumn(ctx: CanvasRenderingContext2D, args: RendererLayerArgs, i: number): void {
    const bar = args.bars[i];
    if (!bar) return;
    const { coords, scale, bounds } = args;
    const { theme } = args;
    const yHi = coords.priceToY(bar.high, scale, bounds);
    const yLo = coords.priceToY(bar.low, scale, bounds);
    const span = Math.max(8, yLo - yHi);
    // Few, thin, short layers turning slowly (one revolution in 3.4 s) keep the loader calm.
    const layers = Math.max(3, Math.min(9, Math.round(span / 13)));
    const step = span / layers;
    const cx = coords.logicalToX(i);
    const reach = Math.max(2, (coords.pxPerBar() * 0.92) / 2) * 0.42;
    const thick = Math.max(3, Math.min(5, step * 0.5));
    const t = (args.nowMs / 3400) * Math.PI * 2;
    ctx.save();
    for (let k = 0; k < layers; k += 1) {
        const phase = t - k * 0.4 - i * 0.9;
        const turn = Math.abs(Math.cos(phase)); // 1 = the layer faces the viewer, 0 = edge-on
        const w = Math.max(1, reach * (0.2 + 0.8 * turn));
        const lean = reach * 0.1 * Math.sin(phase);
        ctx.fillStyle = withAlpha(theme.textColor, 0.05 + 0.13 * turn);
        ctx.fillRect(cx + lean - w, yHi + step * (k + 0.5) - thick / 2, 2 * w, thick);
    }
    paintCandle(ctx, args, i, cx, 1);
    ctx.restore();
}
