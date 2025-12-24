import { App } from 'obsidian';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { getNote } from './tools/get-note';
import { searchNotes } from './tools/search-notes';
import { getRelatedNotes } from './tools/get-related-notes';
import { appendToNote } from './tools/append-to-note';
import { createNote } from './tools/create-note';

/**
 * JSON-RPC request structure
 */
interface JsonRpcRequest {
	jsonrpc: string;
	id: number | string;
	method: string;
	params?: Record<string, any>;
}

/**
 * MCP Server - HTTP based for Electron compatibility
 * Handles MCP protocol communication via HTTP POST
 */
export class MCPServer {
	private app: App;
	private port: number;
	private server: Server | null = null;

	constructor(app: App, port: number) {
		this.app = app;
		this.port = port;
	}

	/**
	 * Start the HTTP server
	 */
	async start(): Promise<void> {
		if (this.server) {
			console.warn('MCP Server: Server already running');
			return;
		}

		try {
			// Use Electron's built-in http module
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const http = require('http');
			
			this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
				// Enable CORS for localhost
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
				res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
				
				if (req.method === 'OPTIONS') {
					res.writeHead(200);
					res.end();
					return;
				}

				if (req.method === 'POST') {
					let body = '';
					
					req.on('data', (chunk: Buffer) => {
						body += chunk.toString();
					});
					
					req.on('end', () => {
						this.handleRequest(body, res);
					});
				} else {
					res.writeHead(405);
					res.end('Method not allowed');
				}
			});

			if (!this.server) {
				throw new Error('Failed to create server');
			}
			
			this.server.listen(this.port, 'localhost', () => {
				console.log(`MCP Server: Started on http://localhost:${this.port}`);
			});

