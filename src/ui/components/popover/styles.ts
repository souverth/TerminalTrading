export const POPOVER_STYLE_ID = 'tt-ui-popover';

export const POPOVER_CSS = `
.tt-popover {
    position: fixed;
    z-index: var(--tt-z-popover);
    box-sizing: border-box;
    /* Never serve as a scroll anchor: the shell is portaled and re-placed between
       gestures, and anchoring against it jumps the scroller underneath. */
    overflow-anchor: none;
}
.tt-popover[data-position='absolute'] { position: absolute; }
.tt-popover[hidden] { display: none !important; }
`;
