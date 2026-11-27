import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[UniverseExplorer]', error, info);
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="grid h-full place-items-center bg-base text-ink-subtle">
          <div className="max-w-sm text-center text-sm">
            <div className="mb-2 text-lg">কিছু ভুল হয়েছে</div>
            <div className="text-xs text-ink-muted">{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
