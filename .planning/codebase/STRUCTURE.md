# Directory Structure

## Overview
```text
ViewSync/
├── apps/
│   ├── backend-api/           # NestJS Backend
│   ├── desktop-transmissor/   # Electron App (React + Vite)
│   └── viewer-web/            # Next.js Viewer App
├── packages/
│   ├── shared-types/          # Shared TS interfaces
│   └── ui-components/         # [EMPTY] Shared UI components
├── .planning/                 # GSD Planning & Codebase Map
└── .claude/                   # GSD Instructions & Skills
```

## Detailed Layout

### apps/backend-api
- `src/main.ts`: Entry point.
- `src/app.module.ts`: Root module.
- `src/signaling.gateway.ts`: Socket.io logic for central streaming.

### apps/desktop-transmissor
- `electron/main.ts`: Electron main process & local server logic.
- `src/main.tsx`: React renderer entry point.
- `src/App.tsx`: Main UI logic for the transmitter.

### apps/viewer-web
- `app/`: Next.js App Router directory.
- `public/`: Static assets.

### packages/shared-types
- `src/index.ts`: Exported types for RoomState, StreamConfig, etc.

---
*Last updated: 2026-05-04*
