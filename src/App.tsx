import { useEffect, useState } from 'react'
import type { MediaType } from './db'

const MODE_KEY = 'watch-me:mode'

function loadMode(): MediaType {
  return localStorage.getItem(MODE_KEY) === 'show' ? 'show' : 'movie'
}

export default function App() {
  const [mode, setMode] = useState<MediaType>(loadMode)

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  return (
    <div className="app">
      <header className="header">
        <h1 className="brand">WATCH·ME</h1>
        <nav className="tabs">
          <button
            className={mode === 'movie' ? 'tab active' : 'tab'}
            onClick={() => setMode('movie')}
          >
            Movies
          </button>
          <button
            className={mode === 'show' ? 'tab active' : 'tab'}
            onClick={() => setMode('show')}
          >
            Shows
          </button>
        </nav>
      </header>
      <main className="empty">
        <p>Nothing on the marquee yet.</p>
      </main>
    </div>
  )
}
