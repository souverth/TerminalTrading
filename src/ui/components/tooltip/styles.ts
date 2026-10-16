export const TOOLTIP_STYLE_ID = 'tt-ui-tooltip';

export const TOOLTIP_CSS = `
.tt-tooltip {
    background: var(--tt-bg);
    color: var(--tt-fg);
    border: 1px solid var(--tt-border-soft);
    border-radius: var(--tt-radius-md);
    box-shadow: var(--tt-shadow);
    font-size: var(--tt-font-size-md);
    line-height: 1.4;
    padding: var(--tt-space-1) var(--tt-space-2);
    max-width: 280px;
    pointer-events: none;
    z-index: var(--tt-z-tooltip);
}
.tt-tooltip[data-interactive] { pointer-events: auto; }
.tt-tooltip[data-state='open'] { animation: tt-tooltip-in 0.12s ease; }
@keyframes tt-tooltip-in {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
}
`;
