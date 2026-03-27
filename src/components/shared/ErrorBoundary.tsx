import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center py-[64px] px-[24px]">
          <div className="bg-[var(--surface2)] border border-[rgba(220,38,38,.3)] rounded-[10px] p-[24px] max-w-[480px] w-full">
            <div className="text-[#F87171] text-[16px] font-[700] mb-[8px]">⚠ Something went wrong</div>
            <div className="text-[13px] text-[var(--text-3)] leading-[1.6]">
              {this.state.error?.message ?? 'An unexpected error occurred. Refresh the page to try again.'}
            </div>
            <button
              className="mt-[16px] px-[14px] py-[7px] text-[12px] font-[600] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
