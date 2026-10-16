export const GLYPH_SELECT_STYLE_ID = 'tt-ui-glyph-select';

export const GLYPH_SELECT_CSS = `
.tt-glyph-select {
    height: 34px;
    padding: 0 26px 0 8px;
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: none;
    justify-self: start;
    color: var(--tt-fg-bright);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    position: relative;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.tt-glyph-select:hover { border-color: var(--tt-fg-muted); }
.tt-glyph-select:focus { border-color: var(--tt-focus); box-shadow: 0 0 0 3px var(--tt-focus-soft); }
.tt-glyph-select-caret {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    opacity: 0.55;
    color: inherit;
    line-height: 0;
    pointer-events: none;
}
.tt-glyph-select-pop {
    background: var(--tt-bg);
    border: none;
    border-radius: 6px;
    box-shadow: var(--tt-shadow);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    color: var(--tt-fg);
    font: 14px var(--tt-font);
}
.tt-glyph-select-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 96px;
    padding: 7px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font: inherit;
}
.tt-glyph-select-item:hover { background: var(--tt-hover); }
.tt-glyph-select-item[data-active='1'] { background: var(--tt-hover-strong); color: var(--tt-fg-bright); }
`;
