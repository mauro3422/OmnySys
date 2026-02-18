#!/usr/bin/env node

/**
 * OmnySys MCP HTTP Server
 * 
 * Versión HTTP del MCP Server para usar como servicio permanente
 * Similar al LLM Server - escucha en un puerto y responde a requests
 * 
 * Usage: node mcp-http-server.js [port]
 * Default port: 9999
 */

import express from 'express';
import cors from 'cors';
import { toolHandlers } from './src/layer-c-memory/mcp/tools/index.js';
import { Orchestrator } from './src/core/orchestrator.js';
import { UnifiedCacheManager } from './src/core/unified-cache-manager.js';
import path from 'path';

const PORT = process.argv[2] || 9999;
const PROJECT_PATH = process.cwd();

// Estado del servidor
let serverState = {
  initialized: false,
  initializing: false,
  orchestrator: null,
  cache: null,
  stats: {
    totalRequests: 0,
    startTime: Date.now()
  }
};

const app = express();
app.use(cors());
app.use(express.json());

// Contexto para las herramientas
function getContext() {
  return {
    projectPath: PROJECT_PATH,
    orchestrator: serverState.orchestrator,
    server: serverState,
    cache: serverState.cache
  };
}

// ==========================================
// ENDPOINTS
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: serverState.initialized ? 'ready' : (serverState.initializing ? 'initializing' : 'error'),
    initialized: serverState.initialized,
    uptime: Date.now() - serverState.stats.startTime,
    stats: serverState.stats,
    tools: Object.keys(toolHandlers).length
  });
});

// List tools (MCP compatible)
app.get('/tools', (req, res) => {
  const tools = Object.keys(toolHandlers).map(name => ({
    name,
    description: getToolDescription(name),
    inputSchema: getToolSchema(name)
  }));
  
  res.json({ tools });
});

// Call tool
app.post('/tools/:name', async (req, res) => {
  const { name } = req.params;
  const args = req.body;
  
  serverState.stats.totalRequests++;
  
  console.log(`[${new Date().toISOString()}] Tool: ${name}`, args);
  
  const handler = toolHandlers[name];
  if (!handler) {
    return res.status(404).json({ error: `Tool '${name}' not found` });
  }
  
  try {
    const result = await handler(args, getContext());
    res.json({ 
      result,
      tool: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error calling ${name}:`, error);
    res.status(500).json({ 
      error: error.message,
      tool: name 
    });
  }
});

// Call tool (alternative endpoint)
app.post('/call', async (req, res) => {
  const { name, arguments: args } = req.body;
  
  serverState.stats.totalRequests++;
  
  console.log(`[${new Date().toISOString()}] Tool: ${name}`, args);
  
  const handler = toolHandlers[name];
  if (!handler) {
    return res.status(404).json({ error: `Tool '${name}' not found` });
  }
  
  try {
    const result = await handler(args, getContext());
    res.json({ 
      result,
      tool: name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error calling ${name}:`, error);
    res.status(500).json({ 
      error: error.message,
      tool: name 
    });
  }
});

// Status endpoint
app.get('/status', async (req, res) => {
  const metadata = serverState.cache?.getProjectMetadata?.(PROJECT_PATH) || {};
  
  res.json({
    initialized: serverState.initialized,
    initializing: serverState.initializing,
    project: PROJECT_PATH,
    timestamp: new Date().toISOString(),
    stats: serverState.stats,
    orchestrator: serverState.orchestrator ? {
      status: 'ready',
      queueSize: serverState.orchestrator.queue?.length || 0
    } : { status: 'not_ready' },
    metadata: {
      totalFiles: metadata?.metadata?.totalFiles || 0,
      lastAnalyzed: metadata?.metadata?.lastAnalyzed
    }
  });
});

// ==========================================
// HELPERS
// ==========================================

function getToolDescription(name) {
  const descriptions = {
    get_impact_map: 'Returns a complete impact map for a file',
    analyze_change: 'Analyzes the impact of changing a specific symbol',
    explain_connection: 'Explains why two files are connected',
    get_risk_assessment: 'Returns a risk assessment of the entire project',
    search_files: 'Search for files in the project by pattern',
    get_server_status: 'Returns the complete status of the OmnySys server',
    get_call_graph: 'Shows ALL call sites of a symbol - who calls what, where, and how',
    analyze_signature_change: 'Predicts breaking changes if you modify a function signature',
    explain_value_flow: 'Shows data flow: inputs → symbol → outputs → consumers'
  };
  return descriptions[name] || name;
}

function getToolSchema(name) {
  const schemas = {
    get_impact_map: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
    analyze_change: { type: 'object', properties: { filePath: { type: 'string' }, symbolName: { type: 'string' } }, required: ['filePath', 'symbolName'] },
    explain_connection: { type: 'object', properties: { fileA: { type: 'string' }, fileB: { type: 'string' } }, required: ['fileA', 'fileB'] },
    get_risk_assessment: { type: 'object', properties: { minSeverity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' } } },
    search_files: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] },
    get_server_status: { type: 'object', properties: {} },
    get_call_graph: { type: 'object', properties: { filePath: { type: 'string' }, symbolName: { type: 'string' }, includeContext: { type: 'boolean', default: true } }, required: ['filePath', 'symbolName'] },
    analyze_signature_change: { type: 'object', properties: { filePath: { type: 'string' }, symbolName: { type: 'string' }, newSignature: { type: 'string' } }, required: ['filePath', 'symbolName'] },
    explain_value_flow: { type: 'object', properties: { filePath: { type: 'string' }, symbolName: { type: 'string' }, maxDepth: { type: 'number', default: 2 } }, required: ['filePath', 'symbolName'] }
  };
  return schemas[name] || { type: 'object' };
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initialize() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 OMNYsys MCP HTTP Server                                  ║');
  console.log('║  Puerto: ' + PORT.toString().padEnd(51) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  serverState.initializing = true;
  
  try {
    // Initialize cache
    console.log('📦 Initializing cache...');
    serverState.cache = new UnifiedCacheManager(PROJECT_PATH);
    await serverState.cache.initialize();
    console.log('✅ Cache ready\n');
    
    // Initialize orchestrator
    console.log('🔧 Initializing orchestrator...');
    serverState.orchestrator = new Orchestrator(PROJECT_PATH, {
      enableFileWatcher: true,
      enableWebSocket: false,
      autoStartLLM: false // LLM already running
    });
    await serverState.orchestrator.initialize();
    console.log('✅ Orchestrator ready\n');
    
    serverState.initialized = true;
    serverState.initializing = false;
    
    console.log('🚀 Server initialized successfully!\n');
    console.log('📡 Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/tools`);
    console.log(`   POST http://localhost:${PORT}/tools/:name`);
    console.log(`   POST http://localhost:${PORT}/call`);
    console.log(`   GET  http://localhost:${PORT}/status\n`);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    serverState.initializing = false;
    throw error;
  }
}

// Start server
async function main() {
  await initialize();
  
  app.listen(PORT, () => {
    console.log(`✅ Server listening on port ${PORT}\n`);
    console.log('💡 Press Ctrl+C to stop\n');
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
