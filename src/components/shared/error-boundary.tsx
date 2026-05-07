"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return { hasError: true, errorMessage: message };
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // Sentry captures via next.config instrumentation
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#450A0A]">
            <AlertCircle
              className="h-6 w-6 text-[#EF4444]"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-[#FAFAFA]">Algo se rompió</p>
            <p className="text-sm text-[#A1A1AA]">Intentá de nuevo.</p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 rounded-lg border border-[#3F3F46] px-4 py-2 text-sm font-medium text-[#FAFAFA] min-h-[44px] hover:bg-[#18181B] transition-colors"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
