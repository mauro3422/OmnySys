#!/usr/bin/env node
/**
 * @fileoverview Auto-Generator de Tests Meta-Factory
 * 
 * Genera automáticamente archivos de test basados en el patrón Meta-Factory.
 * Analiza el código fuente y crea tests con contratos automáticos.
 * 
 * Uso:
 *   node scripts/generate-meta-test.js <ruta-al-modulo>
 *   node scripts/generate-meta-test.js src/layer-a-static/analyses/tier2/coupling.js
 * 
 * @module scripts/generate-meta-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Analiza el código fuente y extrae información relevante
 */
function analyzeSource(sourcePath) {
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const lines = content.split('\n');
  
  // Detectar exports
  const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)|export\s+\{\s*([^}]+)\s*\}|export\s+(?:default\s+)?class\s+(\w+)/g;
  const exports = [];
  let match;
  
  while ((match = exportRegex.exec(content)) !== null) {
    const exportName = match[1] || match[2] || match[3];
    if (exportName) {
      // Limpiar nombres de exports múltiples
      const names = exportName.split(',').map(n => n.trim().split(' ')[0]);
      exports.push(...names);
    }
  }
  
  // Detectar si es async
  const isAsync = content.includes('async function') || 
                  content.includes('export async function');
  
  // Detectar tipo de módulo
  let moduleType = 'utility';
  if (sourcePath.includes('/analyses/')) {
    moduleType = 'analysis';
  } else if (sourcePath.includes('/detectors/')) {
    moduleType = 'detector';
  } else if (sourcePath.includes('/extractors/')) {
    moduleType = 'extractor';
  }
  
  // Detectar retorno (aproximado)
  const returnRegex = /return\s+\{([^}]+)\}/g;
  const returnFields = [];
  while ((match = returnRegex.exec(content)) !== null) {
    const fields = match[1].split(',').map(f => f.trim().split(':')[0].trim());
    returnFields.push(...fields);
  }
  
  // Detectar descripción del módulo (JSDoc)
  const jsdocRegex = /\/\*\*[\s\S]*?\*\//;
  const jsdocMatch = content.match(jsdocRegex);
  const description = jsdocMatch ? extractDescription(jsdocMatch[0]) : '';
  
  return {
    exports: [...new Set(exports)],
    isAsync,
    moduleType,
    returnFields: [...new Set(returnFields)],
    description,
    fileName: path.basename(sourcePath, '.js')
  };
}

function extractDescription(jsdoc) {
  const lines = jsdoc.split('\n');
  const descLines = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\s*\/?\*\*?\s?/, '').trim();
    if (cleaned && !cleaned.startsWith('@')) {
      descLines.push(cleaned);
    }
  }
  return descLines.join(' ');
}

/**
 * Genera el contenido del archivo de test
 */
