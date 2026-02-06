#!/usr/bin/env node

/**
 * OmnySys MCP Server Startup Script
 *
 * This script:
 * 1. Detects project root
 * 2. Loads analysis data
 * 3. Starts background processing
 * 4. Exposes MCP tools
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get project root (directory with .omnysysdata or package.json)
 */
function getProjectRoot() {
  const root = process.cwd();
  return root;
}

/**
 * Main startup function
 */
async function main() {
  const projectRoot = getProjectRoot();

  console.log('\n' + '='.repeat(60));
  console.log('🚀 OmnySys MCP Server Starting...');
  console.log('='.repeat(60));
  console.log(`📁 Project: ${projectRoot}\n`);

  try {
    // Step 1: Load module
    console.log('📦 Step 1: Loading OmnySys...');
    const { OmnySysMCPServer } = await import('./src/layer-c-memory/mcp/core/server-class.js');

    if (!OmnySysMCPServer) {
      throw new Error('OmnySysMCPServer class not found');
    }

    // Step 2: Create server instance
    console.log('🔧 Step 2: Creating server instance...');
    const server = new OmnySysMCPServer(projectRoot);

    // Step 3: Run server (initializes in background after MCP handshake)
    console.log('⏳ Step 3: Starting MCP server...');
    
    // Start server in non-blocking way for standalone use
    server.run().catch(error => {
      console.error('Server error:', error);
      process.exit(1);
    });
    
    // Wait a bit for initialization to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Show status
    const status = server.getStats();
    console.log('\n' + '='.repeat(60));
    console.log('✅ MCP Server Ready!');
    console.log('='.repeat(60));
    console.log('\n📊 Status:');
    console.log(`   • Orchestrator: ${status.orchestrator.status}`);
    console.log(`   • Initialized: ${status.initialized}`);
    console.log(`   • Total Files: ${status.metadata.totalFiles || 'Analyzing...'}`);
    console.log(`   • Cache: ${status.cache.stats.totalKeys} entries\n`);

    console.log('🎯 Available Tools (9 total):');
    console.log('   • get_impact_map(filePath)');
    console.log('   • analyze_change(filePath, symbolName)');
    console.log('   • explain_connection(fileA, fileB)');
    console.log('   • get_risk_assessment(minSeverity)');
    console.log('   • search_files(pattern)');
    console.log('   • get_server_status()');
    console.log('   • 🧠 get_call_graph(filePath, symbolName)');
    console.log('   • 🧠 analyze_signature_change(filePath, symbolName)');
    console.log('   • 🧠 explain_value_flow(filePath, symbolName)');
    console.log('\n💡 The server is now ready for queries from MCP clients.');
    console.log('💡 Press Ctrl+C to stop the server\n');

    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping MCP server...');
      await server.shutdown();
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Failed to start MCP server:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('   1. Check if .omnysysdata/ exists');
    console.error('   2. Check if all dependencies are installed (npm install)');
    console.error('   3. Check Node.js version (v16+ required)');
    console.error('   4. Run: npm run mcp:start');
    process.exit(1);
  }
}

// Run main function
main();
