import { App } from 'obsidian';
import { Server, IncomingMessage, ServerResponse } from 'http';

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

		return new Promise((resolve) => {
			this.server!.close(() => {
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
			
			// For now, just echo back to confirm connection
			const response = {
				jsonrpc: '2.0',
				id: request.id,
				result: {
					status: 'connected',
					message: 'MCP Server is running',
					method: request.method
				}
			};

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
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.server !== null;
	}
}
