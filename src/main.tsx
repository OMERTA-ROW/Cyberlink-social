import { createRoot } from "react-dom/client";
import { purgeCorruptAuthSessions } from "./lib/authSession";
import AppErrorBoundary from "./components/AppErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { installCrashDiagnostics } from "./lib/crashDiagnostics";

const stopCrashDiagnostics = installCrashDiagnostics();
if (import.meta.hot) import.meta.hot.dispose(stopCrashDiagnostics);

// Drop corrupted stored sessions (e.g. "[object Object]") before auth restores.
try { purgeCorruptAuthSessions(window.localStorage); } catch { /* storage unavailable */ }

const root = document.getElementById("root");
if (!root) throw new Error("Application root is unavailable");
createRoot(root).render(<AppErrorBoundary><App /></AppErrorBoundary>);
