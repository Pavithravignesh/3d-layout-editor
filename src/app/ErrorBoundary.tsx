import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from './monitoring';

type Props = { fallback: ReactNode; children: ReactNode };

/** Keeps the panels usable if the 3D view fails, e.g. on a machine without WebGL. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('3D view failed', error);
    reportError(error, { area: '3d-view', componentStack: info.componentStack });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
