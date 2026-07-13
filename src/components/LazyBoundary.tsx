import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class LazyBoundary extends Component<{ children: ReactNode; resetKey: string }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Inspector workspace failed to load", error, info.componentStack); }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: undefined });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="inspector-load-error" role="alert"><AlertTriangle size={22}/><strong>This workspace could not be loaded.</strong><small>{this.state.error.message}</small><button onClick={() => window.location.reload()}><RefreshCw size={12}/> Reload Lillith</button></div>;
  }
}
