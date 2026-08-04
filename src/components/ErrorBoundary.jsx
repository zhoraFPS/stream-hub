import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('1848TV ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-s)',
      }}>
        <div className="b-panel b-panel--l" style={{ maxWidth: 'var(--max-width-s)', width: '100%' }}>
          <div className="b-kicker" style={{ color: 'var(--color-error)' }}>Fehler</div>
          <h1 className="b-heading b-heading--500" style={{ marginBlock: 'var(--space-2xs)' }}>
            Die Seite konnte nicht geladen werden
          </h1>
          <p className="b-copy">
            Lade die Seite neu. Bleibt der Fehler bestehen, melde ihn mit der folgenden Meldung.
          </p>
          <pre className="b-input b-input--mono" style={{
            marginBlock: 'var(--space-s)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 'var(--step--2)',
          }}>
            {String(this.state.error)}
          </pre>
          <div className="b-row">
            <button className="b-button b-button--primary b-button--s" onClick={() => window.location.reload()}>
              Neu laden
            </button>
            <button className="b-button b-button--secondary b-button--s" onClick={() => window.location.assign('/')}>
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }
}
