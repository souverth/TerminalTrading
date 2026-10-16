// Layout picker — the topbar's LAYOUT dropdown. A bounded 4×4 grid canvas: hover
// previews the full rows×cols rectangle from the top-left (the table-insert idiom);
// a click applies it immediately. Registered layouts that are NOT expressible on the
// canvas (bespoke plugin presets) list as labeled rows under it, and the workspace
// SYNC switches sit beside the grid.
//
// The panel is a lightweight anchored popover (outside-pointerdown + Escape dismiss)
// rather than a kit Menu: it mixes a canvas and switch rows, which is beyond the menu
// machine's item model. The host element provides the theme tokens (the panel portals
// inside it, same as the menu positioner).
import { injectStyles } from '../ui/styles';
import { Tooltip } from '../ui/components/tooltip';
import { announceSurface } from '../ui/surface-events';
import { holdForExit, type SurfaceExit } from '../ui/surface-exit';

const STYLE_ID = 'tt-widget-layout-picker-v15';
// One monochrome selection language across the panel: lit cells and sync ON
// switches both speak --tt-selected-*.
const CSS = `
.tt-lp-layer { position: absolute; z-index: var(--tt-z-menu); }
.tt-lp {
    background: var(--tt-surface);
    color: var(--tt-fg);
    border: 1px solid var(--tt-border-strong);
    border-radius: 8px;
    box-shadow: var(--tt-shadow);
    padding: 10px 12px 10px;
    font-size: 13px;
    user-select: none;
    transform-origin: top;
    animation: tt-lp-in var(--tt-dur-fast) var(--tt-ease);
}
@keyframes tt-lp-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.tt-lp-cols { display: flex; align-items: stretch; gap: 14px; }
.tt-lp-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--tt-fg-faint);
    margin-bottom: 10px;
}
/* "?" help badge: hover it for the canvas explainer. */
.tt-lp-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid var(--tt-border-strong);
    color: var(--tt-fg-muted);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0;
    cursor: default;
    transition: color var(--tt-dur-fast) var(--tt-ease), border-color var(--tt-dur-fast) var(--tt-ease);
}
.tt-lp-badge:hover { color: var(--tt-fg-bright); border-color: var(--tt-fg-muted); }
.tt-lp-tip { display: flex; flex-direction: column; gap: 4px; max-width: 230px; white-space: normal; }
.tt-lp-vsep { width: 1px; flex: none; align-self: stretch; background: var(--tt-border-faint); }
.tt-lp-layout { width: 132px; display: flex; flex-direction: column; align-items: center; }
.tt-lp-layout > .tt-lp-heading,
.tt-lp-layout > .tt-lp-presets { align-self: stretch; }
.tt-lp-grid { display: grid; grid-template-columns: repeat(4, 24px); grid-auto-rows: 24px; gap: 4px; }
.tt-lp-sq {
    all: unset;
    box-sizing: border-box;
    border-radius: 4px;
    background: var(--tt-hover);
    border: 1px solid var(--tt-border-faint);
    cursor: pointer;
    transition: background var(--tt-dur-fast) var(--tt-ease), border-color var(--tt-dur-fast) var(--tt-ease);
}
.tt-lp-sq:hover { background: var(--tt-hover-strong); border-color: var(--tt-border-strong); }
/* Selected/previewed squares — the shared monochrome selection chip. */
.tt-lp-sq[data-on='1'] {
    background: var(--tt-selected-bg);
    border-color: var(--tt-selected-bg);
}
.tt-lp-presets { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
.tt-lp-preset { all: unset; padding: 5px 8px; border-radius: 4px; cursor: pointer; color: var(--tt-fg-muted); font-size: 12px; white-space: nowrap; transition: transform 120ms var(--tt-ease); }
.tt-lp-preset:hover { background: var(--tt-hover); }
.tt-lp-preset:active { transform: scale(0.98); }
.tt-lp-preset[data-checked='1'] { background: var(--tt-hover-strong); color: var(--tt-fg-bright); }
.tt-lp-sync { display: flex; flex-direction: column; gap: 4px; min-width: 118px; }
.tt-lp-sync-row { all: unset; display: flex; align-items: center; gap: 14px; padding: 6px 8px; border-radius: 5px; cursor: pointer; }
.tt-lp-sync-row:hover { background: var(--tt-hover); }
.tt-lp-sync-row .tt-lp-label { flex: 1 1 auto; }
/* Toggle pill — same control language as the menu's switch rows, monochrome ON state. */
.tt-lp-switch {
    position: relative;
    flex: none;
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--tt-hover);
    border: 1px solid var(--tt-border-soft);
    transition: background 0.16s ease, border-color 0.16s ease;
}
.tt-lp-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--tt-fg-muted);
    transition: transform 0.16s ease, background 0.16s ease;
}
.tt-lp-switch.on { background: var(--tt-selected-bg); border-color: var(--tt-selected-bg); }
.tt-lp-switch.on::after { transform: translateX(16px); background: var(--tt-selected-fg); }
`;

