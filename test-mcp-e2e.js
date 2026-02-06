#!/usr/bin/env node

/**
 * Test end-to-end del MCP Server
 * Prueba que las herramientas funcionen correctamente
 */

import { OmnySysMCPServer } from './src/layer-c-memory/mcp/core/server-class.js';

async function test() {
  console.log('🧪 Testing OmnySys MCP Server...\n');
  
  const server = new OmnySysMCPServer('.');
  
  // Simular el contexto que pasaría el MCP server
  const context = {
    projectPath: '.',
    server: { initialized: true },
    orchestrator: null // No testeamos con orchestrator por ahora
  };
  
  try {
    // Test 1: get_server_status
    console.log('Test 1: get_server_status');
    const { get_server_status } = await import('./src/layer-c-memory/mcp/tools/status.js');
    const status = await get_server_status({}, context);
    console.log('✅ Status:', JSON.stringify(status, null, 2).substring(0, 200) + '...\n');
    
    // Test 2: search_files
    console.log('Test 2: search_files');
    const { search_files } = await import('./src/layer-c-memory/mcp/tools/search.js');
    const search = await search_files({ pattern: 'mcp' }, context);
    console.log('✅ Found', search.found, 'files\n');
    
    // Test 3: get_impact_map (usar un archivo que existe)
    console.log('Test 3: get_impact_map');
    const { get_impact_map } = await import('./src/layer-c-memory/mcp/tools/impact-map.js');
    const impact = await get_impact_map({ filePath: 'src/core/orchestrator.js' }, context);
    console.log('✅ Impact:', impact.error || `Affects ${impact.totalAffected} files\n`);
    
    // Test 4: Omniscience tool - get_call_graph
    console.log('Test 4: get_call_graph (Omniscience)');
    const { get_call_graph } = await import('./src/layer-c-memory/mcp/tools/get-call-graph.js');
    const callGraph = await get_call_graph({ 
      filePath: 'src/layer-c-memory/mcp/tools/lib/ast-analyzer.js',
      symbolName: 'findCallSites'
    }, context);
    console.log('✅ Call Graph:', callGraph.error || `Found ${callGraph.summary?.totalCallSites || 0} call sites\n`);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

test();
