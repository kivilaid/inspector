# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The MCP Inspector is a developer tool for testing and debugging Model Context Protocol (MCP) servers. It consists of three main components:
- **Client**: React web application (default port 6274) for interactive inspection
- **Server**: Express proxy server (default port 6277) that bridges UI to MCP servers
- **CLI**: Command-line interface for programmatic interaction with MCP servers

## Architecture

### Core Components
- **Client** (`/client`): React TypeScript app using Vite, Tailwind CSS, and Radix UI components
- **Server** (`/server`): Express proxy server with WebSocket/SSE support for MCP transport
- **CLI** (`/cli`): Commander.js-based CLI using the MCP SDK for direct server interaction

### Key Transport Types
- **STDIO**: Spawns local MCP server processes via child_process
- **SSE**: Server-Sent Events for remote MCP servers (deprecated, use streamable-http)
- **Streamable-HTTP**: Modern HTTP-based transport with session management

### MCP Proxy Architecture
The proxy server (`server/src/mcpProxy.ts`) acts as a bridge between the web UI and MCP servers, handling:
- Transport protocol translation (STDIO ↔ SSE/HTTP)
- Authentication token passthrough
- Error handling and session management
- Progress notifications and request timeout management

## Development Commands

### Building
```bash
npm run build                # Build all components
npm run build-client         # Build client only
npm run build-server         # Build server only  
npm run build-cli            # Build CLI only
```

### Development
```bash
npm run dev                  # Start client + server in dev mode
npm run dev:windows          # Windows-specific dev command
```

### Testing
```bash
npm test                     # Run client tests + prettier check
npm run test-cli             # Run CLI-specific tests
cd client && npm test        # Client tests only
cd client && npm run test:watch  # Watch mode for client tests
```

### Code Quality
```bash
npm run prettier-fix         # Fix formatting issues
npm run prettier-check       # Check code formatting
cd client && npm run lint    # Lint client code
```

### Production
```bash
npm start                    # Start built client + server
npm run start-server         # Start server only
npm run start-client         # Start client only
```

## Configuration

### Environment Variables
- `CLIENT_PORT`: Client UI port (default: 6274)
- `SERVER_PORT`: Proxy server port (default: 6277)
- `MCP_ENV_VARS`: JSON-encoded environment variables for MCP servers
- `MCP_AUTO_OPEN_ENABLED`: Auto-open browser (default: true)

### Inspector Configuration
The client supports runtime configuration via UI or query parameters:
- `MCP_SERVER_REQUEST_TIMEOUT`: Request timeout in ms (default: 10000)
- `MCP_REQUEST_TIMEOUT_RESET_ON_PROGRESS`: Reset timeout on progress (default: true)
- `MCP_REQUEST_MAX_TOTAL_TIMEOUT`: Max total timeout in ms (default: 60000)
- `MCP_PROXY_FULL_ADDRESS`: Custom proxy address

## Key Patterns

### Connection Management
The `useConnection` hook (`client/src/lib/hooks/useConnection.ts`) centralizes:
- Transport initialization and connection lifecycle
- Authentication handling (OAuth + bearer tokens)
- Request/response history tracking
- Error handling and retry logic

### Authentication Flow
- OAuth 2.0 PKCE flow for SSE connections
- Bearer token support with custom header names
- Session storage for token persistence
- Auth debugger for step-by-step flow inspection

### State Management
- React hooks for component state
- LocalStorage for user preferences and connection settings
- SessionStorage for OAuth tokens
- Zustand-like patterns for complex state (auth debugger)

## Testing

### Client Tests
Located in `client/src/**/__tests__/` using Jest + React Testing Library:
- Component unit tests
- Hook testing with custom providers
- Utility function tests
- JSON schema validation tests

### CLI Tests
Custom test runner (`cli/scripts/cli-tests.js`) validates:
- Command-line argument parsing
- Config file loading
- Environment variable handling
- MCP method execution
- Error scenarios

### Test Structure
```bash
cd client && npm test        # Run all client tests
cd cli && npm run test       # Run CLI integration tests
```

## Common Development Tasks

### Adding New MCP Methods
1. Update request/response schemas in the client
2. Add UI components in appropriate tabs (Tools/Resources/Prompts)
3. Implement CLI support in `cli/src/client/tools.ts`
4. Add tests for both UI and CLI interactions

### Supporting New Transport Types
1. Extend transport type unions in `useConnection.ts`
2. Add transport creation logic in server proxy
3. Update UI transport selection in Sidebar component
4. Test with both UI and CLI modes

### Debugging Connection Issues
1. Check proxy server health endpoint (`/health`)
2. Verify transport-specific parameters (command, URL, headers)
3. Use request history in UI for protocol-level debugging
4. Check stderr notifications for process-level errors

## Dependencies

### Client
- React 18 + TypeScript for UI framework
- Vite for build tooling and dev server
- Tailwind CSS + Radix UI for styling/components
- MCP SDK for protocol implementation
- Zod for runtime schema validation

### Server  
- Express for HTTP server
- WebSocket/SSE libraries for transport
- MCP SDK for protocol bridge
- spawn-rx for process management

### CLI
- Commander.js for argument parsing
- MCP SDK for direct server communication
- spawn-rx for launching inspector components