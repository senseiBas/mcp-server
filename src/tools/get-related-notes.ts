import { App, TFile } from 'obsidian';
import {
	createSuccessResponse,
	createErrorResponse,
	validatePath,
	findSimilarPaths,
	getFileByPath
} from './common';

export interface GetRelatedNotesOptions {
	depth?: number;
	include_snippets?: boolean;
	max_snippet_length?: number;
}

interface RelatedNote {
	path: string;
	title: string;
	snippet?: string;
}

/**
 * Get related notes (outlinks and backlinks) with optional depth traversal
 *
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @param options - Optional parameters (depth, include_snippets)
 * @returns JSON string with outlinks and backlinks
 */
export async function getRelatedNotes(
	app: App,
	path: string,
	options: GetRelatedNotesOptions = {}
): Promise<string> {
	const startTime = Date.now();
	console.log('[get_related_notes] Starting with path:', path, 'options:', options);

	// Validate path parameter
	if (!path) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Path parameter is required',
			undefined,
			startTime
		);
	}

	// Validate path format
	const pathValidation = validatePath(path);
	if (!pathValidation.valid) {
		return createErrorResponse(
			'INVALID_PATH',
			pathValidation.error!,
			undefined,
			startTime
		);
	}

	// Get the file from vault
	const file = getFileByPath(app, path);

	if (!file) {
		const suggestions = findSimilarPaths(app, path);
		return createErrorResponse(
			'NOTE_NOT_FOUND',
			`Note not found: "${path}"`,
			suggestions.length > 0 ? [`Did you mean: ${suggestions.join(', ')}?`] : undefined,
			startTime
		);
	}

	try {
		const {
			depth: depthParam = 1,
			include_snippets = false,
			max_snippet_length = 150
		} = options;

		// Ensure depth is a number (could come as string from JSON)
		const depth = typeof depthParam === 'string' ? parseInt(depthParam, 10) : depthParam;

		// Validate depth parameter
		if (isNaN(depth) || depth < 1 || depth > 3) {
			return createErrorResponse(
				'INVALID_PARAMETER',
				'Depth must be a number between 1 and 3',
				['Use depth=1 for direct links only, depth=2-3 for transitive links'],
				startTime
			);
		}

		// Get direct outlinks and backlinks
		const outlinks = await getOutlinks(app, path, include_snippets, max_snippet_length);
		const backlinks = await getBacklinks(app, path, include_snippets, max_snippet_length);

		// If depth > 1, get transitive links
		let transitiveOutlinks: RelatedNote[] = [];
		let transitiveBacklinks: RelatedNote[] = [];

		if (depth > 1) {
			const visited = new Set([path]);
			transitiveOutlinks = await getTransitiveLinks(
				app,
				outlinks.map(n => n.path),
				'outlinks',
				depth - 1,
				visited,
				include_snippets,
				max_snippet_length
			);
			transitiveBacklinks = await getTransitiveLinks(
				app,
				backlinks.map(n => n.path),
				'backlinks',
				depth - 1,
				visited,
				include_snippets,
				max_snippet_length
			);
		}

		const response = {
			path: path,
			depth: depth,
			direct_outlinks: outlinks,
			direct_backlinks: backlinks,
			direct_outlinks_count: outlinks.length,
			direct_backlinks_count: backlinks.length
		};

		// Add transitive links if depth > 1
		if (depth > 1) {
			Object.assign(response, {
				transitive_outlinks: transitiveOutlinks,
				transitive_backlinks: transitiveBacklinks,
				transitive_outlinks_count: transitiveOutlinks.length,
				transitive_backlinks_count: transitiveBacklinks.length
			});
		}

		console.log('[get_related_notes] Found', outlinks.length, 'direct outlinks and', backlinks.length, 'direct backlinks');
		return createSuccessResponse(response, startTime);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[get_related_notes] Error:', errorMessage);

		return createErrorResponse(
			'RELATED_NOTES_ERROR',
			`Failed to get related notes: ${errorMessage}`,
			undefined,
			startTime
		);
	}
}

