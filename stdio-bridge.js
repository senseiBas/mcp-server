#!/usr/bin/env node

/**
 * MCP Stdio Bridge
 * Bridges between Claude Desktop (stdio) and Obsidian HTTP MCP Server
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('http');
const readline = require('readline');
/* eslint-enable @typescript-eslint/no-var-requires */

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;

// Create readline interface for stdin/stdout
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

/**
 * Send HTTP request to Obsidian MCP server
 */
function sendToObsidian(message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(message);

        const options = {
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid JSON response from Obsidian'));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Failed to connect to Obsidian: ${error.message}`));
        });

        req.write(data);
        req.end();
    });
}

/**
 * Handle incoming message from Claude Desktop
 */
async function handleMessage(line) {
    // Ignore empty lines
    if (!line || line.trim() === '') {
        return;
    }

    try {
        const request = JSON.parse(line);
        
        // Log to stderr (doesn't interfere with stdio)
        console.error('[REQUEST]', JSON.stringify(request));
        
        // Check if this is a notification (no id property)
        const isNotification = !request.id && request.method?.startsWith('notifications/');
        
        // Forward to Obsidian HTTP server
        const response = await sendToObsidian(request);
        
        // Log response
        console.error('[RESPONSE]', JSON.stringify(response));
        
        // Only send response back to Claude Desktop for requests (not notifications)
        if (!isNotification) {
            console.log(JSON.stringify(response));
        } else {
            console.error('[NOTIFICATION] No response sent to Claude Desktop');
        }
        
    } catch (error) {
        console.error('[ERROR]', error.message);
        // Send error response back to Claude Desktop
        const errorResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32603,
                message: error.message
            }
        };
        console.log(JSON.stringify(errorResponse));
    }
}

// Listen for messages from Claude Desktop on stdin
rl.on('line', handleMessage);

// Handle errors
rl.on('error', (error) => {
    console.error('Stdio bridge error:', error);
    process.exit(1);
});

// Log startup (to stderr so it doesn't interfere with stdio communication)
console.error('MCP Stdio Bridge started - connecting to Obsidian on http://localhost:3000');
