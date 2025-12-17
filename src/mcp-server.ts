import { App } from 'obsidian';
import { Server, IncomingMessage, ServerResponse } from 'http';

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
	private handleRequest(body: string, res: ServerResponse): void {
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
					response = this.handleToolsCall(request);
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
						name: 'search',
						description: 'Search vault with scope options (file, folder, tag, or entire vault)',
						inputSchema: {
							type: 'object',
							properties: {
								query: {
									type: 'string',
									description: 'Search query text'
								},
								scope_type: {
									type: 'string',
									enum: ['file', 'folder', 'tag', 'vault'],
									description: 'Type of scope to search in'
								},
								scope_value: {
									type: 'string',
									description: 'Value for the scope (file path, folder path, or tag name). Empty for vault-wide search.'
								}
							},
							required: ['query', 'scope_type']
						}
					},
					{
						name: 'find_clusters',
						description: 'Find related notes based on keyword similarity',
						inputSchema: {
							type: 'object',
							properties: {
								folder_path: {
									type: 'string',
									description: 'Folder path to search in (use "" for root)'
								},
								query: {
									type: 'string',
									description: 'Search keywords to find related notes'
								},
								depth: {
									type: 'number',
									description: 'How deep to traverse links (default: 1)',
									default: 1
								}
							},
							required: ['folder_path', 'query']
						}
					},
					{
						name: 'bulk_tag',
						description: 'Add tags to multiple notes at once',
						inputSchema: {
							type: 'object',
							properties: {
								file_paths: {
									type: 'array',
									items: { type: 'string' },
									description: 'Array of file paths to tag'
								},
								tag: {
									type: 'string',
									description: 'Tag to add (without #)'
								}
							},
							required: ['file_paths', 'tag']
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
	private handleToolsCall(request: JsonRpcRequest): Record<string, any> {
		const toolName = request.params?.name;
		const args = request.params?.arguments || {};

		console.log(`MCP Server: Calling tool "${toolName}" with args:`, args);

		// For now, return placeholder responses
		// Actual tool implementations will be added in rounds 4-6
		return {
			jsonrpc: '2.0',
			id: request.id,
			result: {
				content: [
					{
						type: 'text',
						text: `Tool "${toolName}" called successfully.\n\nArguments received:\n${JSON.stringify(args, null, 2)}\n\n(This is a placeholder response - actual implementation coming in next rounds)`
					}
				]
			}
		};
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.server !== null;
	}
}
