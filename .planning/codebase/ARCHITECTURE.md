# Architecture

## System Overview
ViewSync is a screen-sharing system designed for educational or collaborative environments. It supports both local network streaming (via an internal server in the Desktop app) and potentially cloud-based streaming (via a NestJS backend).

## Core Components
1. **Desktop Transmissor (Host)**:
   - Captures screen/window using Electron's `desktopCapturer`.
   - Broadcasts video frames as base64/binary data via Socket.io.
   - Runs an internal Express/Socket.io server on port 80 to allow local viewers to connect directly.
   - Serves the `viewer-web` static files to local clients.

2. **Viewer Web (Client)**:
   - Connects to a Socket.io server (Local or Central).
   - Receives `room:frame` events and renders them.
   - Manages viewer state (visibility, authorization).

3. **Backend API (Central Registry/Signaling)**:
   - NestJS server with a `SignalingGateway`.
   - Duplicates the streaming logic found in the Desktop app (start/stop stream, frame broadcast).
   - Likely intended for internet-based streaming where clients cannot connect directly to the host's IP.

## Data Flow
1. **Stream Initialization**:
   - Host sends `host:start_stream` with config and optional password.
   - Server (Local or Central) updates `roomState` and broadcasts to all connected clients.
2. **Video Streaming**:
   - Host captures frame.
   - Host emits `host:frame`.
   - Server broadcasts `room:frame` (volatile) to all authorized viewers.
3. **Viewer Interaction**:
   - Viewer sends `viewer:join`.
   - Server validates password and emits `viewer:authorized`.
   - Viewer tracks visibility via `viewer:visibility_change`.

## Key Patterns
- **Monorepo**: Shared types and components (planned).
- **Event-Driven**: Heavily reliant on Socket.io events for real-time state synchronization.
- **Dual-Server**: Support for both local and central streaming servers.

---
*Last updated: 2026-05-04*
