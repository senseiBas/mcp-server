/**
 * TypeScript type definitions for the MCP Server plugin
 */

// Tool parameter types
export interface SearchParams {
	query: string;
	scope_type: "file" | "folder" | "tag" | "vault";
	scope_value?: string;
}

export interface FindClustersParams {
	folder_path: string;
	query: string;
	depth?: number;
}

export interface BulkTagParams {
	file_paths: string[];
	tag: string;
}

// Tool result types
export interface SearchResult {
	path: string;
	title: string;
	context: string;
}

export interface ClusterResult {
	path: string;
	title: string;
	score: number;
}

export interface BulkTagResult {
	success: boolean;
	updated: string[];
	failed: string[];
	errors?: Record<string, string>;
}
