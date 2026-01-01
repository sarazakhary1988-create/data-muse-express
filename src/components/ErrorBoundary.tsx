import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // DEBUG: Log error details immediately
    console.error('[ErrorBoundary] getDerivedStateFromError:', error.message);
    console.error('[ErrorBoundary] Error stack:', error.stack);
    
    // Check for React #418 specifically
    if (error.message.includes('418') || error.message.includes('Objects are not valid')) {
      console.error('[ErrorBoundary] DETECTED React #418 - Objects rendered as React child!');
      console.error('[ErrorBoundary] Check console for [ReportViewer], [ResultsView], [ResultCard], [ResearchTrace] debug output');
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] componentDidCatch:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const isReactError = error?.message?.includes('#418') || error?.message?.includes('Minified React error');
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full bg-card border-destructive/20">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl text-foreground">
                {isReactError ? 'Rendering Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">
                {isReactError 
                  ? 'A component failed to render properly. This is usually caused by invalid data being passed to a component.'
                  : 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
              
              {error && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-32">
                  {error.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1 gap-2"
                  onClick={this.handleReload}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 gap-2"
                  onClick={this.handleGoHome}
                >
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/60 text-center pt-2">
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for functional components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
