// Pine script library for the playground: browse / search / create / edit / delete scripts,
// favorites, compile check, thumbnails, and "Add to chart". Backed by the trading server
// (`/api/scripts`, see ~/code/trading/src/routes/scripts.ts).
import type { VelaWorkspace } from "../src/workspace";
import type { ChartCell } from "../src/workspace/ChartCell";
import { API_BASE, api, notifyLibraryChange, onLibraryChange, toManifest, type ApiError, type CheckResult, type LibraryScript } from "./library-api";
import { openInEditor, setLibraryOpener } from "./pine-editor";

/** What the workspace keeps privately: the shared manifest its Indicators dialog lists. */
interface ManifestHolder {
  manifest: unknown[];
}

// ── keyboard shield ───────────────────────────────────────────────────────────
// Vela binds single-letter shortcuts on the window (symbol search, timeframe entry…).
// Registered at import time — before the workspace boots — so, in the capture phase,
// it runs first and keeps typing inside the library from reaching those shortcuts.
const ROOT_ID = "script-library";
window.addEventListener(
  "keydown",
  (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.(`#${ROOT_ID}`)) e.stopImmediatePropagation();
  },
  true,
);

// ── helpers ───────────────────────────────────────────────────────────────────
const NEW_SCRIPT = `//@version=5
indicator("My indicator", overlay=true)
plot(ta.sma(close, 20), "SMA 20", color=color.orange)
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props;
  if (cls) node.className = cls;
  Object.assign(node, rest);
  node.append(...children);
  return node;
}

/** Downscale a data URL to at most `maxW` px wide JPEG, keeping uploads/captures small. */
async function shrinkImage(dataUrl: string, maxW = 480): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

const STYLE = `
#${ROOT_ID}{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font:13px/1.4 system-ui,sans-serif;color:#e6e8ee}
#${ROOT_ID}.open{display:flex}
#${ROOT_ID} .panel{width:min(1180px,96vw);height:min(720px,92vh);background:#101216;border:1px solid #2a2e37;border-radius:12px;display:flex;flex-direction:column;overflow:hidden}
#${ROOT_ID} header{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid #2a2e37}
#${ROOT_ID} header h2{margin:0;font-size:15px}
#${ROOT_ID} input,#${ROOT_ID} textarea,#${ROOT_ID} select{background:#1c1d20;border:1px solid #2a2b30;border-radius:8px;color:#d1d4dc;padding:8px 12px;font:inherit;outline:0;transition:border-color .12s ease,box-shadow .12s ease}
#${ROOT_ID} input::placeholder,#${ROOT_ID} textarea::placeholder{color:#757575}
#${ROOT_ID} input:hover,#${ROOT_ID} textarea:hover{border-color:#868a96}
#${ROOT_ID} input:focus,#${ROOT_ID} textarea:focus{border-color:rgba(178,181,190,.5);box-shadow:0 0 0 3px rgba(178,181,190,.12)}
#${ROOT_ID} .search{flex:1}
#${ROOT_ID} button{background:#1c2027;border:1px solid #2a2e37;border-radius:8px;color:inherit;padding:7px 12px;font:inherit;cursor:pointer}
#${ROOT_ID} button:hover{background:#242932}
#${ROOT_ID} button.primary{background:#e8eaf0;color:#101216;border-color:#e8eaf0;font-weight:600}
#${ROOT_ID} button.danger{color:#f23645}
#${ROOT_ID} .body{flex:1;display:flex;min-height:0}
#${ROOT_ID} nav{width:170px;padding:12px;border-right:1px solid #2a2e37;display:flex;flex-direction:column;gap:2px;overflow:auto}
#${ROOT_ID} nav h4{margin:12px 8px 4px;font-size:11px;letter-spacing:.06em;color:#7d8494;text-transform:uppercase}
#${ROOT_ID} nav button{text-align:left;border:0;background:transparent;display:flex;justify-content:space-between}
#${ROOT_ID} nav button.on{background:#242932}
#${ROOT_ID} .grid{flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;align-content:start}
#${ROOT_ID} .card{background:#14171c;border:1px solid #2a2e37;border-radius:10px;overflow:hidden;cursor:pointer;position:relative}
#${ROOT_ID} .card.sel{border-color:#5b7cfa}
#${ROOT_ID} .card .img{height:100px;background:#0b0d10 center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:#3b4150;font-size:30px;font-weight:700}
#${ROOT_ID} .card .meta{padding:8px 10px}
#${ROOT_ID} .card .name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${ROOT_ID} .card .cat{font-size:11px;color:#7d8494}
#${ROOT_ID} .star{position:absolute;top:6px;right:6px;border:0;background:rgba(16,18,22,.7);padding:2px 7px;border-radius:6px;font-size:15px}
#${ROOT_ID} .star.on{color:#f0b90b}
#${ROOT_ID} .empty{grid-column:1/-1;color:#7d8494;padding:40px;text-align:center}
#${ROOT_ID} aside{width:430px;border-left:1px solid #2a2e37;padding:14px;display:flex;flex-direction:column;gap:8px;overflow:auto}
#${ROOT_ID} aside textarea.src{flex:1;min-height:200px;font:12px/1.5 ui-monospace,Consolas,monospace;resize:none;white-space:pre;tab-size:2}
#${ROOT_ID} .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#${ROOT_ID} .thumb{height:110px;border:1px dashed #2a2e37;border-radius:8px;background:#0b0d10 center/contain no-repeat}
#${ROOT_ID} .status{padding:8px 10px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;max-height:110px;overflow:auto}
#${ROOT_ID} .status.ok{background:#0e2a22;color:#3ddc97}
#${ROOT_ID} .status.err{background:#2f1519;color:#ff7b86}
#${ROOT_ID} .status.info{background:#1c2027;color:#aab0bf}
#${ROOT_ID} .confirm{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
#${ROOT_ID} .confirm-box{width:min(380px,90vw);background:#171a20;border:1px solid #2a2e37;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:16px;box-shadow:0 12px 40px rgba(0,0,0,.6);outline:0}
#${ROOT_ID} .confirm-msg{font-size:14px;line-height:1.5}
#${ROOT_ID} .confirm-box .row{justify-content:flex-end}
`;

/** In-app confirmation (matches the dialog's look) instead of the browser's native `confirm`. */
function confirmDialog(host: HTMLElement, message: string, okLabel: string, danger = true): Promise<boolean> {
  return new Promise((resolve) => {
    const cancel = el("button", { textContent: "Cancel" });
    const ok = el("button", { class: danger ? "danger" : "primary", textContent: okLabel });
    const box = el(
      "div",
      { class: "confirm-box", tabIndex: -1 },
      el("div", { class: "confirm-msg", textContent: message }),
      el("div", { class: "row" }, cancel, ok),
    );
    const overlay = el("div", { class: "confirm" }, box);
    const finish = (value: boolean): void => {
      overlay.remove();
      resolve(value);
    };
    cancel.onclick = () => finish(false);
    ok.onclick = () => finish(true);
    overlay.onmousedown = (e) => {
      if (e.target === overlay) finish(false);
    };
    box.onkeydown = (e) => {
      e.stopPropagation(); // Escape must not also close the dialog underneath
      if (e.key === "Escape") finish(false);
      else if (e.key === "Enter") finish(true);
    };
    host.append(overlay);
    ok.focus();
  });
}

export function installScriptLibrary(ws: VelaWorkspace): void {
  const style = el("style");
  style.textContent = STYLE;
  document.head.append(style);

  // ── state ──
  let scripts: LibraryScript[] = [];
  let filter: "all" | "fav" | string = "all"; // string = category
  let search = "";
  let selectedId: string | null = null; // null + `draft` = new script
  let draft: Partial<LibraryScript> | null = null;
  let thumb = "";
  let status: { kind: "ok" | "err" | "info"; text: string } | null = null;

  // ── DOM ──
  const root = el("div", { id: ROOT_ID });
  const searchInput = el("input", { class: "search", placeholder: "Search scripts, categories…", type: "search" });
  const newBtn = el("button", { class: "primary", textContent: "+ New script" });
  const closeBtn = el("button", { textContent: "✕", title: "Close (Esc)" });
  const clearBtn = el("button", { class: "danger", textContent: "Clear chart", title: "Remove every script indicator from all charts" });
  const nav = el("nav");
  const grid = el("div", { class: "grid" });
  const aside = el("aside");
  root.append(
    el(
      "div",
      { class: "panel" },
      el("header", {}, el("h2", { textContent: "Indicators" }), searchInput, newBtn, clearBtn, closeBtn),
      el("div", { class: "body" }, nav, grid, aside),
    ),
  );
  document.body.append(root);


  // ── rendering ──
  const categories = (): string[] => [...new Set(scripts.map((s) => s.category).filter(Boolean))].sort();

  const visible = (): LibraryScript[] => {
    const q = search.trim().toLowerCase();
    return scripts
      .filter((s) => (filter === "all" ? true : filter === "fav" ? s.favorite : s.category === filter))
      .filter((s) => (q ? `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  };

  const renderNav = (): void => {
    nav.replaceChildren();
    const add = (id: string, label: string, count: number): void => {
      const b = el("button", { class: filter === id ? "on" : "" }, label, el("span", { textContent: String(count) }));
      b.onclick = () => {
        filter = id;
        render();
      };
      nav.append(b);
    };
    nav.append(el("h4", { textContent: "Indicators" }));
    add("all", "All scripts", scripts.length);
    add("fav", "★ Favorites", scripts.filter((s) => s.favorite).length);
    if (categories().length) nav.append(el("h4", { textContent: "Categories" }));
    for (const c of categories()) add(c, c, scripts.filter((s) => s.category === c).length);
  };

  const renderGrid = (): void => {
    grid.replaceChildren();
    const list = visible();
    if (!list.length) grid.append(el("div", { class: "empty", textContent: "No scripts match." }));
    for (const s of list) {
      const img = el("div", { class: "img" });
      if (s.thumbnail) img.style.backgroundImage = `url("${s.thumbnail}")`;
      else img.textContent = s.name.slice(0, 2).toUpperCase();
      const star = el("button", { class: `star${s.favorite ? " on" : ""}`, textContent: s.favorite ? "★" : "☆", title: "Favorite" });
      star.onclick = (e) => {
        e.stopPropagation();
        void toggleFavorite(s);
      };
      const card = el(
        "div",
        { class: `card${s.id === selectedId ? " sel" : ""}` },
        img,
        star,
        el("div", { class: "meta" }, el("div", { class: "name", textContent: s.name }), el("div", { class: "cat", textContent: s.category || "Uncategorized" })),
      );
      card.onclick = () => select(s);
      card.ondblclick = () => void addToChart(s.source, s);
      grid.append(card);
    }
  };

  const renderAside = (): void => {
    aside.replaceChildren();
    const current = selectedId ? scripts.find((s) => s.id === selectedId) : undefined;
    if (!current && !draft) {
      aside.append(el("div", { class: "empty", textContent: "Select a script, or create a new one. Double-click a card to add it to the active chart." }));
      return;
    }
    const base: Partial<LibraryScript> = current ?? draft!;
    const name = el("input", { value: base.name ?? "", placeholder: "Name" });
    const category = el("input", { value: base.category ?? "", placeholder: "Category (Trend, SMC / ICT…)" });
    category.setAttribute("list", "script-lib-cats");
    const cats = el("datalist", { id: "script-lib-cats" });
    for (const c of categories()) cats.append(el("option", { value: c }));
    const description = el("input", { value: base.description ?? "", placeholder: "Description" });
    const source = el("textarea", { class: "src", value: base.source ?? NEW_SCRIPT, spellcheck: false });
    source.onkeydown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: en } = source;
        source.setRangeText("  ", s, en, "end");
      }
    };
    const preview = el("div", { class: "thumb" });
    const paintThumb = (): void => {
      preview.style.backgroundImage = thumb ? `url("${thumb}")` : "none";
      preview.textContent = thumb ? "" : "No image";
      preview.style.display = "flex";
      preview.style.alignItems = "center";
      preview.style.justifyContent = "center";
      preview.style.color = "#3b4150";
    };
    paintThumb();

    const file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp" });
    file.style.display = "none";
    file.onchange = async () => {
      const f = file.files?.[0];
      if (!f) return;
      const url = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(f);
      });
      thumb = await shrinkImage(url);
      paintThumb();
    };
    const capture = el("button", { textContent: "Capture chart", title: "Use a screenshot of the active chart" });
    capture.onclick = async () => {
      const shot = ws.active.chart.renderer.screenshot();
      if (!shot) return setStatus("err", "The active chart could not produce a screenshot.");
      thumb = await shrinkImage(shot);
      paintThumb();
    };
    const upload = el("button", { textContent: "Upload image" });
    upload.onclick = () => file.click();
    const clear = el("button", { textContent: "Remove" });
    clear.onclick = () => {
      thumb = "";
      paintThumb();
    };

    const statusBox = el("div", { class: "status info", id: "script-lib-status" });
    statusBox.style.display = "none";

    const read = () => ({
      name: name.value.trim(),
      category: category.value.trim(),
      description: description.value,
      source: source.value,
      thumbnail: thumb,
    });

    const check = el("button", { textContent: "Check" });
    check.onclick = () => void runCheck(read().source);
    const save = el("button", { class: "primary", textContent: "Save" });
    save.onclick = () => void saveScript(current, read());
    const add = el("button", { textContent: "Add to chart" });
    add.onclick = () => void addToChart(read().source, current, read());
    const edit = el("button", { textContent: "Open in editor", title: "Edit in the Pine editor panel" });
    edit.onclick = () => {
      close();
      openInEditor(current ?? null);
    };
    const del = el("button", { class: "danger", textContent: "Delete" });
    del.onclick = () => current && void removeScript(current);
    const fav = el("button", { textContent: current?.favorite ? "★ Favorited" : "☆ Favorite" });
    fav.onclick = () => current && void toggleFavorite(current);
    if (!current) {
      del.style.display = "none";
      fav.style.display = "none";
    }

    aside.append(
      name,
      el("div", { class: "row" }, category, description),
      cats,
      preview,
      el("div", { class: "row" }, capture, upload, clear, file),
      source,
      statusBox,
      el("div", { class: "row" }, check, save, add, edit, fav, del),
    );
    paintStatus();
  };

  const paintStatus = (): void => {
    const box = document.getElementById("script-lib-status");
    if (!box) return;
    if (!status) {
      box.style.display = "none";
      return;
    }
    box.style.display = "block";
    box.className = `status ${status.kind}`;
    box.textContent = status.text;
  };

  const setStatus = (kind: "ok" | "err" | "info", text: string): void => {
    status = { kind, text };
    paintStatus();
  };

  const render = (): void => {
    renderNav();
    renderGrid();
  };

  // ── actions ──
  const refresh = async (): Promise<void> => {
    try {
      scripts = (await api<{ scripts: LibraryScript[] }>("/api/scripts")).scripts;
    } catch (e) {
      scripts = [];
      status = { kind: "err", text: `Cannot reach the trading server at ${API_BASE}: ${(e as Error).message}` };
    }
    render();
    renderAside();
  };

  /**
   * The workspace resolves its indicator manifest ONCE at boot, so a script added, renamed
   * or deleted afterwards would be missing from (or stale in) the topbar Indicators dialog.
   * Re-push the library to the shell: the manifest every fresh cell reads, and each live
   * cell's picker. `enabled` is false for every entry, so nothing lands on a chart.
   */
  const syncManifest = async (): Promise<void> => {
    let list: LibraryScript[];
    try {
      list = (await api<{ scripts: LibraryScript[] }>("/api/scripts")).scripts;
    } catch {
      return; // server down — keep what the dialog already lists
    }
    const manifest = toManifest(list) as unknown as Parameters<ChartCell["setManifest"]>[0];
    (ws as unknown as ManifestHolder).manifest = manifest as unknown as unknown[];
    for (const cell of ws.cells()) cell.setManifest(manifest, false);
  };

  /** Remove every script indicator (natives such as Volume stay) from every chart. */
  const clearCharts = async (): Promise<void> => {
    if (!(await confirmDialog(root, "Remove every script indicator from all charts?", "Remove"))) return;
    let removed = 0;
    for (const cell of ws.cells()) {
      for (const handle of cell.chart.indicators()) {
        if (handle.nativeType !== undefined) continue;
        handle.remove();
        removed++;
      }
    }
    setStatus("ok", removed ? `Removed ${removed} indicator(s) from the charts.` : "No script indicators on the charts.");
  };

  const select =(s: LibraryScript): void => {
    selectedId = s.id;
    draft = null;
    thumb = s.thumbnail;
    status = null;
    render();
    renderAside();
  };

  const runCheck = async (source: string): Promise<CheckResult | null> => {
    setStatus("info", "Compiling…");
    try {
      const r = await api<CheckResult>("/api/scripts/check", { method: "POST", body: JSON.stringify({ source }) });
      setStatus(r.ok ? "ok" : "err", r.ok ? `OK — compiled and ran. Plots: ${r.plots.join(", ") || "(none)"}` : `Error: ${r.error}`);
      return r;
    } catch (e) {
      setStatus("err", (e as Error).message);
      return null;
    }
  };

  const saveScript = async (
    current: LibraryScript | undefined,
    data: { name: string; category: string; description: string; source: string; thumbnail: string },
  ): Promise<void> => {
    if (!data.name) return setStatus("err", "Give the script a name.");
    try {
      const saved = current
        ? await api<LibraryScript>(`/api/scripts/${current.id}`, { method: "PUT", body: JSON.stringify(data) })
        : await api<LibraryScript>("/api/scripts", { method: "POST", body: JSON.stringify(data) });
      selectedId = saved.id;
      draft = null;
      await refresh();
      notifyLibraryChange();
      setStatus("ok", "Saved.");
    } catch (e) {
      const body = (e as ApiError).body;
      setStatus("err", body?.check?.error ? `Not saved — the script does not compile:\n${body.check.error}` : `Not saved: ${(e as Error).message}`);
    }
  };

  const removeScript = async (s: LibraryScript): Promise<void> => {
    if (!(await confirmDialog(root, `Delete "${s.name}"? This cannot be undone.`, "Delete"))) return;
    await api(`/api/scripts/${s.id}`, { method: "DELETE" });
    selectedId = null;
    draft = null;
    await refresh();
    notifyLibraryChange();
  };

  const toggleFavorite = async (s: LibraryScript): Promise<void> => {
    await api(`/api/scripts/${s.id}/favorite`, { method: "PUT", body: JSON.stringify({ favorite: !s.favorite }) });
    await refresh();
    notifyLibraryChange();
  };

  const addToChart = async (
    source: string,
    saved?: LibraryScript,
    unsaved?: { thumbnail: string },
  ): Promise<void> => {
    const chart = ws.active.chart;
    const result = (await chart.runIndicator(source)) as { ok: boolean; error?: unknown };
    if (!result.ok) {
      const err = result.error as { message?: string } | string | undefined;
      return setStatus("err", `Not added: ${typeof err === "string" ? err : (err?.message ?? JSON.stringify(err, null, 2))}`);
    }
    setStatus("ok", "Added to the active chart.");
    // First time a saved script reaches a chart and it has no image: snapshot it.
    if (saved && !saved.thumbnail && !unsaved?.thumbnail) {
      setTimeout(async () => {
        try {
          const shot = chart.renderer.screenshot();
          if (!shot) return;
          const img = await shrinkImage(shot);
          await api(`/api/scripts/${saved.id}`, { method: "PUT", body: JSON.stringify({ thumbnail: img }) });
          await refresh();
          notifyLibraryChange();
        } catch {
          /* the thumbnail is optional */
        }
      }, 1500);
    }
  };

  // ── wiring ──
  const open = (): void => {
    root.classList.add("open");
    void refresh();
    searchInput.focus();
  };
  const close = (): void => root.classList.remove("open");

  setLibraryOpener(open);
  closeBtn.onclick = close;
  clearBtn.onclick = () => void clearCharts();
  // Anyone (this dialog, the editor) changed the library: keep the shell's Indicators
  // dialog and this grid in step with it.
  onLibraryChange(() => {
    void syncManifest();
    if (root.classList.contains("open")) void refresh();
  });
  root.addEventListener("mousedown", (e) => {
    if (e.target === root) close();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  searchInput.oninput = () => {
    search = searchInput.value;
    renderGrid();
  };
  newBtn.onclick = () => {
    selectedId = null;
    draft = { name: "", source: NEW_SCRIPT };
    thumb = "";
    status = null;
    render();
    renderAside();
  };
}
