import { overlayScrollbarCss } from '../../styles';

export const DIALOG_STYLE_ID = 'tt-ui-dialog-5';

export const DIALOG_CSS = `
.tt-dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--tt-backdrop);
    z-index: var(--tt-z-dialog);
}
/* Non-dimming variant: still catches outside clicks, but the page stays readable. */
.tt-dialog-backdrop--clear { background: transparent; }
.tt-dialog-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: var(--tt-z-dialog);
}
.tt-dialog-backdrop[data-contained],
.tt-dialog-positioner[data-contained] { position: absolute; }
.tt-dialog-positioner[data-align='center'] {
    align-items: center;
    padding-top: 0;
}
.tt-dialog {
    background: var(--tt-surface);
    color: var(--tt-fg);
    border: 1px solid var(--tt-border-strong);
    border-radius: 10px;
    box-shadow: var(--tt-shadow-dialog);
    font-size: 13px;
    min-width: 300px;
    max-width: min(92vw, 560px);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
}
.tt-dialog[data-state='open'] { animation: tt-dialog-in var(--tt-dur-med) var(--tt-ease); }
@keyframes tt-dialog-in {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.tt-dialog-header {
    display: flex;
    align-items: center;
    padding: 9px 9px 9px 16px;
    border-bottom: 1px solid var(--tt-border);
    user-select: none;
}
.tt-dialog-title { flex: 1; font-size: 17px; font-weight: 600; letter-spacing: 0.2px; color: var(--tt-fg-bright); }
.tt-dialog-close {
    all: unset;
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--tt-fg-muted);
    line-height: 1;
    font-size: 15px;
}
.tt-dialog-close:hover { background: var(--tt-hover); color: var(--tt-fg-bright); }
.tt-dialog-body { padding: var(--tt-space-4); overflow: auto; min-height: 0; flex: 1 1 auto; }
.tt-dialog-body[data-flush] { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.tt-dialog-footer { flex: 0 0 auto; }
.tt-dialog--settings {
    width: fit-content;
    min-width: min(560px, 94vw);
    max-width: min(720px, 94vw);
    max-height: 70vh;
    font-size: 13px;
    cursor: default;
}
.tt-dialog--form {
    width: fit-content;
    min-width: min(380px, 90%);
    max-width: min(640px, 94%);
    max-height: 82%;
    font-size: 14px;
}
/* Form dialogs (indicator inputs, drawing settings): the tab strip / body owns the
   line under the header, and the footer carries its own top delimiter. */
.tt-dialog--form .tt-dialog-header { align-items: flex-start; padding: 16px 20px 20px; border-bottom: none; }
.tt-dialog--form .tt-dialog-title { font-size: 20px; line-height: 28px; }
.tt-dialog--form .tt-dialog-footer {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid var(--tt-border);
}
.tt-dialog-btn {
    cursor: pointer;
    height: 34px;
    padding: 0 11px;
    border-radius: 6px;
    border: 1px solid var(--tt-border-strong);
    background: transparent;
    color: var(--tt-fg);
    font-weight: 400;
    font-size: 14px;
    font-family: inherit;
    transition: background var(--tt-dur-fast) ease, color var(--tt-dur-fast) ease, opacity var(--tt-dur-fast) ease, border-color var(--tt-dur-fast) ease;
}
.tt-dialog-btn:hover { background: var(--tt-hover); color: var(--tt-fg-bright); border-color: var(--tt-fg-muted); }
.tt-dialog-btn-primary { border-color: var(--tt-selected-bg); background: var(--tt-selected-bg); color: var(--tt-selected-fg); }
.tt-dialog-btn-primary:hover { background: var(--tt-selected-bg); color: var(--tt-selected-fg); opacity: 0.85; border-color: var(--tt-selected-bg); }
${overlayScrollbarCss('.tt-dialog-body')}
/* Scrollers NESTED in a dialog (a flush body's grid, a tab pane) get the same thin
   overlay bars — the two-class selectors below stay overridable by more specific
   per-dialog sheets. */
${overlayScrollbarCss('.tt-dialog *')}
/* ── mobile chrome: dialogs fill the shell ─────────────────────────────────────────
   Inside a shell in the mobile size class ([data-layout='mobile'] on the widget root,
   which is position:relative) every kit dialog presents fullscreen: desktop cards are
   unusable at phone widths, and the shell's bounds — not the viewport — are the honest
   "screen" for an embedded chart. */
[data-layout='mobile'] .tt-dialog-backdrop { position: absolute; }
[data-layout='mobile'] .tt-dialog-positioner {
    position: absolute;
    padding: 0;
    align-items: stretch;
}
[data-layout='mobile'] .tt-dialog {
    width: 100%;
    min-width: 0;
    max-width: none;
    max-height: none;
    flex: 1 1 auto;
    border: none;
    border-radius: 0;
    transform: none !important; /* a desktop drag offset must not survive the flip */
}
[data-layout='mobile'] .tt-dialog-close { width: 40px; height: 40px; }
[data-layout='mobile'] .tt-dialog-body { padding-bottom: calc(var(--tt-space-4) + env(safe-area-inset-bottom, 0px)); }
`;
