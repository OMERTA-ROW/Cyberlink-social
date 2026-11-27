# Cyberlink Social — development roadmap

Copyright © 2026 OMERTA-ROW. All rights reserved for proprietary material, subject to existing licenses and third-party rights.

## Product direction
A unified social and internet dashboard with connected accounts, communications, content management and authorized distribution. Preserve existing branding and interface; distinguish proposed functionality from verified runtime.

## Integration priorities
- Audit existing screens and data flows; classify live, unverified, demo and blocked functionality.
- Implement authorized provider OAuth, starting with Discord where supported. Use scoped permissions, secure token storage, revocation and clear connection status. Never simulate successful connections.
- Build a unified account and content dashboard using provider-supported APIs. Respect platform terms, rate limits and privacy boundaries.
- Provide draft, preview, scheduling and distribution workflows with explicit authorization, per-platform status, duplicate prevention, failure recovery and audit history. No automatic public publishing without consent.
- Provide social intelligence and analytics using authorized data; separate facts from estimates. Integrate with shared intelligence and maintenance services only through scoped, reviewed contracts.
- Preserve user control, moderation, account isolation, accessibility and responsive design.

## Acceptance
Test OAuth success and denial, expired tokens, disconnect, permission boundaries, content preview and scheduling, duplicate prevention, provider errors, tenant isolation and responsive UI. Label demos until verified with authorized end-to-end evidence. Report changed files, test evidence and owner blockers before release.

Documentation only; no implementation, deployment, or live integration is claimed. Proprietary internal architecture and credentials are excluded from this public repository.