			this.server.on('error', (error: Error) => {
				console.error('MCP Server: Server error:', error);
			});

		} catch (error) {
			console.error('MCP Server: Failed to start:', error);
			throw error;
		}
	}

	/**
	 * Stop the HTTP server
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			return;
		}

		const serverToClose = this.server;
		return new Promise((resolve) => {
			serverToClose.close(() => {
				console.log('MCP Server: Stopped');
				this.server = null;
				resolve();
			});
		});
	}

	/**
	 * Handle incoming HTTP requests
	 */
	private async handleRequest(body: string, res: ServerResponse): Promise<void> {
		try {
			console.log('MCP Server: Received:', body);

			// Parse JSON-RPC message
			const request = JSON.parse(body);
			
			// Handle notifications (no response expected)
			if (!request.id && request.method?.startsWith('notifications/')) {
				console.log(`MCP Server: Notification received: ${request.method}`);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'ok' }));
				return;
			}
			
			// Route to appropriate MCP method handler
			let response;
			switch (request.method) {
				case 'initialize':
					response = this.handleInitialize(request);
					break;
				case 'tools/list':
					response = this.handleToolsList(request);
					break;
				case 'tools/call':
					response = await this.handleToolsCall(request);
					break;
				default:
					// Unknown method
					response = {
						jsonrpc: '2.0',
						id: request.id,
						error: {
							code: -32601,
							message: `Method not found: ${request.method}`
						}
					};
			}

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(response));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('MCP Server: Error handling request:', errorMessage);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ 
				jsonrpc: '2.0',
				error: { 
					code: -32603, 
					message: 'Internal server error',
					data: errorMessage
				} 
			}));
		}
	}

	/**
	 * Handle MCP initialize request
	 * Establishes protocol version and server capabilities
	 */
	private handleInitialize(request: JsonRpcRequest): Record<string, any> {
		console.log('MCP Server: Initialize request');
		
		return {
			jsonrpc: '2.0',
			id: request.id,
			result: {
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: {}
				},
				serverInfo: {
					name: 'obsidian-mcp-server',
					version: '1.0.0'
				}
			}
		};
	}

	/**
	 * Handle tools/list request
	 * Returns available tools and their schemas
	 */
	private handleToolsList(request: JsonRpcRequest): Record<string, any> {
		console.log('MCP Server: Tools list request');

		return {
			jsonrpc: '2.0',
			id: request.id,
			result: {
				tools: [
					{
						name: 'search_notes',
						description: 'Search for notes in the vault by query text. Searches in note titles and content. Returns matching notes with snippets, dates, and relevance scores. Supports filtering by folder/tag and sorting.',
						inputSchema: {
							type: 'object',
							properties: {
								query: {
									type: 'string',
									description: 'Search query text (searches in titles and content)'
								},
								folder: {
									type: 'string',
									description: 'Optional: Filter by folder path (e.g., "Projects/" or "🐉Ichigendo/")'
								},
								tag: {
									type: 'string',
									description: 'Optional: Filter by tag (without #, e.g., "effort" or "project")'
								},
								limit: {
									type: 'number',
									description: 'Optional: Maximum number of results (default: 10)',
									default: 10
								},
								sort_by: {
									type: 'string',
									description: 'Optional: Sort order - "relevance" (default), "modified", "created", or "title"',
									enum: ['relevance', 'modified', 'created', 'title'],
									default: 'relevance'
								}
							},
							required: ['query']
						}
					},
					{
						name: 'get_note',
						description: 'Read a note from the vault, including its content and metadata (tags, links, frontmatter). Supports preview mode for large files. Use search_notes first to find the correct path.',
						inputSchema: {
							type: 'object',
							properties: {
								path: {
									type: 'string',
									description: 'Vault path to the note (e.g., "Projects/My Project.md" or "Journal 📆/2025-W51.md")'
								},
								preview: {
									type: 'boolean',
									description: 'Optional: Return only first 500 chars (useful for large files, default: false)',
									default: false
								},
								include_metadata: {
									type: 'boolean',
									description: 'Optional: Include metadata like tags, links, headings (default: true)',
									default: true
								}
							},
							required: ['path']
						}
					},
					{
						name: 'get_related_notes',
						description: 'Get notes related to a specific note. Returns outgoing links (notes this note links to) and incoming links/backlinks (notes that link to this note). Supports depth traversal and content snippets.',
						inputSchema: {
							type: 'object',
							properties: {
								path: {
									type: 'string',
									description: 'Vault path to the note (e.g., "Journal 📆/2025-W51.md")'
								},
								depth: {
									type: 'number',
									description: 'Optional: Depth of link traversal (1-3). 1=direct links only, 2-3=transitive links (default: 1)',
									default: 1,
									minimum: 1,
									maximum: 3
								},
								include_snippets: {
									type: 'boolean',
									description: 'Optional: Include content snippets from related notes (default: false)',
									default: false
								}
							},
							required: ['path']
						}
					},
					{
						name: 'append_to_note',
						description: 'Append content to an existing note. Supports appending at different positions (end, start, after frontmatter). Useful for adding new information, logging, or extending notes.',
						inputSchema: {
							type: 'object',
							properties: {
								path: {
									type: 'string',
									description: 'Vault path to the note (e.g., "Journal 📆/2025-W51.md")'
								},
								content: {
									type: 'string',
									description: 'Content to append (markdown formatted)'
								},
								position: {
									type: 'string',
									description: 'Optional: Where to append - "end" (default), "start", or "after_frontmatter"',
									enum: ['end', 'start', 'after_frontmatter'],
									default: 'end'
								},
								ensure_newline: {
									type: 'boolean',
									description: 'Optional: Ensure newline separation (default: true)',
									default: true
								}
							},
							required: ['path', 'content']
						}
					},
					{
						name: 'create_note',
						description: 'Create a new note in the vault. Supports creating in specific folders (auto-creates if needed), overwriting existing files, and optionally opening after creation.',
						inputSchema: {
							type: 'object',
							properties: {
								filename: {
									type: 'string',
									description: 'Name of the file to create (with or without .md extension, e.g., "My New Note" or "My New Note.md")'
								},
								content: {
									type: 'string',
									description: 'Content to write to the new note (markdown formatted)'
								},
								folder: {
									type: 'string',
									description: 'Optional: Folder path to create note in (e.g., "Projects/"). Auto-creates folder if needed. Defaults to root folder.',
									default: ''
								},
								open_after: {
									type: 'boolean',
									description: 'Optional: Open the note in Obsidian after creation (default: false)',
									default: false
								},
								overwrite: {
									type: 'boolean',
									description: 'Optional: Overwrite if file already exists (default: false)',
									default: false
								}
							},
							required: ['filename', 'content']
						}
					}
				]
			}
		};
	}

	/**
	 * Handle tools/call request
	 * Executes a tool with given arguments
	 */
	private async handleToolsCall(request: JsonRpcRequest): Promise<Record<string, any>> {
		const toolName = request.params?.name;
		const args = request.params?.arguments || {};

		console.log(`MCP Server: Calling tool "${toolName}" with args:`, args);

		// Route to appropriate tool handler
		try {
			let result;

			switch (toolName) {
				case 'search_notes':
					result = await searchNotes(this.app, args.query, {
						folder: args.folder,
						tag: args.tag,
						limit: args.limit,
						sort_by: args.sort_by
					});
					break;
				case 'get_note':
					result = await getNote(this.app, args.path, {
						preview: args.preview,
						include_metadata: args.include_metadata
					});
					break;
				case 'get_related_notes':
					result = await getRelatedNotes(this.app, args.path, {
						depth: args.depth,
						include_snippets: args.include_snippets
					});
					break;
				case 'append_to_note':
					result = await appendToNote(this.app, args.path, args.content, {
						position: args.position,
						ensure_newline: args.ensure_newline
					});
					break;
				case 'create_note':
					result = await createNote(this.app, args.filename, args.content, {
						folder: args.folder,
						open_after: args.open_after,
						overwrite: args.overwrite
					});
					break;
				default:
					throw new Error(`Unknown tool: ${toolName}`);
			}

			return {
				jsonrpc: '2.0',
				id: request.id,
				result: {
					content: [
						{
							type: 'text',
							text: result
						}
					]
				}
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error(`MCP Server: Error executing tool "${toolName}":`, errorMessage);
			
			return {
				jsonrpc: '2.0',
				id: request.id,
				error: {
					code: -32603,
					message: `Tool execution failed: ${errorMessage}`
				}
			};
		}
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.server !== null;
	}
}
