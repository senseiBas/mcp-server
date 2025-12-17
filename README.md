# Obsidian MCP Server Plugin

An Obsidian plugin that functions as an MCP (Model Context Protocol) server, allowing Claude Desktop to interact with your Obsidian vault.

## Features

This plugin provides three powerful tools for Claude Desktop:

1. **search** - Search your vault with flexible scoping (file, folder, tag, or entire vault)
2. **find_clusters** - Find related notes based on keyword similarity and link traversal
3. **bulk_tag** - Add tags to multiple notes at once via frontmatter

## Installation

### 1. Install the Plugin

Clone or download this repository into your vault's plugins folder:

```
<your-vault>/.obsidian/plugins/mcp-server/
```

Then in Obsidian:
1. Go to **Settings → Community plugins**
2. Disable **Restricted mode** (if enabled)
3. Click **Reload** plugins
4. Enable **MCP Server**

### 2. Configure Claude Desktop

The plugin runs an HTTP server on `localhost:3000`. To connect Claude Desktop, you need to add a stdio bridge configuration.

#### Windows Configuration

1. Open the Claude Desktop config file:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the following configuration (replace the path with YOUR vault location):

```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": [
        "C:\\Path\\To\\Your\\Vault\\.obsidian\\plugins\\mcp-server\\stdio-bridge.js"
      ]
    }
  }
}
```

**⚠️ IMPORTANT:** Replace `C:\\Path\\To\\Your\\Vault` with the actual path to your vault!

**Example:**
```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": [
        "C:\\Users\\YourName\\Documents\\My Vault\\.obsidian\\plugins\\mcp-server\\stdio-bridge.js"
      ]
    }
  }
}
```

#### macOS/Linux Configuration

1. Open the Claude Desktop config file:
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Add the following (replace the path):

```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": [
        "/path/to/your/vault/.obsidian/plugins/mcp-server/stdio-bridge.js"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

Completely quit and restart Claude Desktop for the changes to take effect.

## Usage

Once configured, Claude Desktop can interact with your vault:

- **"Search my vault for notes about project management"**
- **"Find related notes about machine learning"**
- **"Add the tag 'important' to these notes: [file paths]"**

You'll see the 🔌 icon in Claude Desktop showing available MCP servers and tools.

## Development

### Build

```bash
npm install
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Testing

Test the HTTP server directly:

```bash
node test-connection.js
```

Test MCP protocol:

```bash
node test-mcp.js
```

## Technical Details

- **Server Type:** HTTP-based MCP server (Electron-compatible)
- **Port:** 3000 (localhost only, for security)
- **Protocol:** MCP (Model Context Protocol) over JSON-RPC
- **Bridge:** stdio-bridge.js converts between Claude Desktop (stdio) and HTTP

## Troubleshooting

### Plugin doesn't load
- Check Obsidian Developer Console (Ctrl+Shift+I)
- Ensure `main.js` exists (run `npm run build`)

### Claude Desktop can't connect
- Verify Obsidian is running
- Check that MCP Server plugin is enabled
- Verify the path in `claude_desktop_config.json` is correct
- Restart Claude Desktop completely

### Port already in use
- Default port is 3000
- Check if another application is using it
- Plugin will show error in Obsidian console

## License

MIT License - See LICENSE file

## Author

Bas van Laarhoven / Sensei Bas
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Improve code quality with eslint (optional)
- [ESLint](https://eslint.org/) is a tool that analyzes your code to quickly find problems. You can run ESLint against your plugin to find common bugs and ways to improve your code. 
- To use eslint with this project, make sure to install eslint from terminal:
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint ./src/`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
