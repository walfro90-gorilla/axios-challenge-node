import { useEffect, useRef, useState } from 'react';
import { HeartIcon } from '../components/icons';
import { FavoriteToggle, PokemonCard, TeamToggle } from '../components/pokemon';
import { useAuth } from '../context/AuthContext';
import { useTeamDraft } from '../context/TeamDraftContext';
import { useFavorites, type Favorite } from '../hooks/useFavorites';
import { usePokemonDetail } from '../hooks/usePokemonDetail';

const UNDO_MS = 6000;

/** Apodo editable en línea: Enter guarda, Esc cancela. */
function Nickname({
  favorite,
  onSave,
  disabled,
}: {
  favorite: Favorite;
  onSave: (nickname: string | null) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  // Evita guardar dos veces (Enter + blur) o guardar al cancelar con Esc (que también dispara blur).
  const finished = useRef(false);

  function start() {
    finished.current = false;
    setValue(favorite.nickname ?? '');
    setEditing(true);
  }

  function finish(saveChanges: boolean) {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const next = value.trim() || null;
    if (saveChanges && next !== favorite.nickname) onSave(next);
  }

  if (editing) {
    return (
      <input
        className="nickname-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') finish(false);
        }}
        onBlur={() => finish(true)}
        maxLength={30}
        placeholder="Apodo"
        aria-label={`Apodo de ${favorite.pokemonName}`}
        autoFocus
      />
    );
  }

  return (
    <button className="nickname" onClick={start} disabled={disabled} title="Editar apodo">
      {favorite.nickname ? `“${favorite.nickname}”` : <span className="muted">+ apodo</span>} ✎
    </button>
  );
}

function FavoriteCard({
  favorite,
  favorites,
  onRemove,
}: {
  favorite: Favorite;
  favorites: ReturnType<typeof useFavorites>;
  onRemove: (favorite: Favorite) => void;
}) {
  const draft = useTeamDraft();
  const detail = usePokemonDetail(favorite.pokemonName);
  const pending = favorites.pendingIds.has(favorite.pokemonId);
  const inTeam = draft.has(favorite.pokemonId);
  const pokemon = { id: favorite.pokemonId, name: favorite.pokemonName };

  return (
    <PokemonCard
      id={favorite.pokemonId}
      name={favorite.pokemonName}
      sprite={detail?.sprite}
      types={detail?.types ?? []}
      extra={
        <Nickname
          favorite={favorite}
          onSave={(nickname) => favorites.rename(favorite, nickname)}
          disabled={pending || favorite.id < 0}
        />
      }
      actions={
        <>
          <FavoriteToggle
            pressed
            onClick={() => onRemove(favorite)}
            disabled={pending || favorite.id < 0}
            label={`Quitar ${favorite.pokemonName} de favoritos`}
          />
          <TeamToggle
            pressed={inTeam}
            onClick={() => draft.toggle(pokemon)}
            disabled={!inTeam && draft.isFull}
            label={
              inTeam
                ? `Quitar ${favorite.pokemonName} del equipo`
                : draft.isFull
                  ? 'El equipo está completo'
                  : `Agregar ${favorite.pokemonName} al equipo`
            }
          />
        </>
      }
    />
  );
}

/**
 * Favoritos con foto, tipos y apodo editable (ver ADR-0015). Reemplaza en la
 * navegación a la pantalla de referencia `Favorites.tsx`, que no se modifica.
 */
export function MyFavorites({ onExplore }: { onExplore: () => void }) {
  const { logout } = useAuth();
  const favorites = useFavorites();
  const [removed, setRemoved] = useState<Favorite | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  function remove(favorite: Favorite) {
    favorites.remove(favorite);
    setRemoved(favorite);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_MS);
  }

  function undo() {
    if (!removed) return;
    clearTimeout(undoTimer.current);
    favorites.add({ id: removed.pokemonId, name: removed.pokemonName }, removed.nickname);
    setRemoved(null);
  }

  const list = favorites.favorites;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Mis favoritos</h1>
          <p className="muted lead">
            {list ? `${list.length} pokémon` : 'Cargando…'}
          </p>
        </div>
        <button onClick={logout}>Salir</button>
      </div>

      {favorites.error && <p className="error">{favorites.error}</p>}

      <div aria-live="polite">
        {removed && (
          <div className="undo-bar card">
            <span>
              Quitaste a <strong className="capitalize">{removed.pokemonName}</strong> de favoritos.
            </span>
            <button onClick={undo}>Deshacer</button>
          </div>
        )}
      </div>

      {list && list.length === 0 && (
        <div className="empty-state card">
          <span className="empty-icon">
            <HeartIcon size={40} />
          </span>
          <h2>Todavía no tienes favoritos</h2>
          <p className="muted">Marca con ♥ los pokémon que más te gusten desde la Pokédex.</p>
          <button className="btn-primary" onClick={onExplore}>
            Explorar la Pokédex
          </button>
        </div>
      )}

      {list && list.length > 0 && (
        <ul className="grid">
          {list.map((f) => (
            <FavoriteCard key={f.id} favorite={f} favorites={favorites} onRemove={remove} />
          ))}
        </ul>
      )}
    </div>
  );
}
