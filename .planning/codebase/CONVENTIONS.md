# Coding Conventions

## General Standards
- **TypeScript**: Mandatory for all new code. Strict mode is preferred.
- **Naming**:
  - Files: `kebab-case` (e.g., `signaling.gateway.ts`).
  - React Components: `PascalCase` (e.g., `App.tsx`).
  - Variables/Functions: `camelCase`.
- **Formatting**: Managed by Prettier. Use `npm run format` (in backend).

## React (Desktop & Viewer)
- **Functional Components**: Use Hooks (`useState`, `useEffect`) exclusively.
- **Styling**: Tailwind CSS 4.
- **State Management**: Local state (`useState`) for UI; Socket.io for shared state.

## Backend (NestJS)
- **Modular Structure**: Group by feature.
- **Decorators**: Use NestJS decorators for routing and DI.
- **Type Safety**: Use shared types from `@mirror/shared-types`.

## Real-time (Socket.io)
- **Event Naming**: `prefix:action` format (e.g., `host:frame`, `room:state_update`).
- **Volatility**: Use `volatile` for high-frequency data like video frames to reduce overhead.

---
*Last updated: 2026-05-04*
