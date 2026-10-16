// Pine editor: a side panel (`</>` button in the topbar's panel group) with a code editor,
// Run (adds the script to the active chart), Save to the script library, a script picker,
// and a Logs drawer for compile / run errors.
import { iconMarkup, registerIcon, registerSidePanel } from "../src/plugin";
import { svg24 } from "../src/core/icons";
import type { WidgetContext } from "../src/widget";
import { api, notifyLibraryChange, onLibraryChange, type ApiError, type LibraryScript } from "./library-api";

const PANEL_ID = "pine.editor";
const STYLE_ID = "pine-editor-style";
const UNTITLED = "My script";
const TEMPLATE = `//@version=6
indicator("${UNTITLED}", overlay = true)
plot(ta.sma(close, 20), "SMA 20", color = color.orange)
`;

// House-style glyphs (24×24, currentColor stroke — the same builder Terminal Trading's own icons use).
registerIcon("pine-code", svg24('<polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/>'));
registerIcon(
  "pine-save",
  svg24('<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7V3"/><rect x="7" y="13" width="10" height="8" rx="1"/>'),
);
registerIcon("pine-copy", svg24('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'));

// ── shared with the library dialog ────────────────────────────────────────────
let panelCtx: WidgetContext | null = null;
let libraryOpener: () => void = () => {};
let loadIntoEditor: ((script: LibraryScript | null) => void) | null = null;

/** Wire the "Indicators" button to the dialog (set by scripts-manager). */
export function setLibraryOpener(open: () => void): void {
  libraryOpener = open;
}

/** Open the editor panel on `script` (or a fresh template when null). */
export function openInEditor(script: LibraryScript | null): void {
  panelCtx?.togglePanel(PANEL_ID, true);
  loadIntoEditor?.(script);
}

