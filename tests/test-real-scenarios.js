#!/usr/bin/env node

/**
 * Test real de test-cases con el MCP y LFM2.5-Instruct
 * Ejecuta el análisis completo en escenarios reales
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testCases = [
  {
    name: 'scenario-ia-dynamic-imports',
    description: 'Dynamic imports con Router'
  },
  {
    name: 'scenario-4-localStorage-bridge', 
    description: 'AuthService y ApiClient con localStorage'
  },
  {
    name: 'scenario-2-semantic',
    description: 'GameStore y EventBus con window.*'
  },
  {
    name: 'scenario-ia-orphan-effects',
    description: 'Módulos huérfanos'
  },
  {
    name: 'scenario-6-god-object',
    description: 'God Object pattern'
  }
];

async function runTestCase(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`📝 ${testCase.description}`);
  console.log('='.repeat(80));
  
  const testCasePath = path.join(process.cwd(), 'test-cases', testCase.name);
  const mcpPath = path.join(process.cwd(), 'src', 'layer-c-memory', 'mcp', 'index.js');
  
  return new Promise((resolve, reject) => {
    console.log(`\n⏳ Running MCP analysis...`);
    console.log(`   Path: ${testCasePath}\n`);
    
    const mcp = spawn('node', [mcpPath, testCasePath], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    mcp.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    mcp.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      // Solo mostrar errores relevantes, no logs de debug
      if (text.includes('ERROR') || text.includes('❌')) {
        process.stderr.write(text);
      }
    });
    
    mcp.on('close', (code) => {
      console.log('\n' + '-'.repeat(80));
      if (code === 0) {
        console.log(`✅ Test completed successfully`);
        resolve({ success: true, output });
      } else {
        console.log(`⚠️  Test exited with code ${code}`);
        resolve({ success: false, output, error: errorOutput });
      }
    });
    
    mcp.on('error', (err) => {
      console.error(`❌ Failed to start MCP: ${err.message}`);
      reject(err);
    });
    
    // Timeout de 3 minutos por test case
    setTimeout(() => {
      mcp.kill();
      console.log('\n⏱️  Test timeout (3 minutes)');
      resolve({ success: false, output, error: 'Timeout' });
    }, 180000);
  });
}

async function main() {
  console.log('🚀 Testing Real Test-Cases with LFM2.5-Instruct\n');
  console.log('This will run the MCP analysis on actual test scenarios.\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const result = await runTestCase(testCase);
      results.push({
        name: testCase.name,
        success: result.success
      });
    } catch (error) {
      console.error(`❌ Error running ${testCase.name}:`, error.message);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
  }
  
  console.log('\n\n📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log('\nResults:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.name}`);
  });
  console.log('='.repeat(80));
}

main().catch(console.error);
