import React from "react";
import ErrorFallback from "./ErrorFallback";

// Catches render errors in routed pages so a crash shows a friendly message
// instead of leaving the app frozen on a blank screen. resetKey (the route
// pathname) clears the error automatically when the user navigates away.
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
