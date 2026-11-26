export const CRASH_STORAGE_KEY = "cyberlink.crash-diagnostics.v1";
const MAX_REPORTS = 5;
const MAX_NAVIGATION = 20;
const STATIC_PAGES = new Set([
  "/", "/privacy", "/terms", "/contact", "/studio", "/auth", "/auth/callback",
  "/login", "/signup", "/forgot-password", "/reset-password", "/onboarding",
  "/affiliate", "/seller-register", "/seller-dashboard", "/monetization", "/messages",
  "/cyber-arena", "/cyber-arena/login", "/cyber-arena/signup", "/cyber-arena/forgot-password",
  "/cyber-arena/reset-password", "/cyber-arena/lobby", "/cyber-arena/profile",
  "/cyber-streamer", "/connectors", "/connectors/social", "/integrations",
  "/theater", "/shop", "/security", "/community-guidelines", "/verification",
  "/verification-success", "/subscription", "/affiliate-links", "/cyber-world", "/miners",
  "/token-purchase", "/profile", "/dashboard", "/settings", "/trading", "/exchange",
  "/terminal", "/moderation", "/backgrounds", "/ceo", "/voyage", "/advertise",
  "/.lovable/oauth/consent", ...["accounts", "content", "analytics", "inbox", "webhooks", "activity", "permissions"].map(t => `/social/${t}`),
]);

/** Retain route shapes, never callback queries, fragments, usernames or record IDs. */
export function diagnosticPage(path: string): string {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (STATIC_PAGES.has(pathname)) return pathname;
  if (/^\/connectors\/social\/[^/]+\/callback$/.test(pathname)) return "/connectors/social/:provider/callback";
  if (/^\/connectors\/social\/[^/]+$/.test(pathname)) return "/connectors/social/:provider";
  for (const prefix of ["profile", "product", "store", "live", "post", "kit", "r"]) {
    if (new RegExp(`^/${prefix}/[^/]+$`).test(pathname)) return `/${prefix}/:id`;
  }
  return pathname.startsWith("/cyber-arena/") ? "/cyber-arena/*" : "/:unknown";
}