const CSS = `
.pe{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--tt-bg,#101216);color:#e6e8ee;font:13px system-ui,sans-serif}
.pe-hd{display:flex;flex-direction:row;flex-wrap:nowrap;gap:6px;align-items:center;font:13px system-ui,sans-serif;color:#e6e8ee}
.pe button,.pe-hd button{background:transparent;border:1px solid transparent;border-radius:6px;color:inherit;padding:4px 8px;font:inherit;cursor:pointer;white-space:nowrap}
.pe button:hover:not(:disabled),.pe-hd button:hover:not(:disabled){background:#242932}
.pe-hd button.icon{display:inline-flex;align-items:center;font-size:18px;padding:4px 6px;color:#aab0bf}
.pe-hd button.icon:hover{color:#e6e8ee}
.pe-hd button.run{background:#e8eaf0;color:#101216;font-weight:600;padding:4px 12px}
/* Same field as the Indicators dialog's search row: #1c1d20 fill, #2a2b30 border, 8px radius. */
.pe-hd .pe-name-input{box-sizing:border-box;width:190px;height:30px;background:var(--tt-surface-elev,#1c1d20);border:1px solid #2a2b30;border-radius:8px;color:var(--tt-fg,#d1d4dc);padding:0 12px;font:13px system-ui,sans-serif;outline:0;transition:border-color .12s ease,box-shadow .12s ease}
.pe-hd .pe-name-input::placeholder{color:#757575}
.pe-hd .pe-name-input:hover{border-color:var(--tt-fg-muted,#868a96)}
.pe-hd .pe-name-input:focus{border-color:var(--tt-focus,rgba(178,181,190,.5));box-shadow:0 0 0 3px var(--tt-focus-soft,rgba(178,181,190,.12))}
.pe-hd .pe-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.pe-menu{position:absolute;z-index:5;top:44px;left:12px;min-width:240px;max-height:320px;overflow:auto;background:#171a20;border:1px solid #2a2e37;border-radius:8px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.pe-menu button{display:block;width:100%;text-align:left}
.pe-menu hr{border:0;border-top:1px solid #2a2e37;margin:4px 0}
.pe-code{flex:1;display:flex;min-height:0;position:relative}
.pe-gutter{width:44px;padding:10px 6px 10px 0;text-align:right;color:#4a5160;font:12px/1.6 ui-monospace,Consolas,monospace;background:#101216;overflow:hidden;user-select:none;white-space:pre}
.pe-ta{flex:1;resize:none;border:0;outline:0;background:#101216;color:#e6e8ee;padding:10px;font:12px/1.6 ui-monospace,Consolas,monospace;white-space:pre;overflow:auto;tab-size:2}
.pe-ft{border-top:1px solid #2a2e37;display:flex;align-items:center;justify-content:space-between;padding:4px 8px;color:#9aa1b2;font-size:12px}
.pe-ft .badge{background:#1c2027;border-radius:6px;padding:2px 8px}
.pe-logs{border-top:1px solid #2a2e37;max-height:150px;overflow:auto;padding:6px 10px;font:12px/1.5 ui-monospace,Consolas,monospace;background:#0b0d10}
.pe-logs .err{color:#ff7b86;white-space:pre-wrap}
.pe-logs .ok{color:#3ddc97}
.pe-logs .t{color:#5d6475;margin-right:8px}
.pe-cnt{display:inline-block;min-width:18px;text-align:center;background:#2a2e37;border-radius:9px;padding:0 6px;margin-left:6px}
.pe-cnt.bad{background:#5a1d25;color:#ff9aa3}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.append(s);
}

/** A header button showing a registered icon instead of text. */
function iconBtn(iconId: string, title: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.innerHTML = iconMarkup(iconId) ?? "";
  b.title = title;
  b.setAttribute("aria-label", title);
  b.classList.add("icon");
  return b;
}

function btn(label: string, title: string, cls = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.title = title;
  if (cls) b.className = cls;
  return b;
}

registerSidePanel({
  id: PANEL_ID,
  title: "Pine editor",
  icon: "pine-code",
  order: 40,
  width: 520,
  minWidth: 380,
  maxWidth: 1100,
  resizable: true,
  overlay: true,
  maximizable: true,
  mount: (ctx, body, header) => {
    ensureStyle();
    panelCtx = ctx;
    header.setTitle("");

    // ── state ──
    let current: LibraryScript | null = null; // null = unsaved scratch script
    let name = UNTITLED;
    let dirty = false;
    let library: LibraryScript[] = [];
    let errors = 0;

    // ── header controls ──
    const picker = btn(`${name} ▾`, "Open a script", "pe-name");
    const run = btn("▶ Run", "Add to the active chart (Ctrl+Enter)", "run");
    const copy = iconBtn("pine-copy", "Copy the source");
    const save = iconBtn("pine-save", "Save (Ctrl+S)");
    const lib = btn("Indicators", "Browse indicators");
    const hd = document.createElement("div");
    hd.className = "pe-hd";
    hd.append(picker, run, copy, save, lib);
    header.slot.append(hd);

    // ── body ──
    const root = document.createElement("div");
    root.className = "pe";
    root.style.position = "relative";
    const gutter = document.createElement("div");
    gutter.className = "pe-gutter";
    const ta = document.createElement("textarea");
    ta.className = "pe-ta";
    ta.spellcheck = false;
    ta.value = TEMPLATE;
    const code = document.createElement("div");
    code.className = "pe-code";
    code.append(gutter, ta);
    const logs = document.createElement("div");
    logs.className = "pe-logs";
    logs.style.display = "none";
    const logBtn = btn("Logs", "Show / hide the logs");
    const cnt = document.createElement("span");
    cnt.className = "pe-cnt";
    cnt.textContent = "0";
    logBtn.append(cnt);
    const ft = document.createElement("div");
    ft.className = "pe-ft";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Pine v6";
    ft.append(logBtn, badge);
    const menu = document.createElement("div");
    menu.className = "pe-menu";
    menu.style.display = "none";
    root.append(code, logs, ft, menu);
    body.append(root);
    body.style.padding = "0";

    // ── helpers ──
    const paintGutter = (): void => {
      const n = ta.value.split("\n").length;
      let s = "";
      for (let i = 1; i <= n; i++) s += `${i}\n`;
      gutter.textContent = s;
      gutter.scrollTop = ta.scrollTop;
    };
    const paintName = (): void => {
      picker.textContent = `${name}${dirty ? " •" : ""} ▾`;
    };
    const log = (kind: "err" | "ok", text: string): void => {
      const row = document.createElement("div");
      row.className = kind;
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = new Date().toLocaleTimeString();
      row.append(t, document.createTextNode(text));
      logs.append(row);
      logs.scrollTop = logs.scrollHeight;
      if (kind === "err") {
        errors++;
        logs.style.display = "block";
      }
      cnt.textContent = String(logs.childElementCount);
      cnt.className = `pe-cnt${errors ? " bad" : ""}`;
    };
    const clearLogs = (): void => {
      logs.replaceChildren();
      errors = 0;
      cnt.textContent = "0";
      cnt.className = "pe-cnt";
    };
    const setDirty = (d: boolean): void => {
      dirty = d;
      paintName();
    };
    const load = (script: LibraryScript | null): void => {
      current = script;
      lastHandle = null; // a different script: leave whatever is on the chart alone
      name = script?.name ?? UNTITLED;
      ta.value = script?.source ?? TEMPLATE;
      clearLogs();
      setDirty(false);
      paintGutter();
    };
    loadIntoEditor = load;

    const refreshLibrary = async (): Promise<void> => {
      try {
        library = (await api<{ scripts: LibraryScript[] }>("/api/scripts")).scripts;
      } catch {
        library = [];
      }
    };
    // The dialog (or this editor) changed the library: refresh the picker and rebind the
    // open script — a deleted one falls back to a blank template.
    const offLibrary = onLibraryChange(() => {
      void refreshLibrary().then(() => {
        if (!current) return;
        const fresh = library.find((s) => s.id === current!.id);
        if (fresh) current = fresh;
        else load(null);
      });
    });

    // ── actions ──
    // Running again replaces what this editor last put on a chart, instead of stacking copies.
    let lastHandle: { remove(): void } | null = null;
    const doRun = async (): Promise<void> => {
      const result = (await ctx.chart.runIndicator(ta.value)) as { ok: boolean; error?: unknown; handle?: { remove(): void } };
      if (result.ok) {
        try {
          lastHandle?.remove();
        } catch {
          /* already removed from the chart */
        }
        lastHandle = result.handle ?? null;
        log("ok", "Added to the chart.");
        ctx.toast("Script added to the chart", "success");
      } else {
        const e = result.error as { message?: string } | string | undefined;
        log("err", typeof e === "string" ? e : (e?.message ?? JSON.stringify(e, null, 2)));
      }
    };

    const doSave = async (): Promise<void> => {
      // A first save needs a real name: ask for it in place, unless one was already typed.
      if (!current && name === UNTITLED) {
        const asked = await editName();
        if (!asked) return;
        name = asked;
        paintName();
      }
      const title = name;
      try {
        const payload = JSON.stringify({ name: title, source: ta.value });
        current = current
          ? await api<LibraryScript>(`/api/scripts/${current.id}`, { method: "PUT", body: payload })
          : await api<LibraryScript>("/api/scripts", { method: "POST", body: payload });
        name = current.name;
        setDirty(false);
        log("ok", `Saved "${name}".`);
        ctx.toast("Saved", "success");
        await refreshLibrary();
        notifyLibraryChange();
      } catch (e) {
        const check = (e as ApiError).body?.check;
        log("err", check?.error ? `Not saved — the script does not compile:\n${check.error}` : `Not saved: ${(e as Error).message}`);
      }
    };

    // Rename the open script: a saved one is renamed in the library (names are unique, so a
    // clash is reported); an unsaved one just takes the name for its first save.
    // Edit the name in place: the picker button turns into a text field in the same spot.
    // Enter or clicking away commits, Escape cancels. Resolves to the new name, or null.
    const editName = (): Promise<string | null> =>
      new Promise((resolve) => {
        const input = document.createElement("input");
        input.className = "pe-name-input";
        input.value = current || name !== UNTITLED ? name : "";
        input.placeholder = "Script name";
        input.maxLength = 120;
        let done = false;
        const finish = (commit: boolean): void => {
          if (done) return;
          done = true;
          input.replaceWith(picker);
          resolve(commit ? input.value.trim() || null : null);
        };
        input.onkeydown = (e) => {
          e.stopPropagation(); // keep TerminalTrading's single-letter shortcuts out of the field
          if (e.key === "Enter") finish(true);
          else if (e.key === "Escape") finish(false);
        };
        input.onblur = () => finish(true);
        picker.replaceWith(input);
        input.focus();
        input.select();
      });

    const doRename = async (): Promise<void> => {
      const next = await editName();
      if (!next || next === name) return;
      if (!current) {
        name = next;
        paintName();
        return;
      }
      try {
        current = await api<LibraryScript>(`/api/scripts/${current.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: next }),
        });
        name = current.name;
        paintName();
        log("ok", `Renamed to "${name}".`);
        await refreshLibrary();
        notifyLibraryChange();
      } catch (e) {
        log("err", `Not renamed: ${(e as Error).message}`);
      }
    };

    const showMenu = async (): Promise<void> => {
      if (menu.style.display === "block") {
        menu.style.display = "none";
        return;
      }
      await refreshLibrary();
      menu.replaceChildren();
      const item = (label: string, fn: () => void): void => {
        const b = btn(label, "");
        b.onclick = () => {
          menu.style.display = "none";
          fn();
        };
        menu.append(b);
      };
      item("＋ New script", () => load(null));
      item("✎ Rename…", () => void doRename());
      item("Open indicators…", () => libraryOpener());
      if (library.length) menu.append(document.createElement("hr"));
      for (const s of library) item(`${s.favorite ? "★ " : ""}${s.name}`, () => load(s));
      menu.style.display = "block";
    };

    // ── wiring ──
    ta.addEventListener("input", () => {
      setDirty(true);
      paintGutter();
    });
    ta.addEventListener("scroll", () => {
      gutter.scrollTop = ta.scrollTop;
    });
    ta.addEventListener("keydown", (e) => {
      e.stopPropagation(); // keep TerminalTrading's single-letter shortcuts out of the editor
      if (e.key === "Tab") {
        e.preventDefault();
        ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end");
        setDirty(true);
        paintGutter();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void doRun();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSave();
      }
    });
    picker.onclick = () => void showMenu();
    picker.ondblclick = () => {
      menu.style.display = "none";
      void doRename();
    };
    picker.title = "Open a script (double-click to rename)";
    run.onclick = () => void doRun();
    save.onclick = () => void doSave();
    lib.onclick = () => libraryOpener();
    copy.onclick = async () => {
      await navigator.clipboard.writeText(ta.value);
      ctx.toast("Source copied", "info");
    };
    logBtn.onclick = () => {
      logs.style.display = logs.style.display === "none" ? "block" : "none";
    };
    document.addEventListener("mousedown", (e) => {
      if (!menu.contains(e.target as Node) && e.target !== picker) menu.style.display = "none";
    });

    paintGutter();
    void refreshLibrary();

    return {
      onOpen: () => {
        paintGutter();
        ta.focus();
      },
      destroy: () => {
        loadIntoEditor = null;
        offLibrary();
        panelCtx = null;
      },
    };
  },
});
