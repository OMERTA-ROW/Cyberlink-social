# Blank-screen recovery — 2026-11-26

## Rule and scope
A page failure must leave visible recovery controls, not an empty white screen.

Read `src/main.tsx` and the full route registry in `src/App.tsx`: every route, including login/signup/recovery/callback, home/dashboard/settings/profile, Connectors/Social/Integrations, Arena, commerce, media, trading, and space routes, shares the same application root. Previously no boundary protected that root. The new boundary wraps all routes and shared providers without editing their behavior. Shared background, assistant and cart rendering failures are also contained. No database function or background job renders this root; no backend changes are needed for this containment rule.

Also read the authentication guard, callback, home, dashboard loading path, shared layout loading path, wallet provider and Voyage boundary. The guard has a visible restoration state and a bounded verification request. Callback errors render recovery links. Voyage already has a renderer fallback. Home/dashboard and shared providers did not have application-level render containment; the new outer boundary supplies it. Asynchronous request failures and module-import failures are not caught by React error boundaries.

## Changes
- `src/components/AppErrorBoundary.tsx`: visible reload/sign-in recovery after a render crash, without clearing sessions or changing stored data.
- `src/components/AppErrorBoundary.test.ts`: recovery transition and healthy-page preservation tests.
- `src/main.tsx`: install recovery outside all providers.
- `AGENTS.md`: record containment rule.
- `roadmap.md`: track the remaining diagnosis accurately.

## Evidence
- 18 tests passed across four suites: boundary, auth session, auth redirect and auth guard.
- Preview build harness: build OK at 11:15:26 UTC.
- Before changes: signed-in `/login` redirected to `/dashboard`; `/`, `/dashboard`, `/settings`, `/connectors`, `/integrations` each rendered nonempty UI with no page errors.
- Deliberately injected an App render exception in Playwright: recovery heading and both actions appeared. Clicked Reload page after removing injection: real login form returned. Screenshot visually reviewed.
- Desktop signed-in login-to-dashboard and home hard refresh passed after changes, with no page errors.
- Mobile 390×844 login and hard refresh passed separately with reduced motion.

## Limits
The user's original white screen was not reproduced and its root cause is not established. This change prevents unhandled React rendering errors from producing a blank page; it is not proof that the original failure is fixed. A longer desktop/mobile signed-in route sweep stalled while reading the dashboard body, so the remaining post-change hard-refresh matrix is not verified. Telemetry also contained a stories/profile relationship error and transient fetch failures; they are not established causes of the white screen and were left unchanged. No account, permission, credential, scene, styling or backend changes; nothing published.