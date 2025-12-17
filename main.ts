import { Plugin, Notice } from 'obsidian';
import { MCPServer } from './src/mcp-server';

/**
 * MCP Server Plugin for Obsidian
 * Allows Claude Desktop to interact with your vault via HTTP-based MCP protocol
 */

interface MCPServerSettings {
	port: number;
	enabled: boolean;
}

const DEFAULT_SETTINGS: MCPServerSettings = {
	port: 3000,
	enabled: true
}

export default class MCPServerPlugin extends Plugin {
	settings: MCPServerSettings;
	private mcpServer: MCPServer | null = null;

	async onload() {
		await this.loadSettings();
		
		console.log('MCP Server Plugin: Loading...');
		
		if (this.settings.enabled) {
			try {
				this.mcpServer = new MCPServer(this.app, this.settings.port);
				await this.mcpServer.start();
				new Notice(`MCP Server: Running on port ${this.settings.port}`);
			} catch (error) {
				console.error('MCP Server Plugin: Failed to start server:', error);
				new Notice('MCP Server: Failed to start - check console for details');
			}
		}
	}

	async onunload() {
		console.log('MCP Server Plugin: Unloading...');
		
		if (this.mcpServer) {
			await this.mcpServer.stop();
			this.mcpServer = null;
		}
	}

	/**
	 * Load plugin settings from disk
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings to disk
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
