import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureCrash, CRASH_STORAGE_KEY, diagnosticPage, getCrashReports, installCrashDiagnostics, redactDiagnosticText } from "./crashDiagnostics";

describe("local crash diagnostics", () => {
  let stop: () => void;
  let storage: Map<string, string>;
  let host: EventTarget & { location: { pathname: string }; history: { pushState: (...args: unknown[]) => void; replaceState: (...args: unknown[]) => void }; sessionStorage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } };
  beforeEach(() => {
    storage = new Map();
    const navigate = (_data: unknown, _unused: unknown, url: unknown) => {
      if (typeof url === "string") host.location.pathname = new URL(url, "https://app.example").pathname;
    };
    host = Object.assign(new EventTarget(), {
      location: { pathname: "/login" },
      history: { pushState: navigate, replaceState: navigate },
      sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } },
    });
    vi.stubGlobal("window", host);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    stop = installCrashDiagnostics();
  });
  afterEach(() => { stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("captures the failing page, error stack, component stack and recent navigation", () => {
    host.history.pushState(null, "", "/shop");
    host.history.replaceState(null, "", "/dashboard");
    const report = captureCrash("render", new TypeError("Cannot read properties of undefined"), "at Dashboard\nat App");
    expect(report.page).toBe("/dashboard");
    expect(report.error.name).toBe("TypeError");
    expect(report.error.message).toBe("Cannot read properties of undefined");
    expect(report.error.stack).toContain("TypeError");
    expect(report.error.componentStack).toContain("Dashboard");
    expect(report.navigation.map(n => [n.page, n.kind])).toEqual([["/login", "initial"], ["/shop", "push"], ["/dashboard", "replace"]]);
  });

  it("omits callback tokens, fragments and private route IDs", () => {
    expect(diagnosticPage("/auth/callback?code=sensitive#access_token=secret")).toBe("/auth/callback");
    expect(diagnosticPage("/profile/private-user")).toBe("/profile/:id");
    expect(diagnosticPage("/unexpected/private-name")).toBe("/:unknown");
    host.history.pushState(null, "", "/profile/private-user?token=sensitive");
    const report = captureCrash("runtime", new Error("test"));
    expect(JSON.stringify(report)).not.toContain("private-user");
    expect(report.page).toBe("/profile/:id");
  });

  it("redacts credentials and account values while preserving source file frames", () => {
    const text = redactDiagnosticText('Failed token=small-secret password="private pass" alice@example.com Bearer abc123 at https://app.example/src/pages/Auth.tsx:12:9?code=sensitive https://app.example/auth/callback?code=private#secret "private name"');
    for (const value of ["small-secret", "private pass", "alice@example.com", "abc123", "sensitive", "private name", "app.example"]) expect(text).not.toContain(value);
    expect(text).toContain("/src/pages/Auth.tsx:12:9");
    expect(text).toContain("/auth/callback");
  });

  it("never serializes arbitrary rejection payloads", () => {
    const report = captureCrash("unhandled-rejection", { password: "secret", account: "private" });
    expect(report.error.message).toBe("Non-Error exception (payload omitted)");
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("captures runtime errors and rejected promises without suppressing browser handling", () => {
    const runtime = Object.assign(new Event("error", { cancelable: true }), { error: new Error("runtime failure"), message: "runtime failure" });
    const rejection = Object.assign(new Event("unhandledrejection", { cancelable: true }), { reason: new Error("async failure") });
    host.dispatchEvent(runtime);
    host.dispatchEvent(rejection);
    expect(getCrashReports().map(r => r.kind)).toEqual(["runtime", "unhandled-rejection"]);
    expect(runtime.defaultPrevented).toBe(false);
    expect(rejection.defaultPrevented).toBe(false);
  });

  it("records back/forward navigation and bounds reports and breadcrumbs", () => {
    for (let i = 0; i < 30; i++) host.history.pushState(null, "", "/shop");
    host.location.pathname = "/login";
    host.dispatchEvent(new Event("popstate"));
    for (let i = 0; i < 8; i++) captureCrash("render", new Error(`Failure ${i}`));
    const reports = getCrashReports();
    expect(reports).toHaveLength(5);
    expect(reports[4].navigation).toHaveLength(20);
    expect(reports[4].navigation[19]).toMatchObject({ page: "/login", kind: "pop" });
    expect(reports[0].error.message).toBe("Failure 3");
  });

  it("retains sanitized reports after a reload without using account storage", () => {
    const original = captureCrash("render", new Error("reload trace"));
    stop();
    stop = installCrashDiagnostics();
    expect(getCrashReports()[0].id).toBe(original.id);
    expect(storage.has(CRASH_STORAGE_KEY)).toBe(true);
    expect([...storage.keys()]).toEqual([CRASH_STORAGE_KEY]);
  });

  it("keeps capture working when storage is blocked", () => {
    host.sessionStorage.setItem = () => { throw new Error("Storage denied"); };
    expect(captureCrash("render", new Error("failure")).error.message).toBe("failure");
    expect(getCrashReports()).toHaveLength(1);
  });

  it("ignores malformed saved reports and restores original history on cleanup", () => {
    stop();
    storage.set(CRASH_STORAGE_KEY, "not json");
    const push = host.history.pushState;
    stop = installCrashDiagnostics();
    expect(getCrashReports()).toEqual([]);
    stop();
    expect(host.history.pushState).toBe(push);
    host.dispatchEvent(Object.assign(new Event("error"), { error: new Error("after cleanup") }));
    expect(getCrashReports()).toEqual([]);
  });
});