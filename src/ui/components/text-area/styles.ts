export const TEXTAREA_STYLE_ID = 'tt-ui-textarea';

export const TEXTAREA_CSS = `
.tt-textarea { display: block; width: 100%; min-width: 0; }
.tt-textarea-field {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 64px;
    background: transparent;
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    color: var(--tt-fg-bright);
    padding: 8px;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.4;
    resize: vertical;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    /* Selectable even under a user-select:none host (chart wrapper, .tt-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.tt-textarea-field:hover { border-color: var(--tt-fg-muted); }
.tt-textarea-field:focus { border-color: var(--tt-focus); box-shadow: 0 0 0 3px var(--tt-focus-soft); }
.tt-textarea-field::placeholder { color: currentColor; opacity: 0.4; }
.tt-textarea[data-autogrow] .tt-textarea-field { resize: none; overflow-y: hidden; min-height: 46px; }
.tt-textarea[data-size='sm'] .tt-textarea-field {
    font-size: 13px;
    min-height: 46px;
    padding: 6px 9px;
    line-height: 18px;
}
`;
