import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogIn } from "lucide-react";

interface Props { children: ReactNode }
interface State { failed: boolean }

/** Keep a recoverable screen mounted even if a route or shared provider crashes. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Never include account data or credentials from an exception in diagnostics.
    console.error("CyberLink page rendering failed; recovery controls are available.");
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section role="alert" className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">This page couldn’t load</h1>
          <p className="text-muted-foreground">Try reloading, or return to sign in. Your saved account data has not been changed.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" />Reload page</Button>
            <Button variant="outline" onClick={() => window.location.assign("/login")}><LogIn className="mr-2 h-4 w-4" />Return to sign in</Button>
          </div>
        </section>
      </main>
    );
  }
}