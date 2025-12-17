/**
 * MCP Protocol Test Script
 * Tests the three core MCP methods: initialize, tools/list, tools/call
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const http = require('http');

function sendMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const message = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: method,
            params: params
        };

        const data = JSON.stringify(message);

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

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing MCP Protocol Implementation\n');
    console.log('Make sure the plugin is loaded in Obsidian first!\n');

    try {
        // Test 1: Initialize
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1️⃣  Testing MCP Initialize');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const initResponse = await sendMCPRequest('initialize', {
            protocolVersion: '2024-11-05',
            clientInfo: { name: 'test-client', version: '1.0.0' }
        });
        console.log('✅ Response:', JSON.stringify(initResponse, null, 2));
        console.log();

        // Test 2: Tools List
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('2️⃣  Testing tools/list');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const listResponse = await sendMCPRequest('tools/list');
        console.log(`✅ Found ${listResponse.result.tools.length} tools:`);
        listResponse.result.tools.forEach((tool, index) => {
            console.log(`   ${index + 1}. ${tool.name}`);
            console.log(`      ${tool.description}`);
        });
        console.log();

        // Test 3: Tool Call - search
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('3️⃣  Testing tools/call (search)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const searchResponse = await sendMCPRequest('tools/call', {
            name: 'search',
            arguments: {
                query: 'test',
                scope_type: 'vault'
            }
        });
        console.log('✅ Response:', searchResponse.result.content[0].text);
        console.log();

        // Test 4: Tool Call - find_clusters
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('4️⃣  Testing tools/call (find_clusters)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const clusterResponse = await sendMCPRequest('tools/call', {
            name: 'find_clusters',
            arguments: {
                folder_path: '',
                query: 'project management',
                depth: 2
            }
        });
        console.log('✅ Response:', clusterResponse.result.content[0].text);
        console.log();

        // Test 5: Tool Call - bulk_tag
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('5️⃣  Testing tools/call (bulk_tag)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const tagResponse = await sendMCPRequest('tools/call', {
            name: 'bulk_tag',
            arguments: {
                file_paths: ['note1.md', 'note2.md'],
                tag: 'important'
            }
        });
        console.log('✅ Response:', tagResponse.result.content[0].text);
        console.log();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 All MCP protocol tests passed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nMake sure:');
        console.error('  1. Obsidian is running');
        console.error('  2. MCP Server plugin is enabled');
        console.error('  3. Server is running on port 3000');
        process.exit(1);
    }
}

runTests();
