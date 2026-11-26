import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogIn, Download } from "lucide-react";
import { captureCrash, downloadCrashReports, type CrashReport } from "@/lib/crashDiagnostics";

interface Props { children: ReactNode }
interface State { failed: boolean; report?: CrashReport }

/** Keep a recoverable screen mounted even if a route or shared provider crashes. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ report: captureCrash("render", error, info.componentStack ?? "") });
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
            {this.state.report && <Button variant="outline" onClick={downloadCrashReports}><Download className="mr-2 h-4 w-4" />Download crash report</Button>}
          </div>
          {this.state.report && (
            <details className="text-sm">
              <summary className="cursor-pointer">Crash details</summary>
              <p className="mt-2 break-words">{this.state.report.id} · {this.state.report.page}</p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">{this.state.report.error.name}: {this.state.report.error.message}</pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}