export const COLOR_STYLE_ID = 'tt-ui-color';

export const COLOR_CSS = `
.tt-color-field{width:24px;height:24px;padding:2px;border:1px solid var(--tt-border);border-radius:0;background:var(--tt-surface-sunken);cursor:pointer;display:inline-flex;flex:none;}
.tt-color-field:hover{border-color:var(--tt-fg-muted);}
.tt-color-field-swatch{display:block;width:100%;height:100%;border-radius:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25);}
.tt-color-field-circle{width:26px;height:26px;padding:3px;border:1px solid var(--tt-border-strong);border-radius:4px;background:transparent;overflow:hidden;}
.tt-color-field-circle .tt-color-field-swatch{border-radius:2px;box-shadow:none;}
.tt-color-field-pop{background:var(--tt-surface-overlay);border:1px solid var(--tt-border);border-radius:var(--tt-radius-lg);box-shadow:var(--tt-shadow);padding:10px;}
`;
