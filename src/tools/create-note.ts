import { App, TFile } from 'obsidian';

/**
 * Create a new note in the vault root folder
 * @param app - Obsidian app instance
 * @param filename - Name of the file to create (with or without .md extension)
 * @param content - Content to write to the new note
 * @returns Success message with the created file path
 */
export async function createNote(
	app: App,
	filename: string,
	content: string
): Promise<string> {
	try {
		// Ensure filename has .md extension
		const normalizedFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

		// Create the file in the root folder
		const file: TFile = await app.vault.create(normalizedFilename, content);

		console.log(`Created note: ${file.path}`);

		return JSON.stringify({
			success: true,
			path: file.path,
			message: `Note created successfully at: ${file.path}`
		}, null, 2);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('Error creating note:', errorMessage);

		return JSON.stringify({
			success: false,
			error: errorMessage,
			message: `Failed to create note: ${errorMessage}`
		}, null, 2);
	}
}
