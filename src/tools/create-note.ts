import { App, TFile, Notice } from 'obsidian';
import {
	createSuccessResponse,
	createErrorResponse,
	validatePath,
	ensureFolder
} from './common';

export interface CreateNoteOptions {
	folder?: string;
	open_after?: boolean;
	overwrite?: boolean;
}

/**
 * Create a new note in the vault
 * @param app - Obsidian app instance
 * @param filename - Name of the file to create (with or without .md extension)
 * @param content - Content to write to the new note
 * @param options - Optional parameters (folder, open_after, overwrite)
 * @returns Success message with the created file path
 */
export async function createNote(
	app: App,
	filename: string,
	content: string,
	options: CreateNoteOptions = {}
): Promise<string> {
	const startTime = Date.now();
	console.log('[create_note] Starting with filename:', filename, 'options:', options);

	// Validate filename parameter
	if (!filename) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Filename parameter is required',
			undefined,
			startTime
		);
	}

	// Validate content parameter
	if (content === undefined || content === null) {
		return createErrorResponse(
			'MISSING_PARAMETER',
			'Content parameter is required (can be empty string)',
			undefined,
			startTime
		);
	}

	const {
		folder = '',
		open_after = false,
		overwrite = false
	} = options;

	try {
		// Ensure filename has .md extension
		const normalizedFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

		// Build full path
		let fullPath = folder
			? `${folder.replace(/\/$/, '')}/${normalizedFilename}`
			: normalizedFilename;

		// Validate path format
		const pathValidation = validatePath(fullPath);
		if (!pathValidation.valid) {
			return createErrorResponse(
				'INVALID_PATH',
				pathValidation.error!,
				undefined,
				startTime
			);
		}

		// Check if file already exists
		const existingFile = app.vault.getAbstractFileByPath(fullPath);

		if (existingFile) {
			if (!overwrite) {
				return createErrorResponse(
					'FILE_EXISTS',
					`File already exists: "${fullPath}"`,
					['Set overwrite=true to replace existing file', 'Use a different filename'],
					startTime
				);
			}

			// Overwrite existing file
			if (existingFile instanceof TFile) {
				await app.vault.modify(existingFile, content);
				console.log('[create_note] Overwrote existing file:', fullPath);

				if (open_after) {
					await app.workspace.getLeaf().openFile(existingFile);
				}

				const response = {
					path: fullPath,
					name: existingFile.name,
					basename: existingFile.basename,
					size: content.length,
					overwritten: true,
					opened: open_after,
					wikilink: `[[${existingFile.basename}]]`
				};

				return createSuccessResponse(response, startTime);
			} else {
				return createErrorResponse(
					'PATH_IS_FOLDER',
					`Path exists but is a folder: "${fullPath}"`,
					['Use a different filename'],
					startTime
				);
			}
		}

		// Create folder if it doesn't exist
		if (folder) {
			try {
				await ensureFolder(app, folder);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				return createErrorResponse(
					'FOLDER_CREATE_ERROR',
					`Failed to create folder "${folder}": ${errorMessage}`,
					undefined,
					startTime
				);
			}
		}

		// Create the new file
		const file: TFile = await app.vault.create(fullPath, content);
		console.log('[create_note] Created note:', file.path);

		// Open the file if requested
		if (open_after) {
			await app.workspace.getLeaf().openFile(file);
			new Notice(`Opened: ${file.basename}`);
		}

		const response = {
			path: file.path,
			name: file.name,
			basename: file.basename,
			folder: folder || '(root)',
			size: content.length,
			created: new Date(file.stat.ctime).toISOString(),
			opened: open_after,
			wikilink: `[[${file.basename}]]`
		};

		return createSuccessResponse(response, startTime);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[create_note] Error creating note:', errorMessage);

		// Check for specific error types
		if (errorMessage.includes('already exists')) {
			return createErrorResponse(
				'FILE_EXISTS',
				`File already exists: ${errorMessage}`,
				['Set overwrite=true to replace existing file'],
				startTime
			);
		}

		return createErrorResponse(
			'CREATE_ERROR',
			`Failed to create note: ${errorMessage}`,
			undefined,
			startTime
		);
	}
}
