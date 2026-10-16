export const SWITCH_STYLE_ID = 'tt-ui-switch';

export const SWITCH_CSS = `
.tt-switch {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--tt-border);
    border-radius: 5px;
    background: transparent;
    color: transparent;
    cursor: pointer;
    line-height: 0;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.tt-switch .tt-icon, .tt-switch svg { display: block; width: 12px; height: 12px; }
.tt-switch[data-size='sm'] .tt-icon, .tt-switch[data-size='sm'] svg { width: 11px; height: 11px; }
.tt-switch:hover { border-color: var(--tt-fg-muted); }
.tt-switch[data-checked] {
    background: var(--tt-fg-bright);
    border-color: var(--tt-fg-bright);
    color: var(--tt-bg);
}
.tt-switch[data-size='sm'] { width: 18px; height: 18px; border-color: var(--tt-border-strong); }
.tt-switch[data-size='sm']:hover { border-color: var(--tt-fg-muted); }
.tt-switch[data-size='sm'][data-checked] {
    background: var(--tt-selected-bg);
    border-color: var(--tt-selected-bg);
    color: var(--tt-selected-fg);
}
.tt-switch[data-tone='selected'][data-checked] {
    background: var(--tt-selected-bg);
    border-color: var(--tt-selected-bg);
    color: var(--tt-selected-fg);
}
.tt-switch[disabled] { opacity: 0.4; cursor: default; }
`;
