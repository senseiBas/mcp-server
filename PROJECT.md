# Build Obsidian MCP Server Plugin

Create an Obsidian plugin that functions as an MCP (Model Context Protocol) server, allowing Claude Desktop to interact with my Obsidian vault.

## Project Structure

```
obsidian-mcp-server/
├── manifest.json          # Obsidian plugin manifest
├── main.ts               # Plugin entry point
├── src/
│   ├── mcp-server.ts     # MCP server implementation
│   ├── tools/
│   │   ├── search.ts     # Search tool
│   │   ├── clusters.ts   # Find clusters tool
│   │   └── tags.ts       # Bulk tagging tool
│   └── types.ts          # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

### 1. Obsidian Plugin Setup
- Create standard Obsidian plugin structure
- Use Obsidian API for all vault operations
- Plugin name: "MCP Server"
- Plugin ID: "mcp-server"

### 2. MCP Server Implementation
- Start WebSocket server on plugin load (localhost:3000)
- Implement MCP protocol (JSON-RPC over WebSocket)
- Support these MCP methods:
  - initialize
  - tools/list
  - tools/call
  - shutdown

### 3. Tools to Implement

#### Tool 1: find_clusters
**Purpose:** Find related notes based on keyword similarity
**Parameters:**
- folder_path: string (e.g., root folder)
- query: string (search keywords)
- depth: number (optional, default 1) - how deep to traverse links
**Returns:** Array of related notes with scores

**Implementation:**
- Read all markdown files in folder
- Score by keyword match (simple text search for MVP)
- Consider depth parameter for link traversal
- Handle emoji in folder paths (UTF-8 encoding)

#### Tool 2: search
**Purpose:** Search vault with scope options
**Parameters:**
- query: string
- scope_type: "file" | "folder" | "tag" | "vault"
- scope_value: string (path, tag name, or empty for vault)
**Returns:** Array of matching notes

**Implementation:**
- Support scoped search by file, folder, tag, or entire vault
- Handle emoji in paths
- Return note path, title, and matching context

#### Tool 3: bulk_tag
**Purpose:** Add tags to multiple notes
**Parameters:**
- file_paths: string[]
- tag: string
**Returns:** Success/failure status

**Implementation:**
- Update frontmatter YAML for each file
- Add tag if not present
- Preserve existing tags

### 4. Technical Requirements

**Obsidian API Usage:**
- Use `this.app.vault` for file operations
- Use `this.app.metadataCache` for frontmatter
- Use `this.app.workspace` for active file

**UTF-8 Emoji Support:**
- Properly handle emoji in folder/file names
- Use Unicode-aware string operations
- Test with folders like "Efforts 🔥/"

**Error Handling:**
- Graceful error messages
- Log errors to console
- Don't crash Obsidian

**Server Lifecycle:**
- Start server in `onload()`
- Stop server in `onunload()`
- Handle reconnection attempts

### 5. Configuration

**Claude Desktop Config Example:**
Add to Claude Desktop's config file:
```json
{
  "mcpServers": {
    "obsidian": {
      "url": "ws://localhost:3000",
      "name": "Obsidian MCP Server"
    }
  }
}
```

### 6. Dependencies

**Required npm packages:**
- @modelcontextprotocol/sdk (MCP protocol)
- obsidian (Obsidian API types)
- ws (WebSocket server)

### 7. Development Setup

**Build process:**
- TypeScript compilation
- Output to main.js
- Watch mode for development

**Testing:**
- Test each tool independently
- Test with emoji paths
- Test WebSocket connection
- Test Claude Desktop integration

## MVP Scope

**Phase 1 (First Working Version):**
- ✅ Basic plugin structure
- ✅ WebSocket server on localhost:3000
- ✅ MCP protocol basics (initialize, tools/list, tools/call)
- ✅ find_clusters tool (simple keyword matching)
- ✅ search tool (vault-wide, basic)
- ✅ bulk_tag tool (frontmatter updates)
- ✅ Emoji path support

**Phase 2 (Later):**
- Bases CRUD operations
- Canvas operations
- Advanced graph queries with configurable depth
- TF-IDF scoring for clusters
- Backlink analysis

## Notes

- Keep it simple for MVP
- Focus on working functionality over perfection
- Proper UTF-8 handling is critical (emoji paths)
- Security: Only listen on localhost
- Performance: Don't block Obsidian UI

## Success Criteria

Plugin successfully:
1. Loads in Obsidian without errors
2. Starts WebSocket server on port 3000
3. Responds to Claude Desktop MCP requests
4. Executes find_clusters on root folder
5. Handles emoji in paths correctly
6. Updates note frontmatter via bulk_tag

---

Start with basic plugin structure and WebSocket server, then implement tools one by one.
