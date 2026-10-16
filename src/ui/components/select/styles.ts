export const SELECT_STYLE_ID = 'tt-ui-select-3';

export const SELECT_CSS = `
.tt-select { position: relative; display: inline-block; min-width: 0; }
.tt-select[data-fill] { width: 100%; }
/* Closed trigger matches NumberInput / TextField (100px). Long labels ellipsis;
   the open list still sizes to the longest item. */
.tt-select:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.tt-select-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 34px;
    padding: 0 26px 0 8px;
    background: transparent;
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    color: var(--tt-fg-bright);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.tt-select-trigger:hover { border-color: var(--tt-fg-muted); }
.tt-select-trigger:focus { border-color: var(--tt-focus); box-shadow: 0 0 0 3px var(--tt-focus-soft); }
.tt-select[data-size='sm'] .tt-select-trigger {
    height: 28px;
    background: var(--tt-surface-elev);
    border-radius: var(--tt-radius-sm);
    color: var(--tt-fg);
    font-size: 13px;
    box-shadow: none;
}
.tt-select[data-size='sm'] .tt-select-trigger:focus { box-shadow: none; border-color: var(--tt-fg-muted); }
.tt-select-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Compact toolbar selects still hug the widest option (no 100px kit column). */
.tt-select[data-size='sm']:not([data-fill]) { width: auto; max-width: 200px; }
.tt-select-sizer { visibility: hidden; height: 0; overflow: hidden; font-size: 13px; }
.tt-select-sizer span { display: block; height: 0; white-space: nowrap; padding: 0 26px 0 8px; border-inline: 1px solid transparent; }
.tt-select-chevron {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    display: flex;
    opacity: 0.55;
    line-height: 0;
    color: inherit;
}
.tt-select-chevron .tt-icon, .tt-select-chevron svg { width: 12px; height: 12px; display: block; }
.tt-select-list {
    width: max-content;
    background: var(--tt-bg);
    color: var(--tt-fg);
    border: none;
    border-radius: 6px;
    box-shadow: var(--tt-shadow);
    font: 14px var(--tt-font);
    padding: 4px;
    overflow: hidden;
}
.tt-select-list[data-size='sm'] { font-size: 13px; background: var(--tt-surface-overlay); }
.tt-select-items { width: max-content; min-width: 100%; max-height: none; overflow: hidden; }
.tt-select-list.is-scroll { display: flex; align-items: stretch; gap: 2px; }
.tt-select-list.is-scroll .tt-select-items {
    flex: 1 1 auto;
    min-width: min-content;
    max-height: 240px;
    overflow-y: auto;
    scrollbar-width: none;
}
.tt-select-list.is-scroll .tt-select-items::-webkit-scrollbar { display: none; width: 0; height: 0; }
.tt-select-rail { position: relative; flex: none; width: 3px; margin: 2px 1px 2px 0; pointer-events: none; }
.tt-select-thumb { width: 3px; border-radius: 2px; background: var(--tt-scroll); }
.tt-select-item {
    display: block;
    width: auto;
    min-width: 100%;
    white-space: nowrap;
    text-align: left;
    padding: 7px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 400;
}
.tt-select-item:hover { background: var(--tt-hover); }
.tt-select-item[data-checked] { background: var(--tt-hover-strong); color: var(--tt-fg-bright); }
.tt-select-item[data-checked]:hover { background: var(--tt-hover-strong); }
`;
