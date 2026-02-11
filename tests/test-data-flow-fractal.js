/**
 * Test script for Data Flow Fractal System v0.7.0
 * Tests Phases 1, 2, and 3 with real project files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFileFromDisk } from './src/layer-a-static/parser/index.js';
import { extractAllMetadata } from './src/layer-a-static/extractors/metadata/index.js';
import { extractMolecularStructure, analyzeProjectSystem } from './src/layer-a-static/pipeline/molecular-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file to analyze
const TEST_FILE = './src/layer-a-static/pipeline/molecular-extractor.js';

async function testPhase1Atom(filePath) {
  console.log('\n=== PHASE 1: ATOMIC DATA FLOW ===\n');
  
  const fullPath = path.resolve(__dirname, filePath);
  console.log(`Testing with: ${filePath}`);
  
  const code = await fs.readFile(fullPath, 'utf-8');
  const parsed = await parseFileFromDisk(fullPath);
  
  if (!parsed || !parsed.functions || parsed.functions.length === 0) {
    console.log('⚠️  No functions found to analyze');
    return null;
  }
  
  console.log(`Found ${parsed.functions.length} functions`);
  
  const metadata = extractAllMetadata(filePath, code);
  const molecular = await extractMolecularStructure(filePath, code, parsed, metadata);
  
  // Analyze first atom
  const firstAtom = molecular.atoms[0];
  console.log(`\n📊 First Atom: ${firstAtom.name}`);
  console.log(`  - Type: ${firstAtom.type}`);
  console.log(`  - Complexity: ${firstAtom.complexity}`);
  console.log(`  - Lines of Code: ${firstAtom.linesOfCode}`);
  console.log(`  - Has Data Flow: ${firstAtom.dataFlow ? '✅' : '❌'}`);
  console.log(`  - Has Standardized: ${firstAtom.standardized ? '✅' : '❌'}`);
  console.log(`  - Invariants: ${firstAtom.invariants?.length || 0}`);
  console.log(`  - Archetype: ${firstAtom.archetype?.type || 'unknown'}`);
  
  if (firstAtom.dataFlow) {
    console.log(`\n  Data Flow Details:`);
    console.log(`    - Inputs: ${firstAtom.dataFlow.inputs?.length || 0}`);
    console.log(`    - Transforms: ${firstAtom.dataFlow.transforms?.length || 0}`);
    console.log(`    - Outputs: ${firstAtom.dataFlow.outputs?.length || 0}`);
    console.log(`    - Side Effects: ${firstAtom.dataFlow.sideEffects?.length || 0}`);
    
    if (firstAtom.dataFlow.transforms?.length > 0) {
      console.log(`\n    Transform Types:`);
      const transformTypes = [...new Set(firstAtom.dataFlow.transforms.map(t => t.transform))];
      transformTypes.forEach(type => console.log(`      • ${type}`));
    }
  }
  
  return molecular;
}

async function testPhase2MolecularChains(molecular) {
  console.log('\n=== PHASE 2: MOLECULAR CHAINS ===\n');
  
  if (!molecular.molecularChains) {
    console.log('❌ No molecular chains found');
    return;
  }
  
  const { chains, graph, summary } = molecular.molecularChains;
  
  console.log(`✅ Built ${chains.length} molecular chains`);
  console.log(`\n📈 Chain Summary:`);
  console.log(`  - Total Chains: ${summary.totalChains}`);
  console.log(`  - Average Chain Length: ${summary.avgChainLength?.toFixed(2) || 'N/A'}`);
  console.log(`  - Longest Chain: ${summary.longestChain} steps`);
  console.log(`  - Critical Path Functions: ${summary.criticalPathFunctions?.length || 0}`);
  
  if (chains.length > 0) {
    console.log(`\n🔗 First Chain:`);
    const firstChain = chains[0];
    console.log(`  Start: ${firstChain.startAtom}`);
    console.log(`  End: ${firstChain.endAtom}`);
    console.log(`  Steps: ${firstChain.steps.length}`);
    console.log(`  Data Flow: ${firstChain.dataFlow}`);
  }
  
  if (graph && graph.nodes) {
    console.log(`\n📊 Cross-Function Graph:`);
    console.log(`  - Nodes: ${graph.nodes.length}`);
    console.log(`  - Edges: ${graph.edges?.length || 0}`);
    console.log(`  - Entry Points: ${graph.entryPoints?.length || 0}`);
    console.log(`  - Exit Points: ${graph.exitPoints?.length || 0}`);
  }
}

async function testPhase3System(allMolecules) {
  console.log('\n=== PHASE 3: MODULE & SYSTEM ===\n');
  
  const projectRoot = __dirname;
  const systemAnalysis = await analyzeProjectSystem(projectRoot, allMolecules);
  
  console.log(`✅ System analysis complete`);
  console.log(`\n📊 System Summary:`);
  console.log(`  - Total Modules: ${systemAnalysis.summary.totalModules}`);
  console.log(`  - Total Business Flows: ${systemAnalysis.summary.totalBusinessFlows}`);
  
  if (systemAnalysis.system) {
    console.log(`\n🌐 System Context:`);
    console.log(`  - Entry Points: ${systemAnalysis.system.entryPoints?.length || 0}`);
    console.log(`  - Business Flows: ${systemAnalysis.system.businessFlows?.length || 0}`);
    
    if (systemAnalysis.system.businessFlows?.length > 0) {
      console.log(`\n  📋 First Business Flow:`);
      const firstFlow = systemAnalysis.system.businessFlows[0];
      console.log(`    Name: ${firstFlow.name}`);
      console.log(`    Entry: ${firstFlow.entryPoint}`);
      console.log(`    Functions: ${firstFlow.functions?.length || 0}`);
    }
  }
  
  if (systemAnalysis.modules?.length > 0) {
    console.log(`\n📦 Modules:`);
    systemAnalysis.modules.slice(0, 3).forEach(mod => {
      console.log(`  • ${mod.moduleName} (${mod.modulePath})`);
      console.log(`    - Functions: ${mod.metrics?.totalFunctions || 0}`);
      console.log(`    - Files: ${mod.metrics?.totalFiles || 0}`);
      console.log(`    - Exports: ${mod.exports?.length || 0}`);
    });
    if (systemAnalysis.modules.length > 3) {
      console.log(`    ... and ${systemAnalysis.modules.length - 3} more modules`);
    }
  }
}

async function runTest() {
  console.log('🚀 Data Flow Fractal System v0.7.0 Test\n');
  console.log('='.repeat(50));
  
  try {
    // Phase 1: Test atomic data flow
    const molecular = await testPhase1Atom(TEST_FILE);
    
    if (!molecular) {
      console.error('\n❌ Phase 1 failed - aborting');
      process.exit(1);
    }
    
    // Phase 2: Test molecular chains
    await testPhase2MolecularChains(molecular);
    
    // Phase 3: Test system analysis
    // We'll create a simple array with just this molecule for testing
    const allMolecules = [molecular];
    await testPhase3System(allMolecules);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All phases completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • Analyzed ${molecular.atoms.length} atoms`);
    console.log(`  • Built ${molecular.molecularChains?.chains?.length || 0} chains`);
    console.log(`  • System context: Available`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
