export const CALLOUT_STYLE_ID = 'tt-ui-callout-bubble';

export const CALLOUT_CSS = `
.tt-callout {
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    flex: none;
    line-height: 0;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
}
.tt-callout[role='button'] { cursor: pointer; }
.tt-callout svg { display: block; }
/* The deployed panel — carries the kit's elevated-card look itself (the popover
   shell is bare positioning chrome). */
.tt-callout-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    max-width: 280px;
    box-sizing: border-box;
    background: var(--tt-surface-elev);
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    box-shadow: var(--tt-shadow);
    color: var(--tt-fg);
    font: var(--tt-font-size-md) var(--tt-font);
}
.tt-callout-title { font-weight: 600; color: var(--tt-fg-bright); }
.tt-callout-text { color: var(--tt-fg-muted); line-height: 1.45; white-space: pre-line; }
.tt-callout-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tt-callout-btn {
    cursor: pointer;
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--tt-border);
    background: transparent;
    color: var(--tt-fg);
    font-size: var(--tt-font-size-md);
    font-family: inherit;
    transition: background var(--tt-dur-fast) ease, color var(--tt-dur-fast) ease, opacity var(--tt-dur-fast) ease, border-color var(--tt-dur-fast) ease;
}
.tt-callout-btn:hover { background: var(--tt-hover); color: var(--tt-fg-bright); border-color: var(--tt-fg-muted); }
.tt-callout-btn-primary { border-color: var(--tt-selected-bg); background: var(--tt-selected-bg); color: var(--tt-selected-fg); }
.tt-callout-btn-primary:hover { background: var(--tt-selected-bg); color: var(--tt-selected-fg); opacity: 0.85; border-color: var(--tt-selected-bg); }
`;
