import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-orange-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="font-display text-xl font-bold tracking-tight">
                Vynorix Arena Error
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-zinc-950 font-semibold text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Arena</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