/** Do not serialize exception objects, DOM, request bodies, sessions or account context. */
export function redactDiagnosticText(text: string): string {
  return text.slice(0, 16_000)
    .replace(/https?:\/\/[^\s)\]"'<>]+/gi, url => {
      try {
        const parsed = new URL(url);
        // Source file names and line/column are useful; other URLs retain only route shapes.
        if (/\/(?:src|assets|node_modules)\//.test(parsed.pathname)) {
          return parsed.pathname.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, "[id]");
        }
        return diagnosticPage(parsed.pathname);
      } catch { return "[url]"; }
    })
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:password|secret|token|access_token|refresh_token|api[_-]?key|authorization|code|state)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "[credential redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, "[id]")
    .replace(/\b[A-Za-z0-9_-]{32,}(?:\.[A-Za-z0-9_-]+)*\b/g, "[redacted]")
    .replace(/([?#])[^\s)\]"'<>]+/g, "$1[redacted]")
    .replace(/"[^"\n]*"|'[^'\n]*'/g, "[quoted value]")
    .slice(0, 8_000);
}

export interface NavigationEntry { page: string; at: string; kind: "initial" | "push" | "replace" | "pop" }
export interface CrashReport {
  version: 1;
  id: string;
  at: string;
  kind: "render" | "runtime" | "unhandled-rejection";
  page: string;
  error: { name: string; message: string; stack: string; componentStack: string };
  navigation: NavigationEntry[];
}

let navigation: NavigationEntry[] = [];
let reports: CrashReport[] = [];
let installed = false;

function restoreReports(): void {
  reports = [];
  try {
    const stored = window.sessionStorage.getItem(CRASH_STORAGE_KEY);
    if (!stored || stored.length > 250_000) return;
    const values: unknown = JSON.parse(stored);
    if (!Array.isArray(values)) return;
    for (const value of values.slice(-MAX_REPORTS)) {
      if (!value || value.version !== 1 || !/^crash-\d+-[a-z0-9]{1,8}$/.test(value.id)
        || !["render", "runtime", "unhandled-rejection"].includes(value.kind)
        || typeof value.at !== "string" || !Number.isFinite(Date.parse(value.at))
        || typeof value.page !== "string" || !value.error || !Array.isArray(value.navigation)) continue;
      const text = (field: unknown) => typeof field === "string" ? redactDiagnosticText(field) : "";
      reports.push({
        version: 1, id: value.id, at: new Date(value.at).toISOString(), kind: value.kind,
        page: diagnosticPage(value.page),
        error: { name: text(value.error.name), message: text(value.error.message), stack: text(value.error.stack), componentStack: text(value.error.componentStack) },
        navigation: value.navigation.slice(-MAX_NAVIGATION).flatMap((entry: unknown) => {
          if (!entry || typeof entry !== "object") return [];
          const item = entry as Partial<NavigationEntry>;
          if (typeof item.page !== "string" || typeof item.at !== "string" || !Number.isFinite(Date.parse(item.at))
            || !item.kind || !["initial", "push", "replace", "pop"].includes(item.kind)) return [];
          return [{ page: diagnosticPage(item.page), at: new Date(item.at).toISOString(), kind: item.kind }];
        }),
      });
    }
  } catch { /* Corrupt or unavailable diagnostic storage does not affect auth. */ }
}

export function getCrashReports(): CrashReport[] {
  return JSON.parse(JSON.stringify(reports)) as CrashReport[];
}

export function captureCrash(kind: CrashReport["kind"], error: unknown, componentStack = ""): CrashReport {
  const knownError = error instanceof Error;
  const report: CrashReport = {
    version: 1,
    id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    kind,
    page: diagnosticPage(typeof window === "undefined" ? "/" : window.location.pathname),
    error: {
      name: knownError ? redactDiagnosticText(error.name) : "UnknownError",
      message: redactDiagnosticText(knownError ? error.message : typeof error === "string" ? error : "Non-Error exception (payload omitted)"),
      stack: knownError ? redactDiagnosticText(error.stack ?? "") : "",
      componentStack: redactDiagnosticText(componentStack),
    },
    navigation: navigation.map(entry => ({ ...entry })),
  };
  reports = [...reports, report].slice(-MAX_REPORTS);
  try { window.sessionStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(reports)); } catch { /* Diagnostics never block recovery. */ }
  console.error("[cyberlink-crash]", report);
  return report;
}

/** Install once outside providers; history hooks observe navigation even when React fails. */
export function installCrashDiagnostics(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;
  restoreReports();
  if (reports.length) console.info("[cyberlink-crash] Previous reports in this tab", getCrashReports());
  const record = (kind: NavigationEntry["kind"]) => {
    const page = diagnosticPage(window.location.pathname);
    navigation = [...navigation, { page, at: new Date().toISOString(), kind }].slice(-MAX_NAVIGATION);
  };
  record("initial");
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  const push: History["pushState"] = function (...args) { originalPush.apply(this, args); record("push"); };
  const replace: History["replaceState"] = function (...args) { originalReplace.apply(this, args); record("replace"); };
  window.history.pushState = push;
  window.history.replaceState = replace;
  const onPop = () => record("pop");
  const onError = (event: ErrorEvent) => {
    // Resource load events have no useful exception; do not capture DOM targets.
    if (event.message || event.error instanceof Error) {
      captureCrash("runtime", event.error instanceof Error ? event.error : new Error(event.message));
    }
  };
  const onRejection = (event: PromiseRejectionEvent) => captureCrash("unhandled-rejection", event.reason);
  window.addEventListener("popstate", onPop);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    if (window.history.pushState === push) window.history.pushState = originalPush;
    if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    installed = false;
    navigation = [];
  };
}

export function downloadCrashReports(): void {
  const blob = new Blob([JSON.stringify(getCrashReports(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cyberlink-crash-report.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}