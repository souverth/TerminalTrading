export const MENU_STYLE_ID = 'tt-ui-menu';

export const MENU_CSS = `
.tt-menu {
    /* The list is a <ul>: without this, block rows (the separator) paint a ::marker dot. */
    list-style: none;
    margin: 0;
    background: var(--tt-surface);
    color: var(--tt-fg);
    border: 1px solid var(--tt-border-strong);
    border-radius: 6px;
    box-shadow: var(--tt-shadow);
    padding: 6px;
    min-width: 180px;
    max-height: 60vh;
    overflow-y: auto;
    font-size: 13px;
    z-index: var(--tt-z-menu);
    outline: none;
}
.tt-menu[data-state='open'] { animation: tt-menu-in var(--tt-dur-fast) var(--tt-ease); }
@keyframes tt-menu-in {
    from { opacity: 0; transform: translateY(-3px); }
    to { opacity: 1; transform: translateY(0); }
}
.tt-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
}
.tt-menu-item[data-highlighted] { background: var(--tt-hover); }
.tt-menu-item[data-disabled] { opacity: 0.4; cursor: default; }
.tt-menu-item .tt-icon { width: 16px; height: 16px; font-size: 16px; justify-content: center; color: var(--tt-fg-muted); }
.tt-menu-item .tt-menu-label { flex: 1 1 auto; }
.tt-menu-item .tt-menu-hint { color: var(--tt-fg-faint); font-size: var(--tt-font-size-sm); }
/* Active entry: the row surface carries the selection — a stronger background wash
   than the hover one, plus bright ink. Declared after the hover rule so a selected
   row stays visibly selected while highlighted. */
.tt-menu-item[data-checked] {
    background: var(--tt-hover-strong);
    color: var(--tt-fg-bright);
}
/* Checkmark mode (context/action menus): every row reserves the leading mark column so
   labels align; a checked row fills it with a ✓ and brightens its ink — the row surface
   stays free for the hover wash. */
.tt-menu-item .tt-menu-mark {
    width: 14px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.tt-menu-item .tt-menu-mark .tt-icon {
    width: 14px;
    height: 14px;
    font-size: 14px;
    color: var(--tt-fg-bright);
}
.tt-menu-item[data-checkmark] { color: var(--tt-fg-bright); }
/* Badge mode (iconBadges): the row icon sits in a rounded tile and the row grows to fit
   it. An icon-less row of the same level keeps an invisible slot, so labels align. */
.tt-menu[data-badges] > .tt-menu-item { padding: 5px 10px 5px 6px; }
.tt-menu-item .tt-menu-badge {
    width: 24px;
    height: 24px;
    padding: 3px;
    flex: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--tt-radius-md);
    background: var(--tt-hover);
    border: 1px solid var(--tt-border);
    color: var(--tt-fg-muted);
    transition: background var(--tt-dur-fast) var(--tt-ease), border-color var(--tt-dur-fast) var(--tt-ease), color var(--tt-dur-fast) var(--tt-ease);
}
.tt-menu-item .tt-menu-badge:empty { background: transparent; border-color: transparent; }
.tt-menu-item .tt-menu-badge .tt-icon { color: inherit; }
.tt-menu-item[data-highlighted] .tt-menu-badge:not(:empty) { color: var(--tt-fg-bright); }
/* The selected tile inverts: a bright fill under the surface-colored glyph. After the
   hover rule, so a selected row keeps its tile while highlighted. */
.tt-menu-item[data-checked] .tt-menu-badge:not(:empty),
.tt-menu-item[data-checkmark] .tt-menu-badge:not(:empty) {
    background: color-mix(in srgb, var(--tt-fg-bright) 83%, var(--tt-surface));
    border-color: color-mix(in srgb, var(--tt-fg-bright) 40%, transparent);
    color: var(--tt-surface);
}
/* Switch rows (boolean settings in a dropdown): a right-aligned toggle pill — the
   same control language as the settings dialog's toggles. */
.tt-menu-switch {
    order: 99;
    margin-left: auto;
    position: relative;
    flex: none;
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--tt-surface-overlay);
    border: 1px solid var(--tt-border-soft);
    transition: background 0.16s ease, border-color 0.16s ease;
}
.tt-menu-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--tt-fg-muted);
    transition: transform 0.16s ease, background 0.16s ease;
}
.tt-menu-switch.on { background: var(--tt-accent-bright, var(--tt-accent)); border-color: var(--tt-accent-bright, var(--tt-accent)); }
.tt-menu-switch.on::after { transform: translateX(16px); background: var(--tt-bg); }
/* Favorite star (rows carrying \`favorite\`): reserved space always — it fades in on row
   hover instead of shifting the layout — and a starred row keeps its filled star visible.
   Same control language as the drawing toolbar's flyout stars. */
.tt-menu-item .tt-menu-star {
    order: 98;
    /* Pad the 16px icon slot into a bigger hit target without moving the row's layout. */
    margin: -3px -5px -3px 0;
    padding: 3px 5px;
    box-sizing: content-box;
    border-radius: var(--tt-radius-sm);
    opacity: 0;
    transition: opacity 0.1s ease, background 0.1s ease;
}
.tt-menu-item[data-highlighted] .tt-menu-star { opacity: 0.55; }
.tt-menu-item .tt-menu-star:hover { opacity: 1; background: var(--tt-hover-strong); }
.tt-menu-item .tt-menu-star.tt-fav { opacity: 0.95; color: var(--tt-highlight); }
.tt-menu-sep { height: 1px; margin: 4px 6px; background: var(--tt-border); }
/* Submenu trigger row: a right-aligned chevron, and it stays highlighted while its own
   list is open so the path you came down remains readable. */
.tt-menu-item .tt-menu-arrow {
    order: 99;
    margin-left: auto;
    width: 12px;
    flex: none;
    font-size: 11px;
    color: var(--tt-fg-faint);
}
.tt-menu-item[data-state='open'] { background: var(--tt-hover); }
`;