/**
 * Get outgoing links from a note
 */
async function getOutlinks(
	app: App,
	path: string,
	includeSnippets: boolean,
	maxSnippetLength: number
): Promise<RelatedNote[]> {
	const cache = app.metadataCache.getCache(path);
	const outlinks: RelatedNote[] = [];

	if (cache?.links || cache?.embeds) {
		// Combine regular links and embeds
		const allLinks = [
			...(cache.links || []),
			...(cache.embeds || [])
		];

		const seen = new Set<string>();

		for (const link of allLinks) {
			// Resolve the link to an actual file
			const linkedFile = app.metadataCache.getFirstLinkpathDest(link.link, path);
			if (linkedFile && !seen.has(linkedFile.path)) {
				seen.add(linkedFile.path);

				const relatedNote: RelatedNote = {
					path: linkedFile.path,
					title: linkedFile.basename
				};

				if (includeSnippets) {
					relatedNote.snippet = await getFileSnippet(app, linkedFile.path, maxSnippetLength);
				}

				outlinks.push(relatedNote);
			}
		}
	}

	return outlinks;
}

/**
 * Get incoming links (backlinks) to a note
 */
async function getBacklinks(
	app: App,
	path: string,
	includeSnippets: boolean,
	maxSnippetLength: number
): Promise<RelatedNote[]> {
	const backlinks: RelatedNote[] = [];
	const allResolvedLinks = app.metadataCache.resolvedLinks;
	const seen = new Set<string>();

	for (const [sourcePath, destinations] of Object.entries(allResolvedLinks)) {
		// Check if this source file links to our target file
		if (destinations[path] && !seen.has(sourcePath)) {
			seen.add(sourcePath);

			const sourceFile = getFileByPath(app, sourcePath);
			if (sourceFile) {
				const relatedNote: RelatedNote = {
					path: sourcePath,
					title: sourceFile.basename
				};

				if (includeSnippets) {
					relatedNote.snippet = await getFileSnippet(app, sourcePath, maxSnippetLength);
				}

				backlinks.push(relatedNote);
			}
		}
	}

	return backlinks;
}

/**
 * Get transitive links (links of links) up to specified depth
 */
async function getTransitiveLinks(
	app: App,
	startPaths: string[],
	direction: 'outlinks' | 'backlinks',
	remainingDepth: number,
	visited: Set<string>,
	includeSnippets: boolean,
	maxSnippetLength: number
): Promise<RelatedNote[]> {
	if (remainingDepth === 0 || startPaths.length === 0) {
		return [];
	}

	const transitive: RelatedNote[] = [];
	const newPaths: string[] = [];

	for (const currentPath of startPaths) {
		if (visited.has(currentPath)) {
			continue;
		}
		visited.add(currentPath);

		// Get links from this note
		const links = direction === 'outlinks'
			? await getOutlinks(app, currentPath, includeSnippets, maxSnippetLength)
			: await getBacklinks(app, currentPath, includeSnippets, maxSnippetLength);

		for (const link of links) {
			if (!visited.has(link.path)) {
				transitive.push(link);
				newPaths.push(link.path);
			}
		}
	}

	// Recurse for next depth level
	if (remainingDepth > 1) {
		const deeperLinks = await getTransitiveLinks(
			app,
			newPaths,
			direction,
			remainingDepth - 1,
			visited,
			includeSnippets,
			maxSnippetLength
		);
		transitive.push(...deeperLinks);
	}

	return transitive;
}

/**
 * Get a snippet from a file
 */
async function getFileSnippet(
	app: App,
	path: string,
	maxLength: number
): Promise<string> {
	try {
		const content = await app.vault.adapter.read(path);
		// Remove frontmatter
		const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
		const snippet = withoutFrontmatter.substring(0, maxLength).trim();
		return snippet + (withoutFrontmatter.length > maxLength ? '...' : '');
	} catch (error) {
		return '[Error reading file]';
	}
}
