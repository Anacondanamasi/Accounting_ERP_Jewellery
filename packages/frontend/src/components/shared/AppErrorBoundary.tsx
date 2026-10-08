import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI crash", error, info);
  }

  private onReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div className="w-full max-w-lg rounded-card border border-ruby/25 bg-card p-6 shadow-card">
          <h1 className="font-display text-2xl font-semibold text-charcoal">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The page hit an unexpected issue. Please reload and try again.
          </p>
          <button
            className="mt-5 h-10 rounded-btn bg-gold px-4 text-sm font-medium text-white"
            onClick={this.onReload}
            type="button"
          >
            Reload application
          </button>
        </div>
      </div>
    );
  }
}
