import { Plugin, Notice } from 'obsidian';

/**
 * MCP Server Plugin for Obsidian
 * Allows Claude Desktop to interact with your vault via WebSocket
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

	async onload() {
		await this.loadSettings();
		
		console.log('MCP Server Plugin: Loading...');
		
		if (this.settings.enabled) {
			new Notice('MCP Server: Plugin loaded successfully');
		}
	}

	onunload() {
		console.log('MCP Server Plugin: Unloading...');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
