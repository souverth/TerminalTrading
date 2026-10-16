export const NUMBER_STYLE_ID = 'tt-ui-number-3';

export const NUMBER_CSS = `
.tt-num { position: relative; display: inline-block; min-width: 0; }
.tt-num[data-fill] { width: 100%; }
.tt-num:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.tt-num:not([data-fill])[data-compact] { width: 80px; }
.tt-num input {
    width: 100%;
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
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    -moz-appearance: textfield;
    appearance: textfield;
    /* Selectable even under a user-select:none host (chart wrapper, .tt-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.tt-num input::-webkit-inner-spin-button, .tt-num input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.tt-num input:hover { border-color: var(--tt-fg-muted); }
.tt-num input:focus { border-color: var(--tt-focus); box-shadow: 0 0 0 3px var(--tt-focus-soft); }
/* The stepper gutter exists only while the steppers do (hover) — an idle field keeps
   its full width so long values aren't cut under an invisible arrow column. */
.tt-num[data-steppers]:hover input { padding-right: 26px; }
.tt-num[data-size='sm'] { width: 64px; flex: none; }
.tt-num[data-size='sm'][data-compact] { width: 56px; }
.tt-num[data-size='sm'] input {
    height: 28px;
    background: var(--tt-surface-elev);
    border-radius: var(--tt-radius-sm);
    color: var(--tt-fg);
    font-size: 13px;
    box-shadow: none;
}
.tt-num[data-size='sm'] input:focus { box-shadow: none; }
.tt-num-step {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 22px;
    display: none;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: 2px 6px 2px 0;
    line-height: 0;
}
.tt-num[data-steppers]:hover .tt-num-step { display: flex; }
.tt-num-step button {
    flex: 1;
    width: 100%;
    min-height: 0;
    border: none;
    background: transparent;
    color: var(--tt-fg-muted);
    border-radius: 3px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.tt-num-step button:hover { background: var(--tt-hover); color: var(--tt-fg-bright); }
.tt-num-step .tt-icon, .tt-num-step svg { width: 12px; height: 12px; display: block; }
`;
