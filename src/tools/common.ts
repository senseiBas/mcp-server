import { App, TFile, TFolder } from 'obsidian';

/**
 * Standard success response format
 */
export interface ToolResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		suggestions?: string[];
	};
	timestamp: string;
	execution_time_ms: number;
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, startTime: number): string {
	const response: ToolResponse<T> = {
		success: true,
		data,
		timestamp: new Date().toISOString(),
		execution_time_ms: Date.now() - startTime
	};
	return JSON.stringify(response, null, 2);
}

/**
 * Create an error response
 */
export function createErrorResponse(
	code: string,
	message: string,
	suggestions?: string[],
	startTime?: number
): string {
	const response: ToolResponse = {
		success: false,
		error: {
			code,
			message,
			suggestions
		},
		timestamp: new Date().toISOString(),
		execution_time_ms: startTime ? Date.now() - startTime : 0
	};
	return JSON.stringify(response, null, 2);
}

/**
 * Validate that a path is safe (no directory traversal)
 */
export function validatePath(path: string): { valid: boolean; error?: string } {
	// Check for absolute paths
	if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
		return {
			valid: false,
			error: 'Absolute paths are not allowed. Use vault-relative paths.'
		};
	}

	// Check for directory traversal
	if (path.includes('..')) {
		return {
			valid: false,
			error: 'Directory traversal (..) is not allowed.'
		};
	}

	return { valid: true };
}

/**
 * Find similar file paths (for suggestions)
 */
export function findSimilarPaths(app: App, targetPath: string, maxResults = 3): string[] {
	const files = app.vault.getMarkdownFiles();
	const targetLower = targetPath.toLowerCase();

	// Calculate simple similarity score
	const scored = files.map(file => {
		const pathLower = file.path.toLowerCase();
		let score = 0;

		// Exact match bonus
		if (pathLower === targetLower) score += 100;

		// Contains bonus
		if (pathLower.includes(targetLower)) score += 50;

		// Basename match bonus
		if (file.basename.toLowerCase().includes(targetLower)) score += 30;

		// Levenshtein-like scoring (simplified)
		const commonChars = [...targetLower].filter(char => pathLower.includes(char)).length;
		score += commonChars;

		return { path: file.path, score };
	});

	// Sort by score and return top results
	return scored
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults)
		.filter(item => item.score > 0)
		.map(item => item.path);
}

/**
 * Get a file by path with helpful error
 */
export function getFileByPath(app: App, path: string): TFile | null {
	const file = app.vault.getAbstractFileByPath(path);

	if (!file) {
		return null;
	}

	if (!(file instanceof TFile)) {
		return null;
	}

	return file;
}

/**
 * Check if a file is a text/markdown file
 */
export function isTextFile(file: TFile): boolean {
	const extension = file.extension.toLowerCase();
	const textExtensions = ['md', 'txt', 'json', 'yaml', 'yml', 'csv', 'html', 'xml'];
	return textExtensions.includes(extension);
}

/**
 * Extract a snippet from content around a search term
 */
export function extractSnippet(
	content: string,
	searchTerm: string,
	maxLength = 200
): string {
	const lowerContent = content.toLowerCase();
	const lowerTerm = searchTerm.toLowerCase();
	const index = lowerContent.indexOf(lowerTerm);

	if (index === -1) {
		// Term not found, return beginning
		return content.substring(0, maxLength).trim() + (content.length > maxLength ? '...' : '');
	}

	// Calculate start position (try to center the term)
	const halfLength = Math.floor(maxLength / 2);
	const start = Math.max(0, index - halfLength);
	const end = Math.min(content.length, start + maxLength);

	let snippet = content.substring(start, end);

	// Add ellipsis
	if (start > 0) snippet = '...' + snippet;
	if (end < content.length) snippet = snippet + '...';

	// Highlight the search term with **bold**
	const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
	snippet = snippet.replace(regex, '**$1**');

	return snippet.trim();
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get or create a folder
 */
export async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const folder = app.vault.getAbstractFileByPath(folderPath);

	if (!folder) {
		// Create folder recursively
		await app.vault.createFolder(folderPath);
	} else if (!(folder instanceof TFolder)) {
		throw new Error(`Path exists but is not a folder: ${folderPath}`);
	}
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Clean frontmatter from content
 */
export function removeFrontmatter(content: string): string {
	const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
	return content.replace(frontmatterRegex, '');
}

/**
 * Extract frontmatter from content
 */
export function extractFrontmatter(content: string): string | null {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
	const match = content.match(frontmatterRegex);
	return match ? match[1] : null;
}
