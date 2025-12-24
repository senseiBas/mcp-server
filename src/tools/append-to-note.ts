import { App, TFile } from 'obsidian';
import {
	createSuccessResponse,
	createErrorResponse,
	validatePath,
	findSimilarPaths,
	getFileByPath,
	extractFrontmatter
} from './common';

export interface AppendToNoteOptions {
	position?: 'end' | 'start' | 'after_frontmatter';
	ensure_newline?: boolean;
}

/**
 * Append content to an existing note
 *
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @param content - Content to append
 * @param options - Optional parameters (position, ensure_newline)
 * @returns JSON string with success status
 */
export async function appendToNote(
	app: App,
	path: string,
	content: string,
	options: AppendToNoteOptions = {}
): Promise<string> {
	const startTime = Date.now();
	console.log('[append_to_note] Starting with path:', path, 'options:', options);

	// Validate path parameter
	if (!path) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Path parameter is required',
			undefined,
			startTime
		);
	}

	// Validate content parameter
	if (!content) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Content parameter is required',
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
			position = 'end',
			ensure_newline = true
		} = options;

		// Read current content
		const currentContent = await app.vault.adapter.read(path);
		const originalLength = currentContent.length;

		let newContent: string;

		switch (position) {
			case 'start':
				// Add content at the very beginning
				const startSeparator = ensure_newline ? '\n\n' : '';
				newContent = content + startSeparator + currentContent;
				break;

			case 'after_frontmatter':
				// Add content after frontmatter (or at start if no frontmatter)
				const frontmatter = extractFrontmatter(currentContent);
				if (frontmatter) {
					const frontmatterBlock = `---\n${frontmatter}\n---\n`;
					const afterFrontmatter = currentContent.substring(frontmatterBlock.length);
					const fmSeparator = ensure_newline ? '\n' : '';
					newContent = frontmatterBlock + content + fmSeparator + afterFrontmatter;
				} else {
					// No frontmatter, add at start
					const noFmSeparator = ensure_newline ? '\n\n' : '';
					newContent = content + noFmSeparator + currentContent;
				}
				break;

			case 'end':
			default:
				// Add content at the end (default behavior)
				let separator = '';
				if (ensure_newline) {
					// Ensure proper newline separation
					if (!currentContent.endsWith('\n')) {
						separator = '\n';
					}
					// Add extra newline for better readability
					if (!content.startsWith('\n')) {
						separator += '\n';
					}
				}
				newContent = currentContent + separator + content;
				break;
		}

		// Write back to file
		await app.vault.adapter.write(path, newContent);

		console.log('[append_to_note] Successfully appended', content.length, 'characters at position', position);

		// Create preview of appended content
		const previewLength = 200;
		const contentPreview = content.length > previewLength
			? content.substring(0, previewLength) + '...'
			: content;

		const response = {
			path: path,
			position: position,
			appended_length: content.length,
			original_length: originalLength,
			new_length: newContent.length,
			content_preview: contentPreview
		};

		return createSuccessResponse(response, startTime);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[append_to_note] Error:', errorMessage);

		return createErrorResponse(
			'APPEND_ERROR',
			`Failed to append to note: ${errorMessage}`,
			undefined,
			startTime
		);
	}
}
