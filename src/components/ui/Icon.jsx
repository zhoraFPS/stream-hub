import React from 'react';

/**
 * Strichzeichnungen im Stil der vfl-bochum.de Icon-Sprite: 24er Raster,
 * currentColor, 2px Strichstärke. Bewusst klein gehalten — das Design
 * arbeitet fast ausschließlich mit Typografie.
 */

const PATHS = {
  'arrow-right':    'M4 12h16M14 6l6 6-6 6',
  'arrow-left':     'M20 12H4M10 18l-6-6 6-6',
  'arrow-up-right': 'M7 17 17 7M8 7h9v9',
  'chevron-down':   'M6 9l6 6 6-6',
  'close':          'M6 6l12 12M18 6L6 18',
  'play':           'M7 4l13 8-13 8V4z',
  'search':         'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  'lock':           'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4z',
};

export default function Icon({ name, size = 24, strokeWidth = 2, ...rest }) {
  const d = PATHS[name];
  if (!d) return null;
  const filled = name === 'play';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
