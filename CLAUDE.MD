# Obsidian MCP Server Plugin

## Project Overview

This is an Obsidian plugin that functions as an MCP (Model Context Protocol) server, enabling Claude Desktop and other AI assistants to interact directly with an Obsidian vault. It provides a bridge between the MCP protocol (used by Claude Desktop) and the Obsidian API.

**Author:** Bas van Laarhoven / Sensei Bas
**License:** MIT
**Version:** 1.0.0

## Architecture

### High-Level Design

```
Claude Desktop (stdio)
    ↓
stdio-bridge.js (converts stdio ↔ HTTP)
    ↓
MCP Server (HTTP on localhost:3000)
    ↓
Obsidian API (vault access)
```

### Why HTTP Instead of stdio?

Obsidian runs in Electron, which doesn't have direct stdio access. This plugin runs an HTTP server locally (localhost:3000) and uses a stdio bridge (`stdio-bridge.js`) to convert between:
- Claude Desktop's stdio-based MCP protocol
- This plugin's HTTP-based implementation

This architecture is **security-conscious**: the HTTP server only listens on localhost, preventing external network access.

## Core Components

### 1. MCP Server (`src/mcp-server.ts`)

The main server class that:
- Runs an HTTP server on port 3000 (localhost only)
- Implements MCP protocol over JSON-RPC 2.0
- Handles three core MCP methods:
  - `initialize` - Protocol handshake
  - `tools/list` - Returns available tools
  - `tools/call` - Executes a tool

**Key Implementation Details:**
- Uses Electron's built-in `http` module (not Node's)
- CORS enabled for localhost
- All requests are POST (OPTIONS for CORS preflight)
- Notifications (methods starting with `notifications/`) are acknowledged but not processed

### 2. Available Tools

The plugin provides four tools for vault interaction:

#### `search_notes`
**Location:** `src/tools/search-notes.ts`
**Purpose:** Search vault notes by query text
**Parameters:**
- `query` (required): Search text (searches titles and content)
- `folder` (optional): Filter by folder path
- `tag` (optional): Filter by tag (without #)
- `limit` (optional): Max results (default: 10)

**Returns:** JSON array of matching notes with snippets

#### `get_note`
**Location:** `src/tools/get-note.ts`
**Purpose:** Read a specific note's full content and metadata
**Parameters:**
- `path` (required): Vault path to note

**Returns:** Note content, metadata, frontmatter, tags, links

**Important:** Use `search_notes` first to find the correct path, then use `get_note` to read the full content.

#### `get_related_notes`
**Location:** `src/tools/get-related-notes.ts`
**Purpose:** Find notes related to a specific note
**Parameters:**
- `path` (required): Vault path to note

**Returns:**
- Outgoing links (notes this note links to)
- Incoming links/backlinks (notes that link to this note)

**Note:** Returns only paths - use `get_note` to read full content of related notes.

#### `append_to_note`
**Location:** `src/tools/append-to-note.ts`
**Purpose:** Append content to the end of an existing note
**Parameters:**
- `path` (required): Vault path to note
- `content` (required): Markdown content to append

**Returns:** Success message

**Use Cases:** Adding new information, logging, extending notes without replacing content

### 3. Plugin Entry Point (`main.ts`)

The main Obsidian plugin class that:
- Loads/unloads the plugin
- Starts/stops the MCP server
- Integrates with Obsidian's plugin system

### 4. stdio Bridge (`stdio-bridge.js`)

Standalone Node.js script that:
- Reads JSON-RPC from stdin (from Claude Desktop)
- Forwards to HTTP server (this plugin)
- Sends HTTP responses back to stdout
- Handles initialization and tool calls

## Development Guide

### Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (rebuilds on changes)
npm run build        # Production build
```

### Project Structure

```
.
├── src/
│   ├── mcp-server.ts          # Main MCP server implementation
│   ├── types.ts               # TypeScript types
│   └── tools/
│       ├── search-notes.ts    # Search functionality
│       ├── get-note.ts        # Note reading
│       ├── get-related-notes.ts  # Link traversal
│       └── append-to-note.ts  # Note appending
├── main.ts                    # Obsidian plugin entry point
├── stdio-bridge.js            # Claude Desktop bridge
├── manifest.json              # Plugin manifest
└── package.json               # Dependencies
```

### Key Dependencies

- `obsidian` - Obsidian API types
- `esbuild` - Build tool
- `typescript` - Language
- Built-in Node.js `http` module (via Electron)

### Testing

```bash
node test-connection.js  # Test HTTP server directly
node test-mcp.js        # Test MCP protocol
```

## Protocol Details

### MCP (Model Context Protocol)

This plugin implements MCP 2024-11-05 protocol version over JSON-RPC 2.0.

**Supported Methods:**
- `initialize` - Handshake, returns capabilities
- `tools/list` - Returns tool definitions with JSON schemas
- `tools/call` - Executes a tool with arguments

**Tool Response Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool result as string"
      }
    ]
  }
}
```

### Error Handling

Standard JSON-RPC error codes:
- `-32601` - Method not found
- `-32603` - Internal error / tool execution failed

## Configuration

### Claude Desktop Setup

**Windows:**
```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": [
        "C:\\Path\\To\\Vault\\.obsidian\\plugins\\mcp-server\\stdio-bridge.js"
      ]
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": [
        "/path/to/vault/.obsidian/plugins/mcp-server/stdio-bridge.js"
      ]
    }
  }
}
```

## Common Patterns

### Searching for Notes

1. Use `search_notes` with a query
2. Optionally filter by folder or tag
3. Get list of matching notes with paths

### Reading Note Content

1. Use `search_notes` to find the note path
2. Use `get_note` with the exact path to read full content

### Exploring Related Notes

1. Use `get_related_notes` to find linked notes
2. Use `get_note` on each related path to read content
3. Recursively explore to build a knowledge graph

### Adding to Notes

1. Use `search_notes` or `get_note` to verify note exists
2. Use `append_to_note` to add content to the end

## Security Considerations

- HTTP server only listens on `localhost` (127.0.0.1)
- No external network access
- No authentication required (assumes trusted local environment)
- CORS enabled only for localhost

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Check Obsidian Developer Console (Ctrl+Shift+I)

### Claude Desktop can't connect
- Verify Obsidian is running
- Verify plugin is enabled in Obsidian settings
- Check path in `claude_desktop_config.json` is correct
- Restart Claude Desktop completely

### Tool calls fail
- Check Obsidian console for error messages
- Verify note paths are correct (case-sensitive)
- Ensure notes exist before reading

## Future Enhancement Ideas

Based on `findings.md`, potential features to add:

1. **Bases Query Execution** - Execute Dataview queries, return results
2. **Plugin Integration** - List installed plugins, access their data
3. **Note Creation** - Create new notes (currently only append)
4. **Note Modification** - Edit existing content (not just append)
5. **File Operations** - Move, rename, delete notes
6. **Graph Analysis** - Advanced link graph queries
7. **Canvas Integration** - Read/modify canvas files

## References

- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [MCP Protocol](https://modelcontextprotocol.io)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
