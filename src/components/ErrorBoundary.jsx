import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('StreamHub ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-white flex items-center justify-center p-6 text-center">
          <div className="glass-panel p-8 max-w-md w-full rounded-xl border border-red-500/30 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Ein Fehler ist aufgetreten</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              {this.state.error && this.state.error.toString()}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.assign('/')}
                className="btn-primary text-xs"
              >
                <Home className="w-4 h-4" />
                Zur Startseite
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
