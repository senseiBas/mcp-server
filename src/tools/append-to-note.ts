import { App, TFile } from 'obsidian';

/**
 * Append content to an existing note
 * 
 * @param app - Obsidian App instance
 * @param path - Vault path to the note
 * @param content - Content to append
 * @returns JSON string with success status
 */
export async function appendToNote(app: App, path: string, content: string): Promise<string> {
	console.log('[append_to_note] Starting with path:', path);
	
	if (!path) {
		throw new Error('Path parameter is required');
	}

	if (!content) {
		throw new Error('Content parameter is required');
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

	// Read current content
	const currentContent = await app.vault.adapter.read(path);
	
	// Append new content (add newline separator if file doesn't end with one)
	const separator = currentContent.endsWith('\n') ? '' : '\n';
	const newContent = currentContent + separator + content;
	
	// Write back to file
	await app.vault.adapter.write(path, newContent);
	
	console.log('[append_to_note] Successfully appended', content.length, 'characters');
	
	const response = {
		success: true,
		path: path,
		appended_length: content.length
	};

	return JSON.stringify(response, null, 2);
}
