# Earlier workspace UI restored — 21 October 2026

The visual baseline is `aa0056c` (`codex/product-simplification`), the version
previously displayed on localhost. Its presentation was restored within the
current feature architecture, preserving current API and routing behavior.

Restored the earlier sidebar/topbar, Inter workspace typography, rounded surfaces,
direct article search, article result rows, compact tools directory, and the
Overview / Article / Claims navigation with optional investigation tabs. Tool help
and connection settings are collapsed again. The original landing globe and
landing typography remain available.

The current Story map remains in Explore & research. All 22 graph components,
libraries, map API and release-navigation files match their pre-restoration
SHA-256 hashes. Map-specific typography is scoped separately so restoring the
workspace's fonts does not restyle the current graph.

The active local map is unchanged:

- Release `31c6b6ed-8000-4a62-9440-8d49dce41d76`.
- 10,879 local articles, 138 topics, 16,136 semantic streets.
- The 93 unsupported-language articles remain in their labeled inset.

Validation: 337 frontend tests, lint, three architecture tests, architecture
boundary checks, and the production TypeScript/Vite build pass. The frontend was
rebuilt and restarted on `http://localhost:3000`; browser checks confirmed the
earlier layout, six article result rows, one content landmark, and the current
graph's unchanged data and fonts. Existing release-aware article links, source
filters, pagination, comparison drafts, and modal focus behavior remain covered.

All 74 previously preserved research files still match their original hashes.
No backend change, map regeneration, source-data mutation or GitHub push was part
of this UI restoration. Recovery manifests and screenshots are under the ignored
`.local-deployment/ui-restore-20261021/` directory.
