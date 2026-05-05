# Technology Stack

## Languages & Runtimes
- **JavaScript/TypeScript**: Primary language across the entire monorepo.
- **Node.js**: Runtime for backend and desktop build tools.
- **Electron**: Runtime for the desktop transmitter application.

## Frameworks & Libraries
### Backend (apps/backend-api)
- **NestJS**: Server-side framework.
- **Socket.io**: Real-time communication (Signaling and Frame broadcast).
- **RxJS**: Functional reactive programming.

### Desktop Transmitter (apps/desktop-transmissor)
- **React 18**: UI Library.
- **Vite**: Build tool and dev server.
- **Electron 30**: Desktop integration.
- **Socket.io / Socket.io-client**: Real-time communication.
- **Express**: Internal server for local network streaming.
- **Tailwind CSS 4**: Styling.

### Viewer Web (apps/viewer-web)
- **Next.js 16**: React framework.
- **React 19**: UI Library.
- **Socket.io-client**: Real-time communication.
- **Tailwind CSS 4**: Styling.

## Infrastructure & Dev Tools
- **NPM Workspaces**: Monorepo management.
- **ESLint**: Linting.
- **Prettier**: Formatting.
- **Jest**: Testing (primarily in backend).
- **TypeScript**: Static typing.

## Shared Packages
- **@mirror/shared-types**: Shared TypeScript interfaces and types.

---
*Last updated: 2026-05-04*
