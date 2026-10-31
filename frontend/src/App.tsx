import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { TeamDraftProvider } from './context/TeamDraftContext';
import { Login } from './pages/Login';
import { Favorites } from './pages/Favorites';
import { Teams } from './pages/Teams';

type View = 'favorites' | 'teams';

const TABS: { view: View; label: string }[] = [
  { view: 'favorites', label: 'Favoritos' },
  { view: 'teams', label: 'Equipos' },
];

export function App() {
  const { token } = useAuth();
  const [view, setView] = useState<View>('favorites');

  // Ruteo mínimo por estado de sesión (sin router para mantenerlo simple).
  if (!token) return <Login />;

  return (
    <TeamDraftProvider>
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
            </button>
          ))}
        </div>
      </nav>
      {view === 'favorites' && <Favorites />}
      {view === 'teams' && <Teams />}
    </TeamDraftProvider>
  );
}