/** The picker canvas is a fixed 4×4 — 16 cells, the workspace pool capacity. */
const GRID = 4;

/** The current layout's footprint on the canvas (mirrors the workspace's LayoutShape). */
export type LayoutPickerShape = { rows: number; cols: number };

/** Build the bare 4×4 canvas (16 squares, row-major). Interaction wiring stays with the
 *  caller — the desktop popover adds hover previews, the mobile drawer taps to apply. */
export function layoutGridCanvas(doc: Document): { el: HTMLElement; squares: HTMLButtonElement[] } {
    injectStyles(STYLE_ID, CSS, doc);
    const el = doc.createElement('div');
    el.className = 'tt-lp-grid';
    const squares: HTMLButtonElement[] = [];
    for (let r = 0; r < GRID; r += 1) {
        for (let c = 0; c < GRID; c += 1) {
            const sq = doc.createElement('button');
            sq.className = 'tt-lp-sq';
            sq.dataset.r = String(r);
            sq.dataset.c = String(c);
            sq.setAttribute('aria-label', `${c + 1} × ${r + 1}`);
            squares.push(sq);
            el.appendChild(sq);
        }
    }
    return { el, squares };
}

/** Light the `shape` rectangle from the top-left (null = nothing lit). */
export function paintLayoutGrid(squares: readonly HTMLButtonElement[], shape: LayoutPickerShape | null): void {
    for (const sq of squares) {
        const on = shape !== null && Number(sq.dataset.r) < shape.rows && Number(sq.dataset.c) < shape.cols;
        if (on) sq.dataset.on = '1';
        else delete sq.dataset.on;
    }
}

export interface LayoutPickerOptions {
    /** Topbar button that toggles the panel. */
    trigger: HTMLElement;
    /** Positioning/theming host (the widget root — the panel portals inside it). */
    host: HTMLElement;
    /** Current layout's canvas shape (null = a preset the canvas cannot express). */
    shape: () => LayoutPickerShape | null;
    /** Registered layouts NOT expressible on the canvas — rendered as labeled rows. */
    presets: () => Array<{ id: string; label: string; checked: boolean }>;
    onSelectGrid: (rows: number, cols: number) => void;
    onSelectPreset: (id: string) => void;
    /** SYNC switch rows (re-read on every open and after every toggle). */
    syncs: () => Array<{ id: string; label: string; checked: boolean }>;
    onToggleSync: (id: string) => void;
    onOpenChange?: (open: boolean) => void;
}

export class LayoutPicker {
    private readonly opts: LayoutPickerOptions;
    private readonly doc: Document;
    private readonly layer: HTMLElement;
    /** The picker card inside the layer — the element open/close are announced on. */
    private readonly panel: HTMLElement;
    private readonly squares: HTMLButtonElement[] = []; // row-major, 16 entries
    private readonly infoTip: Tooltip;
    private readonly presetsEl: HTMLElement;
    private readonly syncEl: HTMLElement;

    private isOpen = false;
    /** The card's exit animation after a close; a reopen cancels it. */
    private exit: SurfaceExit | null = null;
    /** Hover preview (1-based rows/cols), null = show current shape. */
    private hover: { rows: number; cols: number } | null = null;

