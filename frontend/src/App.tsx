import { useState } from 'react';
import { TeamTray } from './components/team';
import { useAuth } from './context/AuthContext';
import { TeamDraftProvider, useTeamDraft } from './context/TeamDraftContext';
import { Login } from './pages/Login';
import { MyFavorites } from './pages/MyFavorites';
import { Pokedex } from './pages/Pokedex';
import { Teams } from './pages/Teams';

type View = 'pokedex' | 'favorites' | 'teams';

const TABS: { view: View; label: string }[] = [
  { view: 'pokedex', label: 'Pokédex' },
  { view: 'favorites', label: 'Favoritos' },
  { view: 'teams', label: 'Equipos' },
];

function Shell() {
  const [view, setView] = useState<View>('favorites');
  const { draft } = useTeamDraft();
  const showTray = view !== 'teams' && draft.length > 0;

  return (
    <div className={showTray ? 'with-tray' : undefined}>
      <nav className="tabs">
        <div className="tabs-inner">
          {TABS.map((tab) => (
            <button
              key={tab.view}
              className="tab"
              onClick={() => setView(tab.view)}
              aria-current={tab.view === view ? 'page' : undefined}
            >
              {tab.label}
              {tab.view === 'teams' && draft.length > 0 && (
                <span className="tab-count">{draft.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
      {view === 'pokedex' && <Pokedex />}
      {/* La pantalla de referencia Favorites.tsx se conserva sin cambios (ver ADR-0015). */}
      {view === 'favorites' && <MyFavorites onExplore={() => setView('pokedex')} />}
      {view === 'teams' && <Teams onExplore={() => setView('pokedex')} />}
      {showTray && <TeamTray onOpenTeams={() => setView('teams')} />}
    </div>
  );
}

export function App() {
  const { token, checking, sessionError, refreshSession } = useAuth();

  // Ruteo mínimo por estado de sesión (sin router para mantenerlo simple).
  if (checking) {
    return (
      <div className="page">
        <p className="muted">Comprobando sesión…</p>
      </div>
    );
  }
  // No se pudo comprobar la sesión (backend caído o sin red): se avisa en vez
  // de dejar la pantalla en blanco (ver H-32).
  if (sessionError) {
    return (
      <div className="page">
        <div className="card empty-state">
          <h1>Sin conexión con el servidor</h1>
          <p className="error">{sessionError}</p>
          <button className="btn-primary" onClick={refreshSession}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  if (!token) return <Login />;

  return (
    <TeamDraftProvider>
      <Shell />
    </TeamDraftProvider>
  );
}
