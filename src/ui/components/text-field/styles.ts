export const TEXT_STYLE_ID = 'tt-ui-text-2';

export const TEXT_CSS = `
.tt-text {
    display: inline-block;
    min-width: 0;
}
.tt-text[data-fill] { width: 100%; }
.tt-text:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.tt-text-field {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 34px;
    background: transparent;
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    color: var(--tt-fg-bright);
    padding: 0 8px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    /* Selectable even under a user-select:none host (chart wrapper, .tt-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.tt-text-field:hover { border-color: var(--tt-fg-muted); }
.tt-text-field:focus { border-color: var(--tt-focus); box-shadow: 0 0 0 3px var(--tt-focus-soft); }
.tt-text[data-size='sm'] .tt-text-field {
    height: 28px;
    background: var(--tt-surface-elev);
    border-radius: var(--tt-radius-sm);
    color: var(--tt-fg);
    font-size: 13px;
}
`;