    private readonly onDocPointerDown = (e: PointerEvent): void => {
        const t = e.target as Node | null;
        if (t && (this.layer.contains(t) || this.opts.trigger.contains(t))) return;
        this.close();
    };
    private readonly onDocKeydown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') this.close();
    };

    constructor(opts: LayoutPickerOptions) {
        this.opts = opts;
        this.doc = opts.host.ownerDocument;
        injectStyles(STYLE_ID, CSS, this.doc);
        const doc = this.doc;

        this.layer = doc.createElement('div');
        this.layer.className = 'tt-ui-layer tt-lp-layer';
        this.layer.style.display = 'none';
        const panel = doc.createElement('div');
        panel.className = 'tt-lp';
        this.layer.appendChild(panel);
        this.panel = panel;

        const cols = doc.createElement('div');
        cols.className = 'tt-lp-cols';
        panel.appendChild(cols);

        // ── left column: the LAYOUT canvas ──
        const layoutCol = doc.createElement('div');
        layoutCol.className = 'tt-lp-layout';
        const layoutHeading = doc.createElement('div');
        layoutHeading.className = 'tt-lp-heading';
        const headingText = doc.createElement('span');
        headingText.textContent = 'Layout';
        const badge = doc.createElement('span');
        badge.className = 'tt-lp-badge';
        badge.textContent = '?';
        layoutHeading.append(headingText, badge);
        layoutCol.appendChild(layoutHeading);
        this.infoTip = new Tooltip(badge, {
            host: opts.host,
            placement: 'bottom',
            content: () => this.tipNode(),
        });

        const { el: grid, squares } = layoutGridCanvas(doc);
        this.squares.push(...squares);
        layoutCol.appendChild(grid);

        this.presetsEl = doc.createElement('div');
        this.presetsEl.className = 'tt-lp-presets';
        layoutCol.appendChild(this.presetsEl);
        cols.appendChild(layoutCol);

        const vsep = doc.createElement('div');
        vsep.className = 'tt-lp-vsep';
        cols.appendChild(vsep);

        // ── right column: the SYNC switches ──
        const syncCol = doc.createElement('div');
        const syncHeading = doc.createElement('div');
        syncHeading.className = 'tt-lp-heading';
        syncHeading.textContent = 'Sync';
        syncCol.appendChild(syncHeading);
        this.syncEl = doc.createElement('div');
        this.syncEl.className = 'tt-lp-sync';
        syncCol.appendChild(this.syncEl);
        cols.appendChild(syncCol);

        // ── canvas interactions: hover previews the rectangle, click applies it ──
        grid.addEventListener('pointerdown', (e) => {
            const sq = this.squareAt(e);
            if (!sq) return;
            e.preventDefault();
            const { r, c } = this.squarePos(sq);
            this.close();
            this.opts.onSelectGrid(r + 1, c + 1);
        });
        grid.addEventListener('pointermove', (e) => {
            const sq = this.squareAt(e);
            if (!sq) return;
            const { r, c } = this.squarePos(sq);
            if (this.hover?.rows !== r + 1 || this.hover?.cols !== c + 1) {
                this.hover = { rows: r + 1, cols: c + 1 };
                this.render();
            }
        });
        grid.addEventListener('pointerleave', () => {
            if (this.hover) {
                this.hover = null;
                this.render();
            }
        });

        opts.trigger.addEventListener('click', () => this.toggle());
        opts.trigger.setAttribute('aria-haspopup', 'true');
        opts.trigger.setAttribute('aria-expanded', 'false');
        opts.host.appendChild(this.layer);
    }

    toggle(): void {
        if (this.isOpen) this.close();
        else this.open();
    }

    open(): void {
        if (this.isOpen) return;
        this.isOpen = true;
        this.exit?.cancel();
        this.exit = null;
        this.hover = null;
        this.refresh();
        this.layer.style.display = '';
        this.position();
        this.opts.trigger.setAttribute('aria-expanded', 'true');
        this.doc.addEventListener('pointerdown', this.onDocPointerDown, true);
        this.doc.addEventListener('keydown', this.onDocKeydown, true);
        this.opts.onOpenChange?.(true);
        // After the host heard it — a listener that closes the picker again then reports last.
        if (this.isOpen) announceSurface(this.panel, true, 'popover', this.opts.trigger);
    }

    close(): void {
        if (!this.isOpen) return;
        this.isOpen = false;
        // Still showing — the close bubbles before the layer hides.
        announceSurface(this.panel, false, 'popover', this.opts.trigger);
        this.exit = holdForExit(this.panel, () => {
            this.exit = null;
            if (!this.isOpen) this.layer.style.display = 'none';
        });
        this.opts.trigger.setAttribute('aria-expanded', 'false');
        this.doc.removeEventListener('pointerdown', this.onDocPointerDown, true);
        this.doc.removeEventListener('keydown', this.onDocKeydown, true);
        this.opts.onOpenChange?.(false);
    }

    /** Re-read shape/presets/syncs and re-render (no-op while closed — `open` re-reads). */
    refresh(): void {
        if (!this.isOpen) return;
        this.renderPresets();
        this.renderSyncs();
        this.render();
    }

    destroy(): void {
        this.close();
        this.exit?.finish();
        this.infoTip.destroy();
        this.layer.remove();
    }

    // ── internals ──
    private squareAt(e: PointerEvent): HTMLButtonElement | null {
        const sq = (e.target as Element | null)?.closest?.('.tt-lp-sq');
        return sq instanceof HTMLButtonElement ? sq : null;
    }

    private squarePos(sq: HTMLButtonElement): { r: number; c: number } {
        return { r: Number(sq.dataset.r), c: Number(sq.dataset.c) };
    }

    /** Help copy for the LAYOUT "?" badge. */
    private tipNode(): HTMLElement {
        const tip = this.doc.createElement('div');
        tip.className = 'tt-lp-tip';
        tip.textContent = 'Click a square to apply that columns × rows layout.';
        return tip;
    }

    /** Project the interaction state onto the DOM (the hover/current rectangle). */
    private render(): void {
        paintLayoutGrid(this.squares, this.hover ?? this.opts.shape());
    }

    private renderPresets(): void {
        const doc = this.doc;
        this.presetsEl.replaceChildren();
        const presets = this.opts.presets();
        this.presetsEl.style.display = presets.length > 0 ? '' : 'none';
        for (const p of presets) {
            const b = doc.createElement('button');
            b.className = 'tt-lp-preset';
            b.textContent = p.label;
            if (p.checked) b.dataset.checked = '1';
            b.addEventListener('click', () => {
                this.close();
                this.opts.onSelectPreset(p.id);
            });
            this.presetsEl.appendChild(b);
        }
    }

    private renderSyncs(): void {
        const doc = this.doc;
        this.syncEl.replaceChildren();
        for (const s of this.opts.syncs()) {
            const row = doc.createElement('button');
            row.className = 'tt-lp-sync-row';
            const label = doc.createElement('span');
            label.className = 'tt-lp-label';
            label.textContent = s.label;
            const pill = doc.createElement('span');
            pill.className = 'tt-lp-switch' + (s.checked ? ' on' : '');
            pill.setAttribute('aria-hidden', 'true');
            row.setAttribute('role', 'switch');
            row.setAttribute('aria-checked', String(s.checked));
            row.append(label, pill);
            row.addEventListener('click', () => {
                this.opts.onToggleSync(s.id);
                this.renderSyncs(); // switches stay open — flip, see, flip again
            });
            this.syncEl.appendChild(row);
        }
    }

    /** Anchor under the trigger, clamped to the host's right edge. */
    private position(): void {
        const hostRect = this.opts.host.getBoundingClientRect();
        const trigRect = this.opts.trigger.getBoundingClientRect();
        let left = trigRect.left - hostRect.left;
        // The kit menus' positioning gutter, so every topbar dropdown clears the bar alike.
        const top = trigRect.bottom - hostRect.top + 8;
        const width = this.layer.offsetWidth;
        if (left + width > hostRect.width - 8) left = Math.max(8, hostRect.width - 8 - width);
        this.layer.style.left = `${left}px`;
        this.layer.style.top = `${top}px`;
    }
}
