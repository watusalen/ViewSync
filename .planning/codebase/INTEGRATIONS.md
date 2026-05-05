# External Integrations

## Real-time Services
- **Socket.io**: Used for signaling and frame-by-frame video transmission.
  - **Local Port**: 80 (Desktop Internal Server).
  - **Central Port**: 3000 (NestJS Backend).

## APIs & Databases
- **No external databases detected**: Current state appears to be purely in-memory/volatile.
- **No external auth providers detected**: Authentication is currently password-based via socket events.

## System APIs
- **Electron desktopCapturer**: Used to access system screen and window buffers.
- **Node.js os module**: Used to detect local IP and network interfaces for P2P connection info.

---
*Last updated: 2026-05-04*
