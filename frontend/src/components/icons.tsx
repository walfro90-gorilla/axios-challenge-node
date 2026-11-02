/** Íconos SVG propios (ver ADR-0015). Decorativos: el texto accesible va en el botón. */

interface IconProps {
  size?: number;
  filled?: boolean;
}

export function HeartIcon({ size = 20, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 20.5s-7.1-4.4-9.4-8.6C.9 8.8 2.6 4.9 6.3 4.5c2.1-.2 3.9.9 5.7 3 1.8-2.1 3.6-3.2 5.7-3 3.7.4 5.4 4.3 3.7 7.4-2.3 4.2-9.4 8.6-9.4 8.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PokeballIcon({ size = 20, filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M2 12a10 10 0 0 1 20 0z" fill={filled ? '#e3350d' : 'none'} />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.2" fill="#fff" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
