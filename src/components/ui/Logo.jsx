import React from 'react';

/**
 * Typografischer Platzhalter-Schriftzug.
 *
 * Das offizielle Vereinswappen liegt uns hier nicht vor. Sobald es als SVG
 * vorliegt: unter public/crest.svg ablegen und diese Komponente durch
 * <img src="/crest.svg" className="b-header__logo-image" alt="VfL Bochum 1848" />
 * ersetzen. Bis dahin steht hier ein reiner Schriftzug — bewusst kein
 * nachgezeichnetes Wappen.
 */
export default function Logo({ onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="b-header__logo" onClick={onClick} aria-label="Zur Startseite">
      <span
        className="b-header__logo-image"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          lineHeight: 1,
          letterSpacing: '.02em',
        }}
      >
        <span style={{ fontSize: 'var(--step--2)', fontWeight: 700, textTransform: 'uppercase', opacity: .6 }}>
          VfL Bochum
        </span>
        <span style={{ fontSize: 'var(--step-1)', fontWeight: 900, textTransform: 'uppercase' }}>
          1848<span style={{ opacity: .6 }}>TV</span>
        </span>
      </span>
    </Tag>
  );
}
