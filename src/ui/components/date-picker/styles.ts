// DatePicker styles — the calendar content only; the host (a popover, a panel) owns the
// surface around it (background, border, shadow, padding).
export const DATE_PICKER_STYLE_ID = 'tt-date-picker-styles';

export const DATE_PICKER_CSS = `
.tt-date-picker{color:var(--tt-fg);font:14px var(--tt-font);user-select:none;}
.tt-date-picker [hidden]{display:none !important;}
.tt-date-picker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.tt-date-picker-title{flex:1;display:flex;align-items:center;justify-content:center;gap:2px;min-width:0;}
.tt-date-picker-switch{border:none;background:transparent;color:var(--tt-fg-bright);font:inherit;font-weight:600;font-size:14px;padding:2px 6px;border-radius:4px;cursor:pointer;}
.tt-date-picker-switch:not(:disabled):hover{background:var(--tt-hover);}
.tt-date-picker-switch:disabled{cursor:default;}
.tt-date-picker-nav{width:24px;height:24px;border:none;background:transparent;color:var(--tt-fg-muted);border-radius:4px;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;}
.tt-date-picker-nav:hover{background:var(--tt-hover);color:var(--tt-fg-bright);}
.tt-date-picker-week,.tt-date-picker-grid{display:grid;grid-template-columns:repeat(7,28px);gap:2px;}
.tt-date-picker-week{margin-bottom:4px;color:var(--tt-fg-muted);font-size:11px;text-align:center;}
.tt-date-picker-week span{line-height:20px;}
.tt-date-picker-blank{width:28px;height:28px;}
.tt-date-picker-day{width:28px;height:28px;border:none;background:transparent;color:inherit;border-radius:4px;padding:0;cursor:pointer;font:inherit;font-size:14px;}
.tt-date-picker-day:hover{background:var(--tt-hover);}
.tt-date-picker-day[data-checked]{background:var(--tt-hover-strong);color:var(--tt-fg-bright);}
.tt-date-picker-day[data-today]:not([data-checked]){box-shadow:inset 0 0 0 1px var(--tt-border-strong);}
.tt-date-picker-cells{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:calc(7 * 28px + 6 * 2px);}
.tt-date-picker-cell{height:36px;border:none;background:transparent;color:inherit;border-radius:4px;padding:0 4px;cursor:pointer;font:inherit;font-size:14px;}
.tt-date-picker-cell:hover{background:var(--tt-hover);}
.tt-date-picker-cell[data-checked]{background:var(--tt-hover-strong);color:var(--tt-fg-bright);}
.tt-date-picker-cell[data-today]:not([data-checked]){box-shadow:inset 0 0 0 1px var(--tt-border-strong);}
.tt-date-picker-cell[data-outside]{opacity:0.45;}
`;
