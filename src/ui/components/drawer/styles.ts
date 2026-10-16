export const DRAWER_STYLE_ID = 'tt-ui-drawer';

export const DRAWER_CSS = `
.tt-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--tt-backdrop);
    z-index: var(--tt-z-dialog);
}
.tt-drawer-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: var(--tt-z-dialog);
}
/* Inside a shell that declares a size class, the sheet scopes to the SHELL's bounds
   (the widget root is position:relative) instead of the whole viewport — an embedded
   chart must not curtain the host page. */
[data-layout] .tt-drawer-backdrop, [data-layout] .tt-drawer-positioner { position: absolute; }
.tt-drawer {
    background: var(--tt-surface);
    color: var(--tt-fg);
    border: 1px solid var(--tt-border-strong);
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    box-shadow: var(--tt-shadow-dialog);
    font-size: 13px;
    width: 100%;
    max-height: 85%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
}
.tt-drawer[data-state='open'] { animation: tt-drawer-in var(--tt-dur-med) var(--tt-ease); }
@keyframes tt-drawer-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
/* The grab zone owns its touches (drag-to-dismiss), so the browser must not scroll it. */
.tt-drawer-grab {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0 6px;
    cursor: grab;
    touch-action: none;
    user-select: none;
}
.tt-drawer-grab::before {
    content: '';
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--tt-border-strong);
}
.tt-drawer-title {
    flex: none;
    padding: 0 16px 10px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--tt-fg-bright);
    user-select: none;
}
.tt-drawer-title:empty { display: none; }
.tt-drawer-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    /* Vertical pans stay native scrolling; horizontal moves reach the sheet's gesture
       recognizer as pointer events (tab swipes). Without this the browser claims a
       sideways touch as a scroll attempt and CANCELS the pointer stream, so swipes
       never registered on real touch devices. Sideways-scrolling strips inside the
       body opt back in with their own touch-action: pan-x. */
    touch-action: pan-y;
    padding: 0 var(--tt-space-3) calc(var(--tt-space-3) + env(safe-area-inset-bottom, 0px));
}
.tt-drawer-body::-webkit-scrollbar { width: 8px; }
.tt-drawer-body::-webkit-scrollbar-thumb {
    background: var(--tt-scroll);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
}
`;
