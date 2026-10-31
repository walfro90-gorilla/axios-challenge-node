import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Favorites } from './pages/Favorites';
import { Teams } from './pages/Teams';

type View = 'favorites' | 'teams';

export function App() {
  const { token } = useAuth();
  const [view, setView] = useState<View>('favorites');

  // Ruteo mínimo por estado de sesión (sin router para mantenerlo simple).
  if (!token) return <Login />;

  return (
    <>
      <nav style={{ maxWidth: 640, margin: '16px auto 0', fontFamily: 'system-ui', display: 'flex', gap: 8 }}>
        <button onClick={() => setView('favorites')} disabled={view === 'favorites'}>
          Favoritos
        </button>
        <button onClick={() => setView('teams')} disabled={view === 'teams'}>
          Equipos
        </button>
      </nav>
      {view === 'favorites' ? <Favorites /> : <Teams />}
    </>
  );
}
