import { App, TFile } from 'obsidian';
import {
	createSuccessResponse,
	createErrorResponse,
	validatePath,
	findSimilarPaths,
	getFileByPath,
	isTextFile,
	formatFileSize,
	extractFrontmatter,
	removeFrontmatter
} from './common';

export interface GetNoteOptions {
	preview?: boolean;
	include_metadata?: boolean;
	max_content_length?: number;
}

/**
 * Get note content and metadata
 *
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @param options - Optional parameters
 * @returns JSON string with note content and metadata
 */
export async function getNote(
	app: App,
	path: string,
	options: GetNoteOptions = {}
): Promise<string> {
	const startTime = Date.now();
	console.log('[get_note] Starting with path:', path, 'options:', options);

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
	console.log('[get_note] Getting file from vault...');
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

	// Check if it's a text file
	if (!isTextFile(file)) {
		return createErrorResponse(
			'UNSUPPORTED_FILE_TYPE',
			`File is not a text file: "${path}". Extension: ${file.extension}`,
			['Only markdown and text files are supported'],
			startTime
		);
	}

	try {
		// Read file content
		console.log('[get_note] Reading file content...');
		let content = await app.vault.adapter.read(path);
		console.log('[get_note] Content read, length:', content.length);

		const {
			preview = false,
			include_metadata = true,
			max_content_length = 50000
		} = options;

		// Extract frontmatter if needed
		const frontmatter = extractFrontmatter(content);
		let contentWithoutFrontmatter = removeFrontmatter(content);

		// Handle preview mode
		let isPreview = preview;
		if (preview && contentWithoutFrontmatter.length > 500) {
			contentWithoutFrontmatter = contentWithoutFrontmatter.substring(0, 500) + '\n\n... (preview mode - use preview:false for full content)';
		} else if (!preview && contentWithoutFrontmatter.length > max_content_length) {
			// Auto-enable preview for very large files
			contentWithoutFrontmatter = contentWithoutFrontmatter.substring(0, 500) + '\n\n... (file too large - automatically truncated)';
			isPreview = true;
		}

		// Build response
		console.log('[get_note] Building response...');
		const response: any = {
			path: path,
			name: file.name,
			basename: file.basename,
			extension: file.extension,
			size: formatFileSize(file.stat.size),
			size_bytes: file.stat.size,
			created: new Date(file.stat.ctime).toISOString(),
			modified: new Date(file.stat.mtime).toISOString(),
			content: contentWithoutFrontmatter,
			is_preview: isPreview
		};

		// Add frontmatter separately if it exists
		if (frontmatter) {
			response.frontmatter = frontmatter;
		}

		// Add metadata if requested
		if (include_metadata) {
			const cache = app.metadataCache.getCache(path);

			if (cache) {
				response.metadata = {
					tags: cache.tags?.map(t => t.tag) || [],
					links: cache.links?.map(l => l.link) || [],
					embeds: cache.embeds?.map(e => e.link) || [],
					headings: cache.headings?.map(h => ({
						level: h.level,
						heading: h.heading,
						line: h.position.start.line
					})) || [],
					sections: cache.sections?.length || 0
				};

				// Add frontmatter from cache if available
				if (cache.frontmatter && !response.frontmatter) {
					response.frontmatter_parsed = cache.frontmatter;
				}
			}
		}

		console.log('[get_note] Returning success result');
		return createSuccessResponse(response, startTime);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[get_note] Error reading file:', errorMessage);

		return createErrorResponse(
			'READ_ERROR',
			`Failed to read note: ${errorMessage}`,
			undefined,
			startTime
		);
	}
}
