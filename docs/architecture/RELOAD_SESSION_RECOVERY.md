# Session recovery on page reload

22 October 2026. Supersedes the earlier memory-only reload behaviour in existing
navigation plans and historical verification receipts. Those receipts are
historical, not current design instructions.

## Behaviour

The former session existed only in JavaScript memory. A document refresh erased
it, so route protection immediately returned the user to sign-in. The new
`SessionBootstrap` waits before mounting the application and its route effects.
It restores a saved session through the existing backend refresh-token rotation
and `/auth/me` endpoints. Only the verified response supplies identity, role and
approval state. Deep links, release IDs, filters, selected claims and graph view
coordinates remain in the requested URL.

Session storage contains only a rotating refresh credential and an absolute
eight-hour recovery deadline, scoped to the frontend origin, tab and API base.
The deadline does not slide on reload or refresh. Passwords, access tokens,
profiles, permissions, analysis and query results are not stored there. Login
saves the recovery credential only after identity verification. Rotation updates
the saved credential; logout and rejected sessions clear it. Before startup
rotation, the old record is consumed so an interrupted reload does not repeatedly
submit the same credential. Concurrent startup calls, including React StrictMode,
share one rotation. Account revision checks reject late old-account responses.

Expired/malformed records do not trigger a network request. Disabled browser
storage falls back to the prior in-memory behaviour. Refresh and verification
allow 60 seconds for the free backend to wake. Failed or uncertain recovery
clears saved state and offers sign-in with the requested destination retained;
it does not automatically replay a potentially consumed refresh token.

## Security boundary and limits

This is a bounded usability change to the existing bearer-token client, not a
claim of HttpOnly-cookie protection. A refresh credential in session storage is
readable by same-origin JavaScript and therefore exposed if that origin suffers
an XSS compromise. Never put it in local storage, URLs, logs or query caches.
Continue the existing CSP, input/output handling and server authorization checks.
No role/approval, token lifetime, CORS, API authentication or server revocation
rules are relaxed.

Session storage normally ends with a tab but browsers may restore it with a
restored browser session. Use explicit logout on shared devices; the eight-hour
deadline is the recovery bound. Copied tabs may inherit session storage and
compete for a rotating token, so uninterrupted cross-tab sign-in is not promised.
Cookie/BFF architecture on a shared first-party origin is a separate future
change; this implementation introduces no cross-site cookie dependency between
the existing Render origins. Existing open tabs need one fresh sign-in after
upgrade because the old release never saved recovery state.

No backend schema, migrations, corpus data, account controls or scientific
results change. Deployment must be verified separately from local checks.
