# Frontend dependency review — 15 October 2026

Registry checks used `npm audit --json` and `npm audit --omit=dev --json`.
The final upgrade reports are saved as
[`upgrade-frontend-audit.json`](../docs/validation/2026-10-15/upgrade-frontend-audit.json)
and [`upgrade-frontend-production-audit.json`](../docs/validation/2026-10-15/upgrade-frontend-production-audit.json).

The full dependency tree went from 24 findings (including 3 critical), through
five inherited build findings, to **zero findings** after the Tailwind 4
migration. The production audit also reports **zero findings**. This supersedes
the earlier reports. An advisory database result does not certify the absence
of application defects.

## Remediation

- Vite 5.4.21 → 6.4.4. The previous dev configuration listened on every network
  interface on Windows, matching the exposure described in
  [GHSA-fx2h-pf6j-xcff](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff).
  The dev server now binds to `127.0.0.1` by default. Explicit `--host` remains
  available for deliberate network development.
- Vitest and its V8 coverage adapter 1.6.1 → 4.1.11. This removes the vulnerable
  older Vite-node/Tinypool chain and addresses the
  [Vitest API/UI advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp).
  The project uses `vitest run`, not an exposed test UI.
- TypeScript ESLint parser/plugin 7.x → 8.71.2. Their declared peers support
  the existing ESLint 8.57.1 and TypeScript 5.5.4, without an ESLint configuration migration.
- Compatible lockfile updates address vulnerable brace-expansion, js-yaml,
  nanoid, PostCSS and source-map-js versions.
- `postcss-selector-parser` is pinned by an npm override to 7.1.6 to address
  [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
  The previous Tailwind 3 and postcss-nested pipeline used this version.
  Production CSS was byte-identical before and after that initial override:
  `cc8b225db10c56eb0a8cf91834f76a4e36408eb14b8cba5ca3cdc5f7c66d42a5` (SHA-256).

## Completed Tailwind migration

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
affected the old build chain through `braces <=3.0.3`. Its previous paths were:

```text
tailwindcss@3.4.19 → chokidar@3.6.0 → braces@3.0.3
tailwindcss@3.4.19 → micromatch@4.0.8 → braces@3.0.3
tailwindcss@3.4.19 → fast-glob@3.3.3 → micromatch@4.0.8 → braces@3.0.3
```

The five entries represented one inherited stack-exhaustion defect. The upgrade
now uses **tailwindcss 4.3.3** and **@tailwindcss/postcss 4.3.3**, removing that
dependency chain. It explicitly loads the existing theme, sources application
components and retains the old neutral border default. The selector-parser
override remains recorded; the old Tailwind/PostCSS-nested chain is not used.

Tailwind 4 targets modern browsers. Its official
[upgrade guide](https://tailwindcss.com/docs/upgrade-guide) lists Safari 16.4+,
Chrome 111+ and Firefox 128+. Older browsers were not added as a support target.
The production Docker stage contains nginx and built assets, without Node tools.

## Verification

- `npm run lint`: passed.
- `npm run build`: passed, Vite 6.4.4.
- Integrated `vitest run --coverage` with CI thresholds: 159 tests in 29 files passed.
  Final percentages are recorded in [Integration review](../docs/INTEGRATION_REVIEW.md).
  The existing canvas/decorative exclusions remain declared in `vite.config.ts`;
  these checks do not establish comprehensive visual coverage.
- Coverage now explicitly includes source files and excludes test helpers;
  the story topology component is included because it contains identity and
  relationship logic as well as rendering.
- New checks cover Project Lab, private Casebook capture and revision conflicts,
  saved-case exports and Unicode-safe spans. Desktop/mobile browser checks
  cover layout and offline behavior. Authenticated full-stack browser checks
  await the user's Docker recovery.
