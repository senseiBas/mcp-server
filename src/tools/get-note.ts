import { App } from 'obsidian';

/**
 * Get note content and metadata
 * 
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @returns JSON string with note content and metadata
 */
export function getNote(app: App, path: string): string {
	if (!path) {
		throw new Error('Path parameter is required');
	}

	// Get the file from vault
	const file = app.vault.getAbstractFileByPath(path);
	
	if (!file) {
		throw new Error(`Note not found: ${path}`);
	}

	// Check if it's actually a file (not a folder)
	if (file.constructor.name !== 'TFile') {
		throw new Error(`Path is not a file: ${path}`);
	}

	// Read file content (synchronously via adapter for simplicity)
	const content = app.vault.adapter.read(path);
	
	// Get metadata from cache
	const cache = app.metadataCache.getCache(path);
	
	// Build response
	const response: any = {
		path: path,
		name: file.name,
		content: content
	};

	// Add metadata if available
	if (cache) {
		response.metadata = {
			tags: cache.tags?.map(t => t.tag) || [],
			links: cache.links?.map(l => l.link) || [],
			headings: cache.headings?.map(h => ({ level: h.level, heading: h.heading })) || [],
			frontmatter: cache.frontmatter || {}
		};
	}

	return JSON.stringify(response, null, 2);
}
