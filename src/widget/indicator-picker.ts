// Indicator picker — a dialog over the widget's indicator manifest: toggle entries on/off
// (live add/remove on the current chart; state survives rebuilds via the widget).
import { Dialog } from '../ui/components/dialog';
import { injectStyles } from '../ui/styles';
import { iconEl } from '../ui/icons';

export interface IndicatorRow {
    name: string;
    language?: string;
    category?: string;
    /** Core-computed (native) indicator — accent styling + 'native' routing. */
    native?: boolean;
    /** Native type id (routing key for add/remove). */
    nativeType?: string;
    /** Beta badge (native catalog flag). */
    beta?: boolean;
}

const STYLE_ID = 'tt-widget-indpicker';
const CSS = `
.tt-ip-searchrow {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
    margin-bottom: var(--tt-space-2);
    background: var(--tt-surface-elev);
    border: 1px solid var(--tt-border);
    border-radius: 8px;
}
.tt-ip-searchrow:focus-within { border-color: var(--tt-border-strong); }
.tt-ip-searchrow .tt-icon { color: var(--tt-fg-muted); }
.tt-ip-search { flex: 1; background: transparent; color: var(--tt-fg); border: none; font-size: 14px; outline: none; }
.tt-ip-list { max-height: 50vh; overflow: auto; min-width: 380px; }
/* Mobile (fullscreen dialog): no width floor — 380px would overflow a phone —
   and no height cap; the fullscreen body owns the scrolling. */
[data-layout='mobile'] .tt-ip-list { min-width: 0; max-height: none; }
.tt-ip-list::-webkit-scrollbar { width: 8px; }
.tt-ip-list::-webkit-scrollbar-thumb { background: var(--tt-scroll); border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; }
.tt-ip-group {
    color: var(--tt-fg-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 10px 4px 4px;
    border-bottom: 1px solid var(--tt-border);
    margin-bottom: 2px;
}
.tt-ip-oncard {
    background: var(--tt-surface-elev);
    border: 1px solid var(--tt-border);
    border-radius: 8px;
    padding: 6px 8px;
    margin-bottom: var(--tt-space-2);
}
.tt-ip-oncard .tt-ip-group { border-bottom: none; padding-top: 2px; }
.tt-ip-row {
    display: flex;
    align-items: center;
    gap: var(--tt-space-2);
    padding: 7px 6px;
    border-radius: var(--tt-radius-sm);
    cursor: pointer;
}
.tt-ip-row:hover { background: var(--tt-hover); }
.tt-ip-name { flex: 1; font-weight: 600; color: var(--tt-fg-bright); font-size: 13px; }
.tt-ip-badge {
    flex: none;
    padding: 1px 7px;
    border-radius: var(--tt-radius-sm);
    background: var(--tt-surface-elev);
    border: 1px solid var(--tt-border);
    color: var(--tt-accent);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}
.tt-ip-trash {
    all: unset;
    cursor: pointer;
    color: var(--tt-fg-muted);
    padding: 2px 4px;
    border-radius: var(--tt-radius-sm);
    font-size: var(--tt-font-size-md);
}
.tt-ip-trash:hover { color: var(--tt-down); background: var(--tt-hover); }
.tt-ip-empty { padding: var(--tt-space-3); color: var(--tt-fg-muted); text-align: center; }
`;

export interface IndicatorPickerOptions {
    /** The manifest library — clicking a row ADDS an instance (repeatable). */
    library: () => readonly IndicatorRow[];
    /** The live instances on the chart — the trash removes one. */
    onChart: () => readonly IndicatorRow[];
    onAdd: (libraryIndex: number) => void;
    onRemove: (instanceIndex: number) => void;
    onOpenChange?: (open: boolean) => void;
    host?: HTMLElement;
}

export class IndicatorPicker {
    private readonly dialog: Dialog;
    private readonly list: HTMLElement;
    private readonly search: HTMLInputElement;
    private readonly opts: IndicatorPickerOptions;
    private isOpen = false;

