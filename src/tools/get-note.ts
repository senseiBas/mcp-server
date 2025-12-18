import { App, TFile } from 'obsidian';

/**
 * Get note content and metadata
 * 
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @returns JSON string with note content and metadata
 */
export async function getNote(app: App, path: string): Promise<string> {
	console.log('[get_note] Starting with path:', path);
	
	if (!path) {
		throw new Error('Path parameter is required');
	}

	// Get the file from vault
	console.log('[get_note] Getting file from vault...');
	const file = app.vault.getAbstractFileByPath(path);
	
	if (!file) {
		throw new Error(`Note not found: ${path}`);
	}

	// Check if it's actually a file (not a folder)
	if (!(file instanceof TFile)) {
		throw new Error(`Path is not a file: ${path}`);
	}

	// Read file content (asynchronously)
	console.log('[get_note] Reading file content...');
	const content = await app.vault.adapter.read(path);
	console.log('[get_note] Content read, length:', content.length);
	
	// Get metadata from cache
	console.log('[get_note] Getting metadata cache...');
	const cache = app.metadataCache.getCache(path);
	
	// Build response
	console.log('[get_note] Building response...');
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

	console.log('[get_note] Returning JSON result');
	return JSON.stringify(response, null, 2);
}