function generateTestContent(analysis, sourcePath) {
  const { exports, isAsync, moduleType, returnFields, description, fileName } = analysis;
  
  // Determinar el import path (relativo a src/layer-a-static)
  const relativePath = sourcePath.replace(/.*src\//, '#');
  const modulePath = relativePath.replace('.js', '');
  
  // Determinar el tipo de suite
  let suiteType, suiteImport, suiteConfig;
  
  if (moduleType === 'analysis' && exports.length > 0) {
    const mainFn = exports[0];
    suiteType = 'createAnalysisTestSuite';
    suiteImport = 'createAnalysisTestSuite';
    
    // Inferir campos esperados del retorno
    const expectedFields = {};
    if (returnFields.length > 0) {
      returnFields.forEach(field => {
        expectedFields[field] = inferType(field);
      });
    } else {
      // Defaults para análisis
      expectedFields.total = 'number';
    }
    
    suiteConfig = {
      module: modulePath.replace('#layer-a-static/', '').replace('#', ''),
      exports: `{ ${exports.join(', ')} }`,
      analyzeFn: mainFn,
      expectedFields: JSON.stringify(expectedFields, null, 2).replace(/"/g, "'")
    };
  } else if (moduleType === 'detector') {
    suiteType = 'createDetectorTestSuite';
    suiteImport = 'createDetectorTestSuite';
    suiteConfig = {
      module: modulePath.replace('#layer-a-static/', '').replace('#', ''),
      detectorClass: exports[0] || 'Detector'
    };
  } else {
    suiteType = 'createUtilityTestSuite';
    suiteImport = 'createUtilityTestSuite';
    suiteConfig = {
      module: modulePath.replace('#layer-a-static/', '').replace('#', ''),
      exports: exports.length > 0 ? `{ ${exports.join(', ')} }` : '{}',
      fn: exports[0] || 'mainFunction'
    };
  }
  
  // Generar tests específicos placeholder
  const specificTests = generateSpecificTests(moduleType, exports);
  
  return `/**
 * @fileoverview Tests for ${fileName}.js - Auto-generated Meta-Factory Pattern
 * ${description ? `* ${description}` : '*'}
 */

import { describe } from 'vitest';
import { ${suiteImport} } from '#test-factories/test-suite-generator';
${exports.length > 0 ? `import { ${exports.join(', ')} } from '${modulePath}.js';` : ''}

// Auto-generated test suite
const suite = ${suiteType}({
  module: '${suiteConfig.module}',
  ${suiteConfig.exports ? `exports: ${suiteConfig.exports},` : ''}
  ${suiteConfig.analyzeFn ? `analyzeFn: ${suiteConfig.analyzeFn},` : ''}
  ${suiteConfig.expectedFields ? `expectedFields: ${suiteConfig.expectedFields},` : ''}
  ${suiteConfig.detectorClass ? `detectorClass: ${suiteConfig.detectorClass},` : ''}
  ${suiteConfig.fn ? `fn: ${suiteConfig.fn},` : ''}
  specificTests: [
${specificTests}
  ]
});

// Run the suite
describe('${suiteConfig.module}', suite);
`;
}

function inferType(fieldName) {
  const typeHints = {
    total: 'number',
    count: 'number',
    length: 'number',
    items: 'array',
    results: 'array',
    data: 'array',
    list: 'array',
    files: 'array',
    functions: 'array',
    chains: 'array',
    cycles: 'array',
    couplings: 'array',
    byFile: 'object',
    metadata: 'object',
    config: 'object',
    options: 'object',
    recommendation: 'string',
    message: 'string',
    name: 'string',
    path: 'string',
    valid: 'boolean',
    hasError: 'boolean',
    isAsync: 'boolean'
  };
  
  return typeHints[fieldName] || 'any';
}

function generateSpecificTests(moduleType, exports) {
  const tests = [];
  
  if (moduleType === 'analysis') {
    tests.push(`    {
      name: 'should handle empty input gracefully',
      test: async (fn) => {
        const result = await fn({});
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      }
    }`);
  } else if (moduleType === 'detector') {
    tests.push(`    {
      name: 'should detect issues in valid input',
      test: async (detector) => {
        const result = await detector.detect({});
        expect(Array.isArray(result)).toBe(true);
      }
    }`);
  } else {
    tests.push(`    {
      name: 'should handle basic case',
      test: () => {
        // Add your specific test here
        expect(true).toBe(true);
      }
    }`);
  }
  
  tests.push(`    {
      name: 'should handle edge cases',
      test: () => {
        // Add edge case tests here
        expect(true).toBe(true);
      }
    }`);
  
  return tests.join(',\n');
}

/**
 * Calcula la ruta de salida del test
 */
function getTestOutputPath(sourcePath) {
  const relativePath = sourcePath.replace(/.*src\/layer-a-static\//, '');
  const testPath = path.join(
    'tests/unit/layer-a-analysis',
    relativePath.replace('.js', '.test.js')
  );
  return testPath;
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage: node scripts/generate-meta-test.js <path-to-module>', 'yellow');
    log('Example: node scripts/generate-meta-test.js src/layer-a-static/analyses/tier2/coupling.js', 'cyan');
    process.exit(1);
  }
  
  const sourcePath = args[0];
  
  if (!fs.existsSync(sourcePath)) {
    log(`Error: File not found: ${sourcePath}`, 'red');
    process.exit(1);
  }
  
  log(`\n🔍 Analyzing: ${sourcePath}`, 'blue');
  
  const analysis = analyzeSource(sourcePath);
  log(`\n📊 Detected:`, 'cyan');
  log(`   Module Type: ${analysis.moduleType}`, 'cyan');
  log(`   Exports: ${analysis.exports.join(', ') || 'none'}`, 'cyan');
  log(`   Async: ${analysis.isAsync}`, 'cyan');
  log(`   Return Fields: ${analysis.returnFields.join(', ') || 'unknown'}`, 'cyan');
  
  const testContent = generateTestContent(analysis, sourcePath);
  const testPath = getTestOutputPath(sourcePath);
  
  // Asegurar que el directorio existe
  const testDir = path.dirname(testPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    log(`\n📁 Created directory: ${testDir}`, 'green');
  }
  
  // Verificar si ya existe
  if (fs.existsSync(testPath)) {
    log(`\n⚠️  Warning: Test already exists at ${testPath}`, 'yellow');
    log(`   Use --force to overwrite`, 'yellow');
    
    if (!args.includes('--force')) {
      log(`\n📝 Generated content (not saved):\n`, 'cyan');
      console.log(testContent);
      process.exit(0);
    }
  }
  
  // Guardar el archivo
  fs.writeFileSync(testPath, testContent, 'utf-8');
  
  log(`\n✅ Test generated: ${testPath}`, 'green');
  log(`\n📋 Next steps:`, 'cyan');
  log(`   1. Review the generated test`, 'cyan');
  log(`   2. Add specific tests for your use cases`, 'cyan');
  log(`   3. Run: npm test -- ${testPath}`, 'cyan');
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
