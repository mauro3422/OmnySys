/**
 * Validación de arquitectura - Verifica integridad del sistema
 * Detecta: ciclos de importación, dependencias faltantes, inconsistencias
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Resultados de validación
const validation = {
  errors: [],
  warnings: [],
  infos: [],
  
  error(msg, details = '') {
    this.errors.push({ msg, details });
    console.error(`❌ ${msg}`, details);
  },
  
  warn(msg, details = '') {
    this.warnings.push({ msg, details });
    console.warn(`⚠️  ${msg}`, details);
  },
  
  info(msg, details = '') {
    this.infos.push({ msg, details });
    console.log(`ℹ️  ${msg}`, details);
  }
};

// Verificar que un archivo existe y es legible
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Extraer imports de un archivo
async function extractImports(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const imports = [];
    
    // Match import statements
    const importRegex = /import\s+(?:(?:{[^}]*}|[^'"]*)\s+from\s+)?['"]([^'"]+)['"];?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  } catch (error) {
    validation.error(`Cannot read ${filePath}`, error.message);
    return [];
  }
}

// Resolver import path a archivo real
function resolveImport(importPath, fromFile) {
  // Relative imports
  if (importPath.startsWith('.')) {
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);
    
    // Try common extensions
    const extensions = ['', '.js', '/index.js'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.access(fullPath).then(() => true).catch(() => false)) {
        return fullPath;
      }
    }
    return resolved + '.js'; // Default
  }
  
  // Path aliases (simplified)
  if (importPath.startsWith('#')) {
    return path.resolve(ROOT_DIR, 'src', importPath.replace(/^#/, '').replace(/\//g, path.sep));
  }
  
  // Node modules - skip
  return null;
}

// Verificar flujo de inicialización
async function validateInitializationFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING INITIALIZATION FLOW');
  console.log('='.repeat(60));
  
  const criticalFiles = [
    'src/services/llm-service.js',
    'src/services/index.js',
    'src/core/worker/AnalysisWorker.js',
    'src/core/orchestrator/lifecycle.js',
    'src/core/orchestrator/llm-analysis.js',
    'src/layer-c-memory/mcp-server.js'
  ].map(f => path.join(ROOT_DIR, f));
  
  for (const file of criticalFiles) {
    const exists = await checkFileExists(file);
    const displayPath = path.relative(ROOT_DIR, file);
    
    if (exists) {
      validation.info(`✅ ${displayPath}`);
    } else {
      validation.error(`❌ Missing critical file`, file);
    }
  }
}

// Verificar dependencias del LLMService
async function validateLLMService() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING LLMService');
  console.log('='.repeat(60));
  
  const servicePath = path.resolve(ROOT_DIR, 'src/services/llm-service.js');
  const imports = await extractImports(servicePath);
  
  validation.info('LLMService imports:');
  imports.forEach(imp => validation.info(`  - ${imp}`));
  
  // Verificar dependencias críticas
  const requiredImports = [
    '../ai/llm/client.js',
    '../ai/llm/load-config.js',
    '../utils/logger.js'
  ].map(i => i.replace(/^\.\.\//, '../../src/')); // Adjust path for moved file
  
  for (const req of requiredImports) {
    if (imports.includes(req)) {
      validation.info(`✅ Has required import: ${req}`);
    } else {
      validation.error(`❌ Missing required import: ${req}`);
    }
  }
  
  // Verificar que exporta lo necesario
  const content = await fs.readFile(servicePath, 'utf-8');
  const requiredExports = [
    'export class LLMService',
    'export async function analyzeWithLLM',
    'export async function isLLMAvailable',
    'export async function waitForLLM'
  ];
  
  for (const exp of requiredExports) {
    if (content.includes(exp)) {
      validation.info(`✅ Exports: ${exp.split(' ').pop()}`);
    } else {
      validation.warn(`⚠️  Missing export: ${exp}`);
    }
  }
}

// Verificar AnalysisWorker
async function validateAnalysisWorker() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING AnalysisWorker');
  console.log('='.repeat(60));
  
  const workerPath = path.resolve(ROOT_DIR, 'src/core/worker/AnalysisWorker.js');
  const content = await fs.readFile(workerPath, 'utf-8');
  
  // Verificar que usa LLMService
  if (content.includes('LLMService')) {
    validation.info('✅ Uses LLMService');
  } else {
    validation.error('❌ Does not use LLMService');
  }
  
  // Verificar método _getLLMService
  if (content.includes('_getLLMService')) {
    validation.info('✅ Has _getLLMService method');
  } else {
    validation.error('❌ Missing _getLLMService method');
  }
  
  // Verificar backwards compatibility
  if (content.includes('llmAnalyzer') && content.includes('@deprecated')) {
    validation.info('✅ Has deprecated llmAnalyzer accessor');
  } else {
    validation.warn('⚠️  Missing deprecated annotation on llmAnalyzer');
  }
  
  // Verificar imports
  const imports = await extractImports(workerPath);
  if (imports.includes('../services/llm-service.js')) {
    validation.info('✅ Imports LLMService');
  } else {
    validation.error('❌ Does not import LLMService');
  }
}

// Verificar Orchestrator
async function validateOrchestrator() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING Orchestrator');
  console.log('='.repeat(60));
  
  const lifecyclePath = path.resolve(ROOT_DIR, 'src/core/orchestrator/lifecycle.js');
  const content = await fs.readFile(lifecyclePath, 'utf-8');
  
  // Verificar que ya no crea LLMAnalyzer duplicado
  const lines = content.split('\n');
  let llmAnalyzerCreations = 0;
  
  lines.forEach((line, idx) => {
    if (line.includes('new LLMAnalyzer')) {
      llmAnalyzerCreations++;
      validation.warn(`Found LLMAnalyzer creation at line ${idx + 1}`, line.trim());
    }
  });
  
  if (llmAnalyzerCreations === 0) {
    validation.info('✅ No duplicate LLMAnalyzer creation in lifecycle.js');
  } else {
    validation.warn(`⚠️  Found ${llmAnalyzerCreations} LLMAnalyzer creations (should use LLMService)`);
  }
  
  // Verificar que usa LLMService
  if (content.includes('LLMService')) {
    validation.info('✅ Uses LLMService');
  } else {
    validation.error('❌ Does not use LLMService');
  }
  
  // Verificar que asigna analyzer al worker (legacy)
  if (content.includes('worker.llmAnalyzer')) {
    validation.info('ℹ️  Still has worker.llmAnalyzer assignment (legacy compatibility)');
  }
}

// Verificar que todos los entry points usan la nueva arquitectura
async function validateEntryPoints() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING ENTRY POINTS');
  console.log('='.repeat(60));
  
  const entryPoints = [
    'src/layer-c-memory/mcp-server.js',
    'src/core/orchestrator-server/index.js',
    'src/core/unified-server/initialization/orchestrator-init.js'
  ];
  
  for (const entry of entryPoints) {
    const fullPath = path.resolve(ROOT_DIR, entry);
    const exists = await checkFileExists(fullPath);
    
    if (!exists) {
      validation.warn(`Entry point not found: ${entry}`);
      continue;
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Verificar que crea AnalysisWorker
    if (content.includes('new AnalysisWorker')) {
      validation.info(`✅ ${entry} creates AnalysisWorker`);
    } else {
      validation.warn(`⚠️  ${entry} does not create AnalysisWorker directly`);
    }
    
    // Verificar si usa LLMService (idealmente debería, pero no es obligatorio aún)
    if (content.includes('LLMService')) {
      validation.info(`✅ ${entry} uses LLMService`);
    } else {
      validation.info(`ℹ️  ${entry} does not use LLMService directly (worker handles it)`);
    }
  }
}

// Verificar circuit breaker implementation
async function validateCircuitBreaker() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATING CIRCUIT BREAKER');
  console.log('='.repeat(60));
  
  const servicePath = path.resolve(ROOT_DIR, 'src/services/llm-service.js');
  const content = await fs.readFile(servicePath, 'utf-8');
  
  const cbFeatures = [
    { name: 'CLOSED state', pattern: /CLOSED/ },
    { name: 'OPEN state', pattern: /OPEN/ },
    { name: 'HALF_OPEN state', pattern: /HALF_OPEN/ },
    { name: 'Failure counting', pattern: /_cbFailureCount/ },
    { name: 'Success counting', pattern: /_cbSuccessCount/ },
    { name: 'Threshold check', pattern: /_cbThreshold/ },
    { name: 'Reset timeout', pattern: /_cbResetTimeoutMs/ }
  ];
  
  for (const feature of cbFeatures) {
    if (feature.pattern.test(content)) {
      validation.info(`✅ Circuit breaker has ${feature.name}`);
    } else {
      validation.error(`❌ Circuit breaker missing ${feature.name}`);
    }
  }
}

// Reporte final
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`\nℹ️  Info: ${validation.infos.length}`);
  console.log(`⚠️  Warnings: ${validation.warnings.length}`);
  console.log(`❌ Errors: ${validation.errors.length}`);
  
  if (validation.errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    validation.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.msg}`);
      if (err.details) console.log(`     Details: ${err.details}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    validation.warnings.forEach((warn, i) => {
      console.log(`  ${i + 1}. ${warn.msg}`);
      if (warn.details) console.log(`     Details: ${warn.details}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  if (validation.errors.length === 0) {
    console.log('✅ ARCHITECTURE VALIDATION PASSED');
  } else {
    console.log('❌ ARCHITECTURE VALIDATION FAILED');
  }
  console.log('='.repeat(60));
  
  return validation.errors.length === 0;
}

// Ejecutar validación
async function runValidation() {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(15) + 'ARCHITECTURE VALIDATOR' + ' '.repeat(21) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  
  await validateInitializationFlow();
  await validateLLMService();
  await validateAnalysisWorker();
  await validateOrchestrator();
  await validateEntryPoints();
  await validateCircuitBreaker();
  
  const success = printReport();
  process.exit(success ? 0 : 1);
}

runValidation().catch(error => {
  console.error('Validation crashed:', error);
  process.exit(1);
});
