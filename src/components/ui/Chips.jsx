import React from 'react';

/**
 * Filter-Chips. Einzige Stelle im System mit Rundung (--border-radius-s).
 * items: [{ value, label }]
 */
export default function Chips({ items, value, onChange, scroll = true }) {
  return (
    <div className={`b-chips${scroll ? ' b-chips--scroll' : ''}`} role="group" aria-label="Filter">
      {items.map(item => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            className={`b-chip${active ? ' --is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(item.value)}
          >
            <span className="b-chip__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
