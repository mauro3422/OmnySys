/**
 * @fileoverview audit-deep-diagnosis.js
 * 
 * Diagnóstico profundo de problemas de extracción y decisión LLM.
 * 
 * Uso: node scripts/audit-deep-diagnosis.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Lee archivo de storage
 */
async function readStorageFile(filePath) {
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const fullPath = path.join(filesDir, filePath.replace(/\\/g, '/') + '.json');
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Lee archivo fuente
 */
async function readSourceFile(filePath) {
  const fullPath = path.join(ROOT_PATH, filePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (e) {
    return null;
  }
}

/**
 * Diagnóstico 1: Por qué Variables = 0?
 */
async function diagnoseVariableExtraction() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 DIAGNÓSTICO 1: ¿Por qué Variables = 0?');
  console.log('═'.repeat(70));
  
  // Buscar definiciones con tipos varios
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const typeCounts = {};
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const definitions = data.definitions || [];
            
            for (const def of definitions) {
              const type = def.type || 'unknown';
              if (!typeCounts[type]) typeCounts[type] = 0;
              typeCounts[type]++;
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  
  console.log('\n   📊 Tipos de definición encontrados:');
  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sorted) {
    console.log(`      ${type}: ${count}`);
  }
  
  // Buscar una variable exportada y ver qué tipo tiene
  console.log('\n   📄 Ejemplo de definición con tipo "variable":');
  
  // Buscar un archivo con exports de variables
  const testFile = await readStorageFile('src/utils/logger.js');
  if (testFile?.definitions) {
    console.log('   Archivo: src/utils/logger.js');
    for (const def of testFile.definitions) {
      console.log(`      - type="${def.type}", name="${def.name}"`);
    }
  }
}

/**
 * Diagnóstico 2: Archivos aislados
 */
async function diagnoseIsolatedFiles() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 DIAGNÓSTICO 2: Archivos "aislados"');
  console.log('═'.repeat(70));
  
  const isolatedFiles = [
    'src/core/atomic-editor/singleton/editor-singleton.js',
    'src/config/index.js',
    'src/core/atomic-editor/execution/index.js'
  ];
  
  for (const filePath of isolatedFiles) {
    console.log(`\n   📄 ${filePath}`);
    
    const storage = await readStorageFile(filePath);
    const source = await readSourceFile(filePath);
    
    if (!storage) {
      console.log('      ❌ No encontrado en storage');
      continue;
    }
    
    console.log(`      Storage: imports=${storage.imports?.length || 0}, usedBy=${storage.usedBy?.length || 0}`);
    console.log(`      definitions=${storage.definitions?.length || 0}, exports=${storage.exports?.length || 0}`);
    
    if (source) {
      // Buscar imports reales en el código
      const importMatches = source.match(/import\s+.*from\s+['"][^'"]+['"]/g) || [];
      const requireMatches = source.match(/require\s*\(\s*['"][^'"]+['"]\s*\)/g) || [];
      const totalImports = importMatches.length + requireMatches.length;
      
      // Buscar exports
      const exportMatches = source.match(/export\s+/g) || [];
      
      console.log(`      Source real: ${totalImports} imports, ${exportMatches.length} exports`);
      
      // Mostrar primeros imports del source
      if (totalImports > 0 && (!storage.imports || storage.imports.length === 0)) {
        console.log('      ⚠️  PROBLEMA: Source tiene imports pero storage dice 0');
        console.log('      Imports en source:');
        importMatches.slice(0, 3).forEach(m => console.log(`         ${m}`));
      }
      
      // Mostrar exports del source
      if (exportMatches.length > 0 && (!storage.exports || storage.exports.length === 0)) {
        console.log('      ⚠️  PROBLEMA: Source tiene exports pero storage dice 0');
      }
    }
    
    // Mostrar definiciones
    if (storage.definitions && storage.definitions.length > 0) {
      console.log(`      Definitions:`);
      storage.definitions.slice(0, 5).forEach(d => {
        console.log(`         - ${d.type}: ${d.name}`);
      });
    }
  }
}

/**
 * Diagnóstico 3: Archivos que "necesitan LLM"
 */
