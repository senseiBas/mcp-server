/**
 * Simple HTTP test client for MCP server
 * Tests if the HTTP-based MCP server is responding
 */

const http = require('http');

const testMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'ping',
    params: {}
};

const data = JSON.stringify(testMessage);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('📤 Sending POST request to http://localhost:3000');
console.log('📋 Payload:', testMessage);

const req = http.request(options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    let body = '';
    
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        console.log('📥 Response:', body);
        try {
            const parsed = JSON.parse(body);
            console.log('✨ Parsed:', parsed);
        } catch (e) {
            console.log('⚠️  Could not parse JSON');
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});

req.write(data);
req.end();
