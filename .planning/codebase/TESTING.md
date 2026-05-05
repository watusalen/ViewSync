# Testing Practices

## Frameworks
- **Jest**: Primary test runner.
- **ts-jest**: For TypeScript support in tests.

## Current State
- **Backend API**:
  - Contains unit tests (`.spec.ts`) and E2E tests (`test/jest-e2e.json`).
  - Integrated into `package.json` scripts: `npm run test`, `npm run test:e2e`.
- **Desktop Transmitter**: No tests detected in `src/` or `electron/`.
- **Viewer Web**: No tests detected.
- **Shared Types**: No tests detected.

## Strategy
- **Unit Testing**: Focus on business logic and state management.
- **E2E Testing**: Important for real-time flow (Socket.io interactions).
- **Integration**: Need to implement testing for real-time broadcasts.

---
*Last updated: 2026-05-04*
