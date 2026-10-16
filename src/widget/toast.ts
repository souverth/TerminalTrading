// Bottom-center status toast — the reference's small pill over the chart (loading /
// info / error states, auto-hide). One instance per widget.
import { injectStyles } from '../ui/styles';

const STYLE_ID = 'tt-widget-toast';
const CSS = `
.tt-toast {
    position: absolute;
    left: 50%;
    bottom: 34px;
    transform: translateX(-50%);
    z-index: 30;
    display: none;
    align-items: center;
    gap: 8px;
    max-width: 70%;
    padding: 6px 14px;
    border-radius: 999px;
    background: var(--tt-surface-elev);
    border: 1px solid var(--tt-border);
    color: var(--tt-fg);
    font-size: var(--tt-font-size-md);
    box-shadow: var(--tt-shadow);
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.tt-toast[data-open] { display: inline-flex; }
.tt-toast[data-type='error'] { color: var(--tt-down); border-color: var(--tt-down); }
.tt-toast[data-type='success'] { color: var(--tt-up); }
`;

export class Toast {
    private readonly el: HTMLElement;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(host: HTMLElement) {
        injectStyles(STYLE_ID, CSS, host.ownerDocument);
        this.el = host.ownerDocument.createElement('div');
        this.el.className = 'tt-toast';
        host.appendChild(this.el);
    }

    /** Show a message; auto-hides after `ms` (0 = sticky until `hide()`). */
    show(message: string, type: 'info' | 'success' | 'error' = 'info', ms = 3000): void {
        this.el.textContent = message;
        this.el.dataset.type = type;
        this.el.dataset.open = '1';
        if (this.timer) clearTimeout(this.timer);
        this.timer = ms > 0 ? setTimeout(() => this.hide(), ms) : null;
    }

    hide(): void {
        delete this.el.dataset.open;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    destroy(): void {
        this.hide();
        this.el.remove();
    }
}
