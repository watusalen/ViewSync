# Technical Concerns & Debt

## Architecture & Code
- **Logic Duplication**: Real-time room management and frame broadcasting are duplicated between `apps/backend-api/src/signaling.gateway.ts` and `apps/desktop-transmissor/electron/main.ts`. These should ideally be unified or shared.
- **Empty Packages**: `packages/ui-components` is currently empty and has no `package.json`.
- **Security**: `ELECTRON_DISABLE_SECURITY_WARNINGS` is set to `true`. Web security is disabled in Electron `webPreferences`.
- **Performance**: Video frames are broadcast as base64/data strings. This might be inefficient for high-resolution or high-FPS streaming. Consider binary streams or WebRTC.

## Infrastructure
- **Hardcoded Ports**: Backend uses port 3000, Desktop local server uses port 80. Port 80 often requires admin privileges on some systems.
- **Dependency Versions**: Next.js 16 and React 19 are being used (cutting edge), ensure stability across the monorepo.
- **Missing Tests**: No tests for the frontend apps (Desktop and Viewer).

---
*Last updated: 2026-05-04*
