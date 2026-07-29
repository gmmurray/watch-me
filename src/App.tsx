import { useEffect, useRef, useState } from "react";
import { FiPlus, FiSettings, FiX } from "react-icons/fi";
import { useLiveQuery } from "dexie-react-hooks";
import { listToWatch, listWatched, type MediaType } from "./db";
import type { ToastAction, ToastState } from "./toast";
import { ItemList } from "./components/ItemList";
import { SearchSheet } from "./components/SearchSheet";
import { DetailSheet } from "./components/DetailSheet";
import { SettingsSheet } from "./components/SettingsSheet";
import { isStandalone } from "./platform";

const MODE_KEY = "watch-me:mode";
const SORT_KEY = (mode: MediaType) => `watch-me:sort:${mode}`;

type View = "queue" | "watched";
type SortDir = "asc" | "desc";

function loadMode(): MediaType {
  return localStorage.getItem(MODE_KEY) === "show" ? "show" : "movie";
}

function loadSort(mode: MediaType): SortDir {
  return localStorage.getItem(SORT_KEY(mode)) === "desc" ? "desc" : "asc";
}

export default function App() {
  const [mode, setMode] = useState<MediaType>(loadMode);
  const [view, setView] = useState<View>("queue");
  const [sort, setSort] = useState<SortDir>(() => loadSort(loadMode()));
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
    setSort(loadSort(next));
    setDetailOpen(false);
    setSearchOpen(false);
  }

  function setSortDir(next: SortDir) {
    setSort(next);
    localStorage.setItem(SORT_KEY(mode), next);
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

  const items =
    view === "queue"
      ? sort === "desc"
        ? [...(queue ?? [])].reverse()
        : (queue ?? [])
      : (watched ?? []);

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
        <button
          className={view === "watched" ? "pill active" : "pill"}
          onClick={() => setView(view === "queue" ? "watched" : "queue")}
        >
          Watched{watched?.length ? ` · ${watched.length}` : ""}
        </button>
        {view === "queue" && (
          <div className="seg" role="group" aria-label="Sort order">
            <button
              className={sort === "asc" ? "seg-btn active" : "seg-btn"}
              onClick={() => setSortDir("asc")}
            >
              Oldest
            </button>
            <button
              className={sort === "desc" ? "seg-btn active" : "seg-btn"}
              onClick={() => setSortDir("desc")}
            >
              Newest
            </button>
          </div>
        )}
      </div>

      <main>
        {items.length === 0 ? (
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

      <button
        className="fab"
        aria-label={`Add ${noun}`}
        onClick={() => setSearchOpen(true)}
      >
        <FiPlus size={26} />
      </button>

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
