import { App } from 'obsidian';

interface SearchResult {
	path: string;
	title: string;
	snippet: string;
}

interface SearchOptions {
	folder?: string;
	tag?: string;
	limit?: number;
}

/**
 * Search for notes in the vault
 * 
 * @param app - Obsidian App instance
 * @param query - Search query text
 * @param options - Optional filters (folder, tag, limit)
 * @returns JSON string with search results
 */
export async function searchNotes(app: App, query: string, options: SearchOptions = {}): Promise<string> {
	if (!query) {
		throw new Error('Query parameter is required');
	}

	const { folder, tag, limit = 10 } = options;
	const queryLower = query.toLowerCase();
	const results: SearchResult[] = [];

	// Get all markdown files
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		// Filter by folder if specified
		if (folder && !file.path.startsWith(folder)) {
			continue;
		}

		// Filter by tag if specified (check metadata cache)
		if (tag) {
			const cache = app.metadataCache.getFileCache(file);
			const hasTag = cache?.tags?.some(t => t.tag === `#${tag}` || t.tag === tag);
			if (!hasTag) {
				continue;
			}
		}

		// Check if query matches title
		const titleMatch = file.basename.toLowerCase().includes(queryLower);

		// Read content to search in it
		let contentMatch = false;
		let snippet = '';
		
		try {
			const content = await app.vault.adapter.read(file.path);
			const contentLower = content.toLowerCase();
			contentMatch = contentLower.includes(queryLower);

			// If match found, extract snippet
			if (contentMatch || titleMatch) {
				const matchIndex = contentLower.indexOf(queryLower);
				if (matchIndex !== -1) {
					// Extract context around match (50 chars before, 100 after)
					const start = Math.max(0, matchIndex - 50);
					const end = Math.min(content.length, matchIndex + query.length + 100);
					snippet = content.substring(start, end).trim();
					
					// Add ellipsis if truncated
					if (start > 0) snippet = '...' + snippet;
					if (end < content.length) snippet = snippet + '...';
				} else if (titleMatch) {
					// Title match, show first 150 chars of content
					snippet = content.substring(0, 150).trim();
					if (content.length > 150) snippet = snippet + '...';
				}
			}
		} catch (error) {
			console.error(`Error reading file ${file.path}:`, error);
			continue;
		}

		// Add to results if matched
		if (titleMatch || contentMatch) {
			results.push({
				path: file.path,
				title: file.basename,
				snippet: snippet
			});

			// Stop if we reached limit
			if (results.length >= limit) {
				break;
			}
		}
	}

	return JSON.stringify({
		query: query,
		filters: { folder, tag, limit },
		count: results.length,
		results: results
	}, null, 2);
}
