import React from 'react';
import Icon from './Icon';

/**
 * Abschnittskopf nach dem Muster von vfl-bochum.de:
 * optionaler Presenter darüber, große Uppercase-Headline, direkt daneben
 * ein Kicker-Link, darunter die Filter-Chips.
 */
export default function SectionTitle({ title, count, presenter, action, children }) {
  return (
    <div className="b-section-title">
      {presenter && <div className="b-section-title__presenter">{presenter}</div>}

      <div className="b-section-title__main">
        <h2 className="b-heading b-heading--600">
          {title}
          {count != null && (
            <span style={{ opacity: .4, marginLeft: '.35em' }}>{count}</span>
          )}
        </h2>

        {action && (
          <button className="b-section-title__link" onClick={action.onClick} type="button">
            <span className="b-kicker">{action.label}</span>
            <span className="b-section-title__link-icon">
              <Icon name="arrow-right" size={20} />
            </span>
          </button>
        )}
      </div>

      {children && <div className="b-section-title__chips">{children}</div>}
    </div>
  );
}
