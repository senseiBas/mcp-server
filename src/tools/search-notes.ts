import { App, TFile } from 'obsidian';
import {
	createSuccessResponse,
	createErrorResponse,
	extractSnippet
} from './common';

interface SearchResult {
	path: string;
	title: string;
	snippet: string;
	created: string;
	modified: string;
	size: number;
	score: number;
}

export interface SearchOptions {
	folder?: string;
	tag?: string;
	limit?: number;
	sort_by?: 'relevance' | 'modified' | 'created' | 'title';
}

/**
 * Search for notes in the vault
 *
 * @param app - Obsidian App instance
 * @param query - Search query text
 * @param options - Optional filters (folder, tag, limit, sort_by)
 * @returns JSON string with search results
 */
export async function searchNotes(
	app: App,
	query: string,
	options: SearchOptions = {}
): Promise<string> {
	const startTime = Date.now();

	if (!query) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Query parameter is required',
			undefined,
			startTime
		);
	}

	const {
		folder,
		tag,
		limit = 10,
		sort_by = 'relevance'
	} = options;

	const queryLower = query.toLowerCase();
	const results: SearchResult[] = [];

	try {
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
				const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
				const hasTag = cache?.tags?.some(t =>
					t.tag === normalizedTag ||
					t.tag === tag ||
					t.tag === `#${tag}`
				);
				if (!hasTag) {
					continue;
				}
			}

			// Calculate relevance score
			let score = 0;
			const titleLower = file.basename.toLowerCase();

			// Title matching (higher weight)
			if (titleLower === queryLower) {
				score += 100; // Exact match
			} else if (titleLower.includes(queryLower)) {
				score += 50; // Partial match
			} else if (titleLower.split(' ').some(word => word.includes(queryLower))) {
				score += 25; // Word match
			}

			// Read content to search in it
			let contentMatch = false;
			let snippet = '';

			try {
				const content = await app.vault.adapter.read(file.path);
				const contentLower = content.toLowerCase();

				// Count occurrences in content
				const occurrences = (contentLower.match(new RegExp(escapeRegex(queryLower), 'g')) || []).length;
				contentMatch = occurrences > 0;

				if (contentMatch) {
					// Add to score based on occurrences (max 50 points)
					score += Math.min(occurrences * 5, 50);

					// Extract snippet with highlighted term
					snippet = extractSnippet(content, query, 200);
				} else if (score > 0) {
					// Title match but no content match, show beginning
					snippet = content.substring(0, 200).trim();
					if (content.length > 200) snippet = snippet + '...';
				}
			} catch (error) {
				console.error(`Error reading file ${file.path}:`, error);
				continue;
			}

			// Add to results if matched
			if (score > 0 || contentMatch) {
				results.push({
					path: file.path,
					title: file.basename,
					snippet: snippet,
					created: new Date(file.stat.ctime).toISOString(),
					modified: new Date(file.stat.mtime).toISOString(),
					size: file.stat.size,
					score: score
				});
			}
		}

		// Sort results based on sort_by parameter
		switch (sort_by) {
			case 'relevance':
				results.sort((a, b) => b.score - a.score);
				break;
			case 'modified':
				results.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
				break;
			case 'created':
				results.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
				break;
			case 'title':
				results.sort((a, b) => a.title.localeCompare(b.title));
				break;
		}

		// Apply limit
		const limitedResults = results.slice(0, limit);

		// Remove score from output (internal only)
		const outputResults = limitedResults.map(({ score, ...rest }) => rest);

		return createSuccessResponse(
			{
				query: query,
				filters: { folder, tag, sort_by },
				total_matches: results.length,
				returned_count: outputResults.length,
				results: outputResults
			},
			startTime
		);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[search_notes] Error:', errorMessage);

		return createErrorResponse(
			'SEARCH_ERROR',
			`Search failed: ${errorMessage}`,
			undefined,
			startTime
		);
	}
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
