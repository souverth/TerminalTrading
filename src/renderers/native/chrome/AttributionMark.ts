// The in-chart ATTRIBUTION mark — a "T" at the bottom-left of the plot that completes the
// product name ("erminal Trading") on hover and links to the project, followed by a small
// always-visible credit to the Vela project this code derives from. Rendered by DEFAULT on
// every chart. The NOTICE file requires the name "Vela" together with a link to its project
// page to stay visible wherever a chart is shown, so the credit is NOT hover-only. Products
// may disable the mark (`renderer.set('attribution', false)`) ONLY if they display an
// equivalent visible attribution elsewhere in their UI.

import { isDarkColor } from '../../../core/color';

/** Where the credit links — the canonical page of the Vela project (see NOTICE). */
export const ATTRIBUTION_URL = 'https://velacharts.dev/?utm_source=vela&utm_medium=attribution';

/** Where the product mark links. */
export const BRAND_URL = 'https://github.com/souverth/TerminalTrading';

/** The credit's visible text. It must name the Vela project. */
export const ATTRIBUTION_CREDIT = 'Built on Vela';

const STYLE_ID = 'tt-attribution-styles';
const CSS = `
.tt-attribution {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
}
.tt-attribution a {
    color: inherit;
    text-decoration: none;
}
.tt-attribution .tt-attr-brand {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    text-shadow: 0 1px 2px var(--tt-attr-shadow, rgba(0,0,0,0.45));
}
.tt-attribution .tt-attr-symbol {
    flex: none;
    display: block;
}
.tt-attribution .tt-attr-wordmark {
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    opacity: 0;
    transform: translateX(-8px);
    transition: max-width 0.3s ease, opacity 0.25s ease, transform 0.3s ease;
    flex: none;
}
.tt-attribution .tt-attr-brand:hover .tt-attr-wordmark {
    max-width: 240px;
    opacity: 1;
    transform: translateX(0);
}
.tt-attribution .tt-attr-credit {
    flex: none;
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    opacity: 0.6;
    text-shadow: 0 1px 2px var(--tt-attr-shadow, rgba(0,0,0,0.45));
}
.tt-attribution .tt-attr-credit:hover {
    opacity: 1;
    text-decoration: underline;
}
/* Mobile: a hair smaller so the mark doesn't dominate a phone-width plot. Keyed on the
   renderer's own container attribute (data-tt-layout) AND the shell root's
   (data-layout): the workspace's single grid-wide mark lives OUTSIDE any renderer
   container, so only the shell attribute reaches it. */
[data-tt-layout='mobile'] .tt-attribution .tt-attr-brand,
[data-layout='mobile'] .tt-attribution .tt-attr-brand { font-size: 17px; }
[data-tt-layout='mobile'] .tt-attribution .tt-attr-wordmark,
[data-layout='mobile'] .tt-attribution .tt-attr-wordmark { transform: translateX(-6px); }
[data-tt-layout='mobile'] .tt-attribution .tt-attr-brand:hover .tt-attr-wordmark,
[data-layout='mobile'] .tt-attribution .tt-attr-brand:hover .tt-attr-wordmark { transform: translateX(0); }
`;

function ensureStyles(doc: Document): void {
    let s = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!s) {
        s = doc.createElement('style');
        s.id = STYLE_ID;
        doc.head.appendChild(s);
    }
    s.textContent = CSS;
}

/**
 * Ink for the attribution text — a hard two-way switch on the plot background, never a
 * mid-tone: the mark is brand artwork, so it stays either fully white or fully black.
 */
export function attributionMarkColor(background: string): string {
    return isDarkColor(background) ? '#ffffff' : '#000000';
}

/**
 * Ink + lift for one plot background (call after any theme / `layout.background` change).
 * The shadow flips with the ink: a black mark under a black shadow reads as unswitched mud.
 */
export function applyAttributionMarkTheme(el: HTMLElement, background: string): void {
    const dark = isDarkColor(background);
    el.style.color = dark ? '#ffffff' : '#000000';
    el.style.setProperty('--tt-attr-shadow', dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)');
}

/**
 * Build a HOST-supplied mark for the same corner. The string is inserted as HTML inside a
 * positioned wrapper, so plain text renders as plain text and markup renders as markup —
 * it is DEVELOPER-supplied branding, never a place to pass user input through. The
 * wrapper carries no link and no theming of its own beyond the ink color, so the content
 * looks exactly as its author wrote it.
 */
export function createCustomMark(doc: Document, html: string, background: string): HTMLElement {
    const el = doc.createElement('div');
    el.className = 'tt-attribution-custom';
    Object.assign(el.style, {
        position: 'absolute',
        zIndex: '6',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        lineHeight: '1',
    });
    el.style.color = attributionMarkColor(background);
    el.innerHTML = html;
    // A mark visible on screen belongs in the PNG export too — the renderer rasterizes
    // every `data-tt-screenshot` overlay (a hidden mark is skipped by the rasterizer).
    el.dataset.ttScreenshot = '1';
    return el;
}

function createLink(doc: Document, className: string, href: string, label: string): HTMLAnchorElement {
    const a = doc.createElement('a');
    a.className = className;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = label;
    a.setAttribute('aria-label', label);
    return a;
}

/** Build the mark element (a wrapper; the caller owns absolute positioning). */
export function createAttributionMark(doc: Document, background: string): HTMLElement {
    ensureStyles(doc);
    const root = doc.createElement('div');
    root.className = 'tt-attribution';
    Object.assign(root.style, {
        position: 'absolute',
        zIndex: '6',
        pointerEvents: 'auto',
    });
    applyAttributionMarkTheme(root, background);
    // Same screenshot opt-in as the custom mark: the attribution the NOTICE file asks
    // hosts to keep visible must survive into exported PNGs as well.
    root.dataset.ttScreenshot = '1';

    const brand = createLink(doc, 'tt-attr-brand', BRAND_URL, 'Terminal Trading');
    const symbol = doc.createElement('span');
    symbol.className = 'tt-attr-symbol';
    symbol.textContent = 'T';
    const wordmark = doc.createElement('span');
    wordmark.className = 'tt-attr-wordmark';
    wordmark.textContent = 'erminal Trading';
    brand.append(symbol, wordmark);

    const credit = createLink(doc, 'tt-attr-credit', ATTRIBUTION_URL, ATTRIBUTION_CREDIT);
    credit.textContent = ATTRIBUTION_CREDIT;

    root.append(brand, credit);
    return root;
}