    constructor(opts: IndicatorPickerOptions) {
        this.opts = opts;
        const doc = (opts.host ?? document.body).ownerDocument;
        injectStyles(STYLE_ID, CSS, doc);
        this.search = doc.createElement('input');
        this.search.className = 'tt-ip-search';
        this.search.placeholder = 'Search…';
        this.search.spellcheck = false;
        this.search.addEventListener('input', () => this.refresh());
        const searchRow = doc.createElement('div');
        searchRow.className = 'tt-ip-searchrow';
        searchRow.append(iconEl('search', doc), this.search);
        this.list = doc.createElement('div');
        this.list.className = 'tt-ip-list';
        this.dialog = new Dialog({
            title: 'Indicators',
            host: opts.host,
            draggable: true,
            closeOnInteractOutside: true,
            // The picker adds/removes indicators live — keep the chart undimmed behind it.
            content: (body) => body.append(searchRow, this.list),
            onOpenChange: (open) => {
                this.isOpen = open;
                if (open) {
                    this.search.value = '';
                    this.refresh();
                    // Desktop only: focusing the search on a touch device would pop the
                    // on-screen keyboard over the just-opened fullscreen picker.
                    if (!this.search.closest('[data-layout="mobile"]')) setTimeout(() => this.search.focus(), 0);
                }
                opts.onOpenChange?.(open);
            },
        });
        this.list.addEventListener('click', (e) => {
            const trash = (e.target as HTMLElement).closest<HTMLElement>('.tt-ip-trash');
            const row = (e.target as HTMLElement).closest<HTMLElement>('.tt-ip-row');
            if (!row) return;
            if (trash) {
                this.opts.onRemove(Number(row.dataset.instance));
            } else if (row.dataset.library !== undefined) {
                this.opts.onAdd(Number(row.dataset.library));
            }
            this.refresh();
        });
    }

    open(): void {
        this.dialog.show();
    }

    /** Re-render the lists if the dialog is open (async catalog updates land late). */
    sync(): void {
        if (this.isOpen) this.refresh();
    }

    close(): void {
        this.dialog.hide();
    }

    destroy(): void {
        this.dialog.destroy();
    }

    private refresh(): void {
        const doc = this.list.ownerDocument;
        const q = this.search.value.trim().toLowerCase();
        const library = this.opts.library();
        const instances = this.opts.onChart();
        this.list.replaceChildren();
        const match = (r: IndicatorRow): boolean => !q || r.name.toLowerCase().includes(q);

        const rowEl = (r: IndicatorRow, opts: { library?: number; instance?: number }): HTMLElement => {
            const row = doc.createElement('div');
            row.className = 'tt-ip-row';
            if (opts.library !== undefined) row.dataset.library = String(opts.library);
            if (opts.instance !== undefined) row.dataset.instance = String(opts.instance);
            if (r.native) row.dataset.native = '1';
            const name = doc.createElement('span');
            name.className = 'tt-ip-name';
            name.textContent = r.name;
            row.appendChild(name);
            if (r.beta) {
                const beta = doc.createElement('span');
                beta.className = 'tt-ip-badge';
                beta.textContent = 'beta';
                row.appendChild(beta);
            }
            if (opts.instance !== undefined) {
                const badgeText = r.native ? 'terminal-trading' : r.language;
                if (badgeText) {
                    const badge = doc.createElement('span');
                    badge.className = 'tt-ip-badge';
                    badge.textContent = badgeText;
                    row.appendChild(badge);
                }
                const trash = doc.createElement('button');
                trash.className = 'tt-ip-trash';
                trash.appendChild(iconEl('trash', doc));
                trash.title = 'Remove from chart';
                row.appendChild(trash);
            }
            return row;
        };

        // "ON CHART · n" — every live instance (the same script may appear several times).
        const onChart = instances.map((r, i) => [r, i] as const).filter(([r]) => match(r));
        if (onChart.length) {
            const card = doc.createElement('div');
            card.className = 'tt-ip-oncard';
            const title = doc.createElement('div');
            title.className = 'tt-ip-group';
            title.textContent = `On chart · ${onChart.length}`;
            card.appendChild(title);
            for (const [r, i] of onChart) card.appendChild(rowEl(r, { instance: i }));
            this.list.appendChild(card);
        }

        // The library, grouped by category — clicking ADDS an instance (repeatable).
        const byCat = new Map<string, Array<readonly [IndicatorRow, number]>>();
        library.forEach((r, i) => {
            if (!match(r)) return;
            const cat = r.category ?? 'General';
            const bucket = byCat.get(cat) ?? [];
            bucket.push([r, i] as const);
            byCat.set(cat, bucket);
        });
        for (const [cat, bucket] of byCat) {
            const title = doc.createElement('div');
            title.className = 'tt-ip-group';
            title.textContent = cat;
            this.list.appendChild(title);
            for (const [r, i] of bucket) this.list.appendChild(rowEl(r, { library: i }));
        }
        if (!onChart.length && byCat.size === 0) {
            const empty = doc.createElement('div');
            empty.className = 'tt-ip-empty';
            empty.textContent = library.length ? 'No indicators match.' : 'No indicators in the manifest.';
            this.list.appendChild(empty);
        }
    }
}
