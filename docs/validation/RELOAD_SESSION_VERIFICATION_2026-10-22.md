# Reload session verification — 22 October 2026

## Problem and resulting behaviour

Reloading Render ended sign-in because tokens existed only in page memory. The
frontend now restores a bounded tab session by rotating its refresh credential
and verifying `/auth/me` before route guards or protected screens mount. The
requested URL remains intact. See the
[design and security limits](../architecture/RELOAD_SESSION_RECOVERY.md).

## Verified locally

- 380 frontend tests passed in 49 files, including 13 new session-recovery cases.
- Coverage gates passed: lines 87.27%, statements 77.74%, functions 76.79%,
  branches 74.61% (required 60/60/60/50 respectively).
- ESLint, TypeScript/Vite production build, 121-file architecture check and
  three architecture regression tests passed. The existing large-bundle warning
  remains; it is not a new build failure.
- Recovery tests cover StrictMode/concurrent startup sharing, delayed `/me`,
  preserved search/deep-link state, pending approval, revoked/rejected accounts,
  malformed/expired storage, blocked storage, uncertain refresh timeout without
  automatic replay, late responses from old accounts and immediate logout cleanup.
- Real browser rehearsal at `http://127.0.0.1:3004`: synthetic viewer signs in,
  a full document reload returns to the authenticated search page with
  `#/dashboard/browse?q=ram&offset=0` intact, and Account shows the verified viewer.
  Explicit logout returns to sign-in; another reload remains signed out with
  the original destination preserved. A fresh login returns to that destination.
- Browser screenshot: ignored `output/reload-session/reload-account-confirmed.png`.
  Rehearsal uses the disposable SQLite/FakeRedis backend and copied archive on
  loopback port 8004, not production accounts or stores.

## Scope and remaining deployment

No backend code or schema changed, so no backend/model/benchmark rerun or
production migration is needed for this frontend change. Corpus data, published
release, account decisions and frozen scientific artifacts were not changed.
No independent scientific validation gate is closed by this UX fix.

This receipt records local checks only. GitHub push and Render deployment for
this new session change have not occurred. Existing open tabs from the previous
release require one fresh sign-in after upgrade to establish recovery state.
Real Render verification remains required after authorized deployment.
