import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cleantech-950 flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-cleantech-900 border border-danger-crimson/40 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-xl bg-danger-crimson/15 border border-danger-crimson/30 flex items-center justify-center text-danger-crimson">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="font-heading text-xl font-bold text-white">Interface Recovery Active</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              A temporary display glitch occurred while parsing state. The underlying on-chain contract and funds on StudioNet remain 100% safe.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-cleantech-950 border border-cleantech-750 text-[11px] font-mono text-danger-crimson text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-mint-neon text-cleantech-950 font-heading font-bold text-xs uppercase tracking-wider hover:bg-emerald-300 transition shadow-mint-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Command Deck</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
