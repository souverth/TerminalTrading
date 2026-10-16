import { FIELD_GAP_PX } from './controller';

export const FIELD_STYLE_ID = 'tt-ui-field';

export const FIELD_CSS = `
.tt-field-grid {
    display: grid;
    align-items: center;
    align-content: start;
    column-gap: ${FIELD_GAP_PX}px;
    row-gap: ${FIELD_GAP_PX}px;
}
.tt-field-grid[data-variant='inputs'] { grid-template-columns: fit-content(55%) minmax(150px,1fr); }
.tt-field-grid[data-variant='inputs'][data-mobile] { grid-template-columns: minmax(0,1fr) auto; }
.tt-field-grid[data-variant='settings'] {
    grid-template-columns: max-content max-content;
    column-gap: 12px;
}
.tt-field-grid[data-variant='settings'][data-mobile] { grid-template-columns: minmax(0,1fr) max-content; }
.tt-field-row { display: contents; }
.tt-field-span { grid-column: 1 / -1; }
.tt-field-label {
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
}
.tt-field-label[data-size='sm'] { font-size: inherit; opacity: 0.85; }
/* Titles are fully inert: spans, not label[for] — native labels propagate :hover and
   clicks onto their control, and both belong to the input alone. */
.tt-field-cell { display: flex; align-items: center; gap: 8px; justify-self: start; }
.tt-field-bool { display: flex; align-items: center; gap: 8px; min-height: 22px; }
.tt-field-stacked { display: flex; flex-direction: column; gap: 8px; }
.tt-field-stacked-head { display: flex; align-items: center; justify-content: center; gap: 8px; }
.tt-field-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.tt-field-inline-item { display: flex; align-items: center; gap: 8px; }
.tt-field-toggle-label { display: flex; align-items: center; gap: 8px; }
.tt-field-section {
    grid-column: 1 / -1;
    margin: 24px 0 0;
    padding-bottom: 8px;
    font-size: var(--tt-font-size-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--tt-fg-muted);
}
.tt-field-section[data-variant='inputs'] {
    margin: 0;
    padding: 20px 0 8px;
    font-size: 11px;
    font-weight: 600;
}
.tt-field-section[data-variant='inputs'][data-first] { padding-top: 4px; }
.tt-field-sep { grid-column: 1 / -1; height: 14px; }
.tt-field-dim { opacity: 0.4 !important; pointer-events: none !important; }
`;
