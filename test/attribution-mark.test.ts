import { describe, expect, it } from 'vitest';
import {
    ATTRIBUTION_CREDIT,
    ATTRIBUTION_URL,
    BRAND_URL,
    attributionMarkColor,
    createAttributionMark,
    createCustomMark,
} from '../src/renderers/native/chrome/AttributionMark';

/** The DOM subset the mark builders touch — tests run in a plain node environment. */
function stubDocument(): Document {
    const makeEl = (): Record<string, unknown> => ({
        className: '',
        id: '',
        textContent: '',
        innerHTML: '',
        style: { setProperty: () => undefined },
        dataset: {},
        setAttribute: () => undefined,
        children: [] as unknown[],
        append(...nodes: unknown[]) {
            (this.children as unknown[]).push(...nodes);
        },
        appendChild: () => undefined,
    });
    return {
        getElementById: () => null,
        createElement: () => makeEl(),
        head: { appendChild: () => undefined },
    } as unknown as Document;
}

describe('attributionMarkColor', () => {
    it('is white on dark chart backgrounds', () => {
        expect(attributionMarkColor('#151619')).toBe('#ffffff');
        expect(attributionMarkColor('#000000')).toBe('#ffffff');
        expect(attributionMarkColor('rgb(30, 32, 38)')).toBe('#ffffff');
    });

    it('is black on light chart backgrounds', () => {
        expect(attributionMarkColor('#ffffff')).toBe('#000000');
        expect(attributionMarkColor('#f8fafc')).toBe('#000000');
        expect(attributionMarkColor('#fff')).toBe('#000000');
        expect(attributionMarkColor('rgb(240, 240, 240)')).toBe('#000000');
    });

    it('switches with no mid-tone in between as the background brightens', () => {
        const ramp = ['#101010', '#404040', '#606060', '#a0a0a0', '#d0d0d0', '#ffffff'];
        const inks = ramp.map((bg) => attributionMarkColor(bg));
        expect(new Set(inks)).toEqual(new Set(['#ffffff', '#000000']));
        expect(inks[0]).toBe('#ffffff');
        expect(inks[inks.length - 1]).toBe('#000000');
        // one crossover only — never white → gray → black
        const flips = inks.filter((ink, i) => i > 0 && ink !== inks[i - 1]).length;
        expect(flips).toBe(1);
    });
});

describe('attribution mark screenshot opt-in', () => {
    // The PNG export rasterizes only overlays tagged `data-tt-screenshot`; a mark
    // that loses the tag silently vanishes from every exported chart.
    it('the built-in mark opts into the PNG export', () => {
        const mark = createAttributionMark(stubDocument(), '#151619');
        expect(mark.dataset.ttScreenshot).toBe('1');
    });

    it('a host-supplied custom mark opts in the same way', () => {
        const mark = createCustomMark(stubDocument(), 'ACME', '#151619');
        expect(mark.dataset.ttScreenshot).toBe('1');
    });
});

describe('the built-in mark', () => {
    type El = { className: string; textContent: string; href: string; title: string; children: El[] };
    const build = () => createAttributionMark(stubDocument(), '#151619') as unknown as El;

    it('shows a T and reveals the rest of the product name beside it, linking to the project', () => {
        const [brand] = build().children;
        const [symbol, wordmark] = brand!.children;
        expect(brand?.className).toBe('tt-attr-brand');
        expect(brand?.href).toBe(BRAND_URL);
        expect(brand?.title).toBe('Terminal Trading');
        expect(symbol?.className).toBe('tt-attr-symbol');
        expect(symbol?.textContent).toBe('T');
        expect(wordmark?.className).toBe('tt-attr-wordmark');
        expect(symbol!.textContent + wordmark!.textContent).toBe('Terminal Trading');
    });

    // The NOTICE file requires the name "Vela" with a link to its project page to stay
    // visible wherever a chart is shown: the credit is plain text, not hover-revealed.
    it('keeps a credit that names Vela and links to its project page, outside the hover reveal', () => {
        const [brand, credit] = build().children;
        expect(credit?.className).toBe('tt-attr-credit');
        expect(credit?.textContent).toBe(ATTRIBUTION_CREDIT);
        expect(credit?.textContent).toContain('Vela');
        expect(credit?.href).toBe(ATTRIBUTION_URL);
        expect(ATTRIBUTION_URL).toContain('https://velacharts.dev/');
        expect(brand?.children.some((c) => c === credit)).toBe(false);
    });
});