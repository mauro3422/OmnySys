#!/usr/bin/env node

/**
 * Test script para validar las 5 herramientas MCP
 *
 * Uso:
 *   node test-mcp-tools.js /path/to/project
 */

import { CogniSystemMCPServer } from './src/layer-c-memory/mcp-server.js';
import path from 'path';

async function testMCPTools(projectPath) {
  const absolutePath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);

  console.log('\n📋 Testing MCP Tools\n');
  console.log(`Project: ${absolutePath}\n`);

  const server = new CogniSystemMCPServer(absolutePath);

  try {
    console.log('🚀 Initializing MCP Server...\n');
    await server.initialize();

    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: get_impact_map(filePath)');
    console.log('='.repeat(70) + '\n');

    const impactResult = await server.getImpactMap('src/EventBus.js');
    console.log('Impact Map for src/EventBus.js:');
    console.log(JSON.stringify(impactResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: analyze_change(filePath, symbolName)');
    console.log('='.repeat(70) + '\n');

    const changeResult = await server.analyzeChange('src/GameStore.js', 'gameStore');
    console.log('Change Analysis for gameStore in src/GameStore.js:');
    console.log(JSON.stringify(changeResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: explain_connection(fileA, fileB)');
    console.log('='.repeat(70) + '\n');

    const connResult = await server.explainConnection('src/GameEvents.js', 'src/EventBus.js');
    console.log('Connection between GameEvents.js and EventBus.js:');
    console.log(JSON.stringify(connResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: get_risk_assessment(minSeverity)');
    console.log('='.repeat(70) + '\n');

    const riskResult = await server.getRiskAssessment('medium');
    console.log('Risk Assessment (minSeverity: medium):');
    console.log(JSON.stringify(riskResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: search_files(pattern)');
    console.log('='.repeat(70) + '\n');

    const searchResult = await server.searchFiles('*.js');
    console.log('Search for *.js:');
    console.log(JSON.stringify(searchResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('📊 Server Stats');
    console.log('='.repeat(70) + '\n');

    const stats = server.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Error during testing:');
    console.error(error.message);
    process.exit(1);
  }
}

const projectPath = process.argv[2] || 'test-cases/scenario-2-semantic/';
await testMCPTools(projectPath);
