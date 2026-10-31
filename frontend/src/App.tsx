import { useState } from 'react';
import { useAuth } from './context/AuthContext';
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
    <>
      <nav style={{ borderBottom: '1px solid #ddd', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 16 }}>
          {TABS.map((tab) => {
            const active = tab.view === view;
            return (
              <button
                key={tab.view}
                onClick={() => setView(tab.view)}
                aria-current={active ? 'page' : undefined}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '12px 0',
                  fontWeight: active ? 700 : 400,
                  borderBottom: `3px solid ${active ? '#333' : 'transparent'}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
      {view === 'favorites' ? <Favorites /> : <Teams />}
    </>
  );
}
