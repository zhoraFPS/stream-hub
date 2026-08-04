import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './ui/Icon';
import { SPONSORS } from '../constants/sponsors';

/**
 * Fußzeile mit den Pflichtangaben.
 *
 * Die Social-Media-Adressen zeigen auf die offiziellen Kanäle des Vereins;
 * eingebettet wird nichts, es sind reine Verweise — dadurch fließen keine
 * Daten an die Netzwerke, solange niemand klickt.
 */
const SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/vflbochum1848ev/' },
  { label: 'Facebook',  href: 'https://www.facebook.com/vflbochum/' },
  { label: 'YouTube',   href: 'https://www.youtube.com/@vflbochum1848' },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@vflbochum1848' },
  { label: 'X',         href: 'https://x.com/VfLBochum1848eV' },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/company/vfl-bochum-1848/' },
];

const LEGAL = [
  { label: 'Impressum', to: '/impressum' },
  { label: 'Datenschutz', to: '/datenschutz' },
  { label: 'Nutzungsbedingungen', to: '/nutzungsbedingungen' },
];

export default function Footer() {
  return (
    <footer className="b-footer">
      <section className="b-sponsors" aria-label="Partner des VfL Bochum 1848">
        <div className="b-sponsors__inner">
          <div className="b-kicker b-sponsors__kicker">Unsere Partner</div>
          <ul className="b-sponsors__list">
            {SPONSORS.map(sponsor => (
              <li key={sponsor.name}>
                <a
                  className="b-sponsor"
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={sponsor.name}
                >
                  <img className="b-sponsor__logo" src={sponsor.logo} alt={sponsor.name} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="b-footer__inner">
        <div className="b-footer__block">
          <div className="b-kicker">1848TV</div>
          <p className="b-copy" style={{ marginTop: 'var(--space-3xs)' }}>
            Das Medienportal des VfL Bochum 1848.
          </p>
          <a
            href="https://www.vfl-bochum.de"
            className="b-footer__link"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 'var(--space-2xs)', display: 'inline-flex' }}
          >
            vfl-bochum.de
            <Icon name="arrow-up-right" size={16} />
          </a>
        </div>

        <nav className="b-footer__block" aria-label="Rechtliches">
          <div className="b-kicker">Rechtliches</div>
          <ul className="b-footer__list">
            {LEGAL.map(item => (
              <li key={item.to}>
                <Link className="b-footer__link" to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="b-footer__block" aria-label="Soziale Netzwerke">
          <div className="b-kicker">Folgen</div>
          <ul className="b-footer__list">
            {SOCIAL.map(item => (
              <li key={item.label}>
                <a
                  className="b-footer__link"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label}
                  <Icon name="arrow-up-right" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="b-footer__block">
          <div className="b-kicker">Hilfe</div>
          <ul className="b-footer__list">
            <li>
              <a className="b-footer__link" href="mailto:support@vfl-bochum.de">
                support@vfl-bochum.de
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="b-footer__base">
        <span className="b-meta-line__item">VfL Bochum 1848 · 1848TV</span>
      </div>
    </footer>
  );
}
