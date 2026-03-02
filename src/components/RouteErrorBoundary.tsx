import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
  /** Which page crashed — shown in the error card */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary: wraps individual pages so a crash in one
 * page doesn't take down the entire app. Shows a full-page recovery UI
 * with both "Try Again" and "Back to Home" options.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      error,
      source: "boundary",
      context: `[route:${this.props.pageName ?? "unknown"}] ${info.componentStack ?? ""}`,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
            <p className="font-display text-xl font-bold text-foreground">
              {this.props.pageName
                ? `Error loading ${this.props.pageName}`
                : "Something went wrong"}
            </p>
            <p className="mt-2 max-w-md font-body text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred while loading this page."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-body text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <a
                href="/"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
