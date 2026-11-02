import type { ReactNode } from 'react';
import { HeartIcon, PokeballIcon } from './icons';

/** Insignias de tipo con los colores oficiales (clases en styles.css). */
export function TypeBadges({ types }: { types: string[] }) {
  if (types.length === 0) return null;
  return (
    <div className="types">
      {types.map((t) => (
        <span key={t} className={`type-badge type-${t}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

/** Foto del pokémon o un marcador si no hay imagen (o aún no cargó). */
export function PokemonSprite({
  sprite,
  name,
  size = 96,
}: {
  sprite: string | null | undefined;
  name: string;
  size?: number;
}) {
  if (!sprite) {
    return (
      <div
        className="poke-sprite poke-sprite-empty"
        style={{ width: size, height: size }}
        aria-label={`${name} sin imagen`}
      >
        <PokeballIcon size={size * 0.4} />
      </div>
    );
  }
  return (
    <img
      className="poke-sprite"
      src={sprite}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

interface ToggleProps {
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Etiqueta accesible y tooltip; describe la acción que se hará al pulsar. */
  label: string;
}

/** Corazón conmutable para favoritos. */
export function FavoriteToggle({ pressed, onClick, disabled, label }: ToggleProps) {
  return (
    <button
      className="icon-btn icon-heart"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <HeartIcon filled={pressed} />
    </button>
  );
}

/** Pokéball conmutable para el equipo en armado. */
export function TeamToggle({ pressed, onClick, disabled, label }: ToggleProps) {
  return (
    <button
      className="icon-btn icon-ball"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <PokeballIcon filled={pressed} />
    </button>
  );
}

/** Tarjeta de pokémon reutilizada por la Pokédex y Favoritos. */
export function PokemonCard({
  id,
  name,
  sprite,
  types,
  extra,
  actions,
}: {
  id: number;
  name: string;
  sprite: string | null | undefined;
  types: string[];
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className="card poke-card" data-pokemon={name}>
      <PokemonSprite sprite={sprite} name={name} />
      <span className="poke-number">#{String(id).padStart(4, '0')}</span>
      <span className="poke-name">{name}</span>
      <TypeBadges types={types} />
      {extra}
      {actions && <div className="poke-actions">{actions}</div>}
    </li>
  );
}
