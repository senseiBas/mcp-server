import { App, TFile } from 'obsidian';

/**
 * Get related notes (outlinks and backlinks)
 * 
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @returns JSON string with outlinks and backlinks
 */
export async function getRelatedNotes(app: App, path: string): Promise<string> {
	console.log('[get_related_notes] Starting with path:', path);
	
	if (!path) {
		throw new Error('Path parameter is required');
	}

	// Get the file from vault
	const file = app.vault.getAbstractFileByPath(path);
	
	if (!file) {
		throw new Error(`Note not found: ${path}`);
	}

	// Check if it's actually a file (not a folder)
	if (!(file instanceof TFile)) {
		throw new Error(`Path is not a file: ${path}`);
	}

	// Get outlinks (notes this note links to)
	const cache = app.metadataCache.getCache(path);
	const outlinks: string[] = [];
	
	if (cache?.links) {
		for (const link of cache.links) {
			// Resolve the link to an actual file
			const linkedFile = app.metadataCache.getFirstLinkpathDest(link.link, path);
			if (linkedFile) {
				outlinks.push(linkedFile.path);
			}
		}
	}

	// Get backlinks (notes that link to this note)
	// We need to search through all resolvedLinks to find who links to this file
	const backlinks: string[] = [];
	const allResolvedLinks = app.metadataCache.resolvedLinks;
	
	for (const [sourcePath, destinations] of Object.entries(allResolvedLinks)) {
		// Check if this source file links to our target file
		if (destinations[path]) {
			backlinks.push(sourcePath);
		}
	}

	const response = {
		path: path,
		outlinks: outlinks,
		backlinks: backlinks
	};

	console.log('[get_related_notes] Found', outlinks.length, 'outlinks and', backlinks.length, 'backlinks');
	return JSON.stringify(response, null, 2);
}
