import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './ui/Icon';

export default function QRCodeModal({ isOpen = true, onClose, systemInfo }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  // Die URL wird aus der aktiven Verbindung abgeleitet, damit sie auch bei
  // wechselnder DHCP-Adresse stimmt.
  const currentHost = window.location.hostname || 'localhost';
  const currentPort = window.location.port;
  const portalUrl = `http://${currentHost}${currentPort ? `:${currentPort}` : ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="b-modal" role="dialog" aria-modal="true" aria-label="Zugriff im Netzwerk" onClick={onClose}>
      <div className="b-modal__dialog" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="b-modal__header">
          <div>
            <h2 className="b-heading b-heading--500">Im Netzwerk öffnen</h2>
            <p className="b-meta-line__item">Handy, Tablet oder Smart-TV</p>
          </div>
          <button type="button" className="b-button b-button--ghost b-button--s" onClick={onClose} aria-label="Schließen">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="b-modal__body">
          <p className="b-copy">
            Scanne den Code, um 1848TV auf einem anderen Gerät im selben Netzwerk zu öffnen.
          </p>

          <div style={{
            background: 'var(--color-white-400)',
            padding: 'var(--space-s)',
            alignSelf: 'center',
            lineHeight: 0,
          }}>
            <QRCodeSVG value={portalUrl} size={192} bgColor="#ffffff" fgColor="#041825" level="H" />
          </div>

          <div className="b-field">
            <span className="b-label">Adresse</span>
            <div style={{ display: 'flex', gap: 'var(--space-3xs)' }}>
              <input className="b-input b-input--mono" readOnly value={portalUrl} />
              <button type="button" className="b-button b-button--secondary b-button--s" onClick={handleCopy}>
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </div>

          <div className="b-panel b-panel--bare">
            <div className="b-meta-line">
              <span className="b-meta-line__item">Host {systemInfo?.hostname || 'unbekannt'}</span>
              <span className="b-meta-line__item">IP {currentHost}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
