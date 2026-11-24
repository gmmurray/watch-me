import { useEffect, useRef, useState } from "react";
import { FiPlus, FiSettings, FiX } from "react-icons/fi";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listToWatch,
  listWatched,
  saveOrder,
  type MediaType,
  type WatchItem,
} from "./db";
import type { ToastAction, ToastState } from "./toast";
import { ItemList } from "./components/ItemList";
import { ReorderList, type MoveDirection } from "./components/ReorderList";
import { SearchSheet } from "./components/SearchSheet";
import { DetailSheet } from "./components/DetailSheet";
import { SettingsSheet } from "./components/SettingsSheet";
import { isStandalone } from "./platform";

const MODE_KEY = "watch-me:mode";

type View = "queue" | "watched";

function loadMode(): MediaType {
  return localStorage.getItem(MODE_KEY) === "show" ? "show" : "movie";
}

export default function App() {
  const [mode, setMode] = useState<MediaType>(loadMode);
  const [view, setView] = useState<View>("queue");
  // Non-null while the list is being rearranged: a staged copy that only
  // reaches the database on Save.
  const [draft, setDraft] = useState<WatchItem[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [installNudgeDismissed, setInstallNudgeDismissed] = useState(
    () => sessionStorage.getItem("watch-me:install-nudge") === "dismissed",
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  function switchMode(next: MediaType) {
    setMode(next);
    setView("queue");
    setDraft(null);
    setDetailOpen(false);
    setSearchOpen(false);
  }

  function moveDraft(index: number, direction: MoveDirection) {
    setDraft((current) => {
      if (!current) return current;
      const to = direction === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  async function commitDraft() {
    if (!draft) return;
    await saveOrder(draft.map((item) => item.id));
    setDraft(null);
    showToast("Order saved");
  }

  function showToast(message: string, action?: ToastAction) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, action });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function dismissInstallNudge() {
    sessionStorage.setItem("watch-me:install-nudge", "dismissed");
    setInstallNudgeDismissed(true);
  }

  const queue = useLiveQuery(() => listToWatch(mode), [mode]);
  const watched = useLiveQuery(() => listWatched(mode), [mode]);

  const items = (view === "queue" ? queue : watched) ?? [];

  const sorting = draft !== null;
  const noun = mode === "movie" ? "movies" : "shows";

  return (
    <div className="app">
      <header className="header">
        <div className="header-bar">
          <h1 className="brand">WATCH·ME</h1>
          <button
            className="icon-btn header-settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <FiSettings size={18} />
          </button>
        </div>
        <nav className="tabs">
          <button
            className={mode === "movie" ? "tab active" : "tab"}
            onClick={() => switchMode("movie")}
          >
            Movies
          </button>
          <button
            className={mode === "show" ? "tab active" : "tab"}
            onClick={() => switchMode("show")}
          >
            Shows
          </button>
        </nav>
      </header>

      {!isStandalone() && !installNudgeDismissed && (
        <div className="banner">
          <span>
            Install to your Home Screen so your lists stick around — how-to in
            Settings.
          </span>
          <button
            className="icon-btn"
            aria-label="Dismiss"
            onClick={dismissInstallNudge}
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      <div className="controls">
        {!sorting && (
          <button
            className={view === "watched" ? "pill active" : "pill"}
            onClick={() => setView(view === "queue" ? "watched" : "queue")}
          >
            Watched{watched?.length ? ` · ${watched.length}` : ""}
          </button>
        )}
        {view === "queue" &&
          (sorting ? (
            <>
              <button
                className="pill active"
                onClick={() => void commitDraft()}
              >
                Save
              </button>
              <button className="pill" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </>
          ) : (
            items.length > 1 && (
              <button className="pill" onClick={() => setDraft(items)}>
                Sort
              </button>
            )
          ))}
      </div>

      <main>
        {draft ? (
          <ReorderList items={draft} onMove={moveDraft} />
        ) : items.length === 0 ? (
          <div className="empty">
            {view === "queue" ? (
              <p>Nothing on the grid yet — add some {noun}.</p>
            ) : (
              <p>Nothing crossed off yet.</p>
            )}
          </div>
        ) : (
          <ItemList
            items={items}
            onSelect={(item) => {
              setDetailId(item.id);
              setDetailOpen(true);
            }}
          />
        )}
      </main>

      {!sorting && (
        <button
          className="fab"
          aria-label={`Add ${noun}`}
          onClick={() => setSearchOpen(true)}
        >
          <FiPlus size={26} />
        </button>
      )}

      <SearchSheet
        open={searchOpen}
        mode={mode}
        onClose={() => setSearchOpen(false)}
        toast={showToast}
      />
      <DetailSheet
        open={detailOpen}
        itemId={detailId}
        onClose={() => setDetailOpen(false)}
        toast={showToast}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        toast={showToast}
      />

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
