# Build Obsidian MCP Server Plugin

Create an Obsidian plugin that functions as an MCP (Model Context Protocol) server, allowing Claude Desktop to interact with my Obsidian vault.

## Project Structure

```
obsidian-mcp-server/
├── manifest.json          # Obsidian plugin manifest
├── main.ts               # Plugin entry point
├── stdio-bridge.js       # Bridge between Claude Desktop (stdio) and Obsidian (HTTP)
├── src/
│   ├── mcp-server.ts     # HTTP-based MCP server implementation
│   ├── tools/            # Tool implementations (to be added incrementally)
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
- ✅ HTTP server on plugin load (localhost:3000) - better than WebSocket for Electron
- ✅ Stdio bridge for Claude Desktop communication
- ✅ MCP protocol implementation (JSON-RPC)
- ✅ Support for: initialize, notifications/initialized, tools/list, tools/call
- Tools to be added incrementally based on API exploration

### 3. Tool Development (Exploratory Phase)

**Current placeholder tools** (in tools/list response):
- search - Search vault with scope options
- find_clusters - Find related notes based on keyword similarity  
- bulk_tag - Add tags to multiple notes at once

**Next steps:**
1. Explore Obsidian API (`node_modules/obsidian/obsidian.d.ts`)
2. Identify most useful capabilities for Claude
3. Replace/extend placeholder tools with real implementations
4. Focus on safe, read-heavy operations first

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

**npm packages:**
- obsidian (Obsidian API types)

**Note:** We removed @modelcontextprotocol/sdk and ws - not needed for our HTTP-based approach.

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

## Implementation Approach

### Current Status (✅ Completed)

**Phase 1: Infrastructure**
- ✅ Basic plugin structure
- ✅ HTTP server on localhost:3000 (not WebSocket - better for Electron)
- ✅ MCP protocol working (initialize, tools/list, tools/call)
- ✅ Stdio bridge for Claude Desktop integration
- ✅ Successfully connects to Claude Desktop

**Phase 2: API Exploration & Tool Development** (Current)

We're taking an **exploratory approach** rather than implementing predefined tools:

1. **Explore Obsidian API** - verstaan wat mogelijk is:
   - `app.vault` - File operations (read/write/delete/list)
   - `app.metadataCache` - Links, tags, frontmatter, headings
   - `app.workspace` - Active file, editor, views
   - `app.fileManager` - File management operations

2. **Identify useful tools** - bepalen wat Claude echt nuttig zou vinden:
   - Based on actual API capabilities
   - Focus on read operations (safe)
   - Consider common use cases

3. **Implement incrementally** - stap voor stap tools toevoegen:
   - One tool at a time
   - Test thoroughly
   - Commit working code

### Potential Tool Ideas (To Explore)

**Reading & Discovery:**
- List files/folders
- Read note content
- Get note metadata (tags, links, frontmatter)
- Search in vault
- Get backlinks for a note

**Analysis:**
- Find related notes (via links or tags)
- Get tag overview
- Find orphaned notes (no links)

**Writing (Carefully):**
- Create new note
- Append to note
- Update frontmatter
- Add tags

**Excluded (Too Risky for MVP):**
- Delete operations
- Bulk modifications without confirmation
- File renaming/moving (can break links)

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

