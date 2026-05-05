---
status: investigating
trigger: "Error: Build failed with 1424 errors: Could not resolve ./shared/src/utils/toKebabCase.mjs inside lucide-react"
created: 2026-05-04
updated: 2026-05-04
---

# Debug Session: esbuild-lucide-react

## Symptoms
- **Expected:** App opens and shows screens for transmission.
- **Actual:** Many terminal errors (1424+), app shows a white screen.
- **Error Messages:** `ERROR: Could not resolve "./shared/src/utils/toKebabCase.mjs"` and `DOMException: Could not start video source`.
- **Timeline:** Started after modifications to `App.tsx` and handling `lucide-react` type declarations.
- **Reproduction:** Run `npm run start:desktop` or `npm run dev --workspace=view-sync-desktop`.

## Current Focus
- **hypothesis:** Vite/esbuild pre-bundling is failing to resolve internal ESM modules of `lucide-react` due to workspace path complexities or cache corruption.
- **test:** Force dependency pre-bundling and check `node_modules` structure.
- **expecting:** A clean resolution of `lucide-react` dependencies.
- **next_action:** "gather initial evidence"

## Evidence
- **timestamp:** 2026-05-04T22:56:00Z
  - User reported 1424 errors related to path resolution in `lucide-react/dist/esm`.
  - Errors mention `../../../../../node_modules/lucide-react/dist/esm/createLucideIcon.mjs`.

## Eliminated
(none yet)