async function diagnoseLLMNeeds() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 DIAGNÓSTICO 3: Archivos que "necesitan LLM"');
  console.log('═'.repeat(70));
  
  // Importar analysis-decider
  const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
    '../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
  );
  
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const needsLLMFiles = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const filePath = data.path || data.filePath;
            
            if (!filePath) continue;
            
            // Calcular si necesita LLM
            const semanticAnalysis = data.semanticAnalysis || {};
            const needsLLM = needsLLMAnalysis(semanticAnalysis, data);
            
            if (needsLLM) {
              const { score, gaps } = computeMetadataCompleteness(data);
              needsLLMFiles.push({
                filePath,
                score,
                gaps,
                definitions: data.definitions?.length || 0,
                exports: data.exports?.length || 0,
                imports: data.imports?.length || 0,
                usedBy: data.usedBy?.length || 0,
                hasDynamicCode: semanticAnalysis.hasDynamicImports || semanticAnalysis.hasEval,
                semanticConnections: data.semanticConnections?.length || 0
              });
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  
  console.log(`\n   📊 Total archivos que necesitan LLM: ${needsLLMFiles.length}`);
  
  // Clasificar por razón
  const withDynamicCode = needsLLMFiles.filter(f => f.hasDynamicCode);
  const withLowScore = needsLLMFiles.filter(f => f.score < 0.5 && !f.hasDynamicCode);
  const withGaps = needsLLMFiles.filter(f => f.gaps.length > 0 && !f.hasDynamicCode && f.score >= 0.5);
  
  console.log(`\n   📈 Por razón:`);
  console.log(`      Dynamic code (necesita LLM):     ${withDynamicCode.length}`);
  console.log(`      Score bajo (<0.5):               ${withLowScore.length}`);
  console.log(`      Gaps significativos:             ${withGaps.length}`);
  
  // Mostrar ejemplos de cada categoría
  if (withDynamicCode.length > 0) {
    console.log('\n   📄 Ejemplos con dynamic code:');
    withDynamicCode.slice(0, 5).forEach(f => {
      console.log(`      - ${f.filePath}`);
    });
  }
  
  if (withLowScore.length > 0) {
    console.log('\n   📄 Ejemplos con score bajo (revisar):');
    withLowScore.slice(0, 10).forEach(f => {
      console.log(`      - ${f.filePath}`);
      console.log(`        score=${f.score.toFixed(2)}, gaps=${f.gaps.join(',')}, defs=${f.definitions}`);
    });
  }
  
  // Análisis: ¿Podemos deducir más?
  console.log('\n   💡 Análisis de oportunidad de mejora:');
  
  const hasDefinitionButNeedsLLM = needsLLMFiles.filter(f => f.definitions > 0);
  const hasExportsButNeedsLLM = needsLLMFiles.filter(f => f.exports > 0);
  const hasUsedByButNeedsLLM = needsLLMFiles.filter(f => f.usedBy > 0);
  
  console.log(`\n      Con definitions pero needsLLM:   ${hasDefinitionButNeedsLLM.length}`);
  console.log(`      Con exports pero needsLLM:       ${hasExportsButNeedsLLM.length}`);
  console.log(`      Con usedBy pero needsLLM:        ${hasUsedByButNeedsLLM.length}`);
  
  // Los que tienen todo pero igual necesitan LLM
  const richButNeedsLLM = needsLLMFiles.filter(f => 
    f.definitions > 0 && f.exports > 0 && f.usedBy > 0 && !f.hasDynamicCode
  );
  
  if (richButNeedsLLM.length > 0) {
    console.log(`\n   ⚠️  Archivos "ricos" que igual necesitan LLM:`);
    richButNeedsLLM.slice(0, 5).forEach(f => {
      console.log(`      - ${f.filePath}`);
      console.log(`        defs=${f.definitions}, exports=${f.exports}, usedBy=${f.usedBy}`);
      console.log(`        gaps=${f.gaps.join(',')}, score=${f.score.toFixed(2)}`);
    });
  }
}

/**
 * Main
 */
async function main() {
  console.log('\n🔬 OmnySys Deep Diagnosis');
  console.log('═'.repeat(70));
  
  await diagnoseVariableExtraction();
  await diagnoseIsolatedFiles();
  await diagnoseLLMNeeds();
  
  console.log('\n');
}

main().catch(console.error);