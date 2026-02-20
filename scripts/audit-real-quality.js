/**
 * @fileoverview audit-real-quality.js
 * 
 * Audita la calidad REAL de los datos extraídos.
 * No busca 'atoms' (que no existe en storage), sino 'definitions'.
 * 
 * Uso: node scripts/audit-real-quality.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Lee todos los archivos de storage recursivamente
 */
async function readAllStorageFiles() {
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const files = [];
  
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
            if (filePath) {
              files.push({ filePath, data });
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  return files;
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 OmnySys REAL Data Quality Audit');
  console.log('═'.repeat(70));
  
  const files = await readAllStorageFiles();
  console.log(`\n📁 Total archivos en storage: ${files.length}`);
  
  // Estadísticas REALES
  const stats = {
    total: files.length,
    withDefinitions: 0,
    withExports: 0,
    withImports: 0,
    withUsedBy: 0,
    withSemanticConnections: 0,
    withSemanticAnalysis: 0,
    withRiskScore: 0,
    withCalledBy: 0,
    withCalls: 0,
    
    totalDefinitions: 0,
    totalExports: 0,
    totalImports: 0,
    totalUsedBy: 0,
    totalSemanticConnections: 0,
    
    // Por tipo de definición
    classDefs: 0,
    functionDefs: 0,
    methodDefs: 0,
    variableDefs: 0,
    
    // Por tipo de archivo
    srcFiles: 0,
    testFiles: 0,
    configFiles: 0,
    scriptFiles: 0,
    otherFiles: 0
  };
  
  // Archivos problemáticos
  const noDefinitions = [];
  const noExports = [];
  const noImports = [];
  const isolatedFiles = []; // Sin imports NI usedBy
  
  for (const { filePath, data } of files) {
    // Conteos básicos
    const definitions = data.definitions || [];
    const exports = data.exports || [];
    const imports = data.imports || [];
    const usedBy = data.usedBy || [];
    const semanticConnections = data.semanticConnections || [];
    const semanticAnalysis = data.semanticAnalysis || {};
    const riskScore = data.riskScore;
    
    if (definitions.length > 0) {
      stats.withDefinitions++;
      stats.totalDefinitions += definitions.length;
      
      // Clasificar definiciones
      for (const def of definitions) {
        if (def.type === 'class') stats.classDefs++;
        else if (def.type === 'function') stats.functionDefs++;
        else if (def.type === 'method') stats.methodDefs++;
        else if (def.type === 'variable' || def.type === 'const') stats.variableDefs++;
      }
    } else {
      noDefinitions.push(filePath);
    }
    
    if (exports.length > 0) {
      stats.withExports++;
      stats.totalExports += exports.length;
    } else {
      noExports.push(filePath);
    }
    
    if (imports.length > 0) {
      stats.withImports++;
      stats.totalImports += imports.length;
    } else {
      noImports.push(filePath);
    }
    
    if (usedBy.length > 0) {
      stats.withUsedBy++;
      stats.totalUsedBy += usedBy.length;
    }
    
    if (semanticConnections.length > 0) {
      stats.withSemanticConnections++;
      stats.totalSemanticConnections += semanticConnections.length;
    }
    
    if (semanticAnalysis && Object.keys(semanticAnalysis).length > 0) {
      stats.withSemanticAnalysis++;
    }
    
    if (riskScore) {
      stats.withRiskScore++;
    }
    
    // calledBy y calls
    const calls = data.calls || [];
    const calledBy = data.calledBy || [];
    if (calledBy.length > 0) stats.withCalledBy++;
    if (calls.length > 0) stats.withCalls++;
    
    // Archivos aislados
    if (imports.length === 0 && usedBy.length === 0) {
      isolatedFiles.push(filePath);
    }
    
    // Clasificar por tipo
    if (filePath.startsWith('src/')) stats.srcFiles++;
    else if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.startsWith('tests/')) stats.testFiles++;
    else if (filePath.includes('config')) stats.configFiles++;
    else if (filePath.startsWith('scripts/')) stats.scriptFiles++;
    else stats.otherFiles++;
  }
  
  // Reporte
  console.log('\n' + '═'.repeat(70));
  console.log('📊 COBERTURA DE DATOS:');
  console.log('═'.repeat(70));
  
  const pct = (n) => ((n / stats.total) * 100).toFixed(1);
  
  console.log(`\n   Con definitions:      ${stats.withDefinitions} (${pct(stats.withDefinitions)}%)`);
  console.log(`   Con exports:          ${stats.withExports} (${pct(stats.withExports)}%)`);
  console.log(`   Con imports:          ${stats.withImports} (${pct(stats.withImports)}%)`);
  console.log(`   Con usedBy:           ${stats.withUsedBy} (${pct(stats.withUsedBy)}%)`);
  console.log(`   Con semanticConn:     ${stats.withSemanticConnections} (${pct(stats.withSemanticConnections)}%)`);
  console.log(`   Con semanticAnalysis: ${stats.withSemanticAnalysis} (${pct(stats.withSemanticAnalysis)}%)`);
  console.log(`   Con riskScore:        ${stats.withRiskScore} (${pct(stats.withRiskScore)}%)`);
  console.log(`   Con calledBy:         ${stats.withCalledBy} (${pct(stats.withCalledBy)}%)`);
  console.log(`   Con calls:            ${stats.withCalls} (${pct(stats.withCalls)}%)`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 VOLÚMENES:');
  console.log('─'.repeat(70));
  
  console.log(`\n   Total definitions:    ${stats.totalDefinitions}`);
  console.log(`   Total exports:        ${stats.totalExports}`);
  console.log(`   Total imports:        ${stats.totalImports}`);
  console.log(`   Total usedBy:         ${stats.totalUsedBy}`);
  console.log(`   Total semanticConn:   ${stats.totalSemanticConnections}`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 POR TIPO DE DEFINICIÓN:');
  console.log('─'.repeat(70));
  
  console.log(`\n   Clases:      ${stats.classDefs}`);
  console.log(`   Funciones:   ${stats.functionDefs}`);
  console.log(`   Métodos:     ${stats.methodDefs}`);
  console.log(`   Variables:   ${stats.variableDefs}`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 POR TIPO DE ARCHIVO:');
  console.log('─'.repeat(70));
  
  console.log(`\n   src/      : ${stats.srcFiles}`);
  console.log(`   tests/    : ${stats.testFiles}`);
  console.log(`   config    : ${stats.configFiles}`);
  console.log(`   scripts/  : ${stats.scriptFiles}`);
  console.log(`   other     : ${stats.otherFiles}`);
  
  // Análisis de problemas
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  ANÁLISIS DE PROBLEMAS:');
  console.log('═'.repeat(70));
  
  // Archivos sin definitions clasificados
  const noDefSrc = noDefinitions.filter(f => f.startsWith('src/') && !f.includes('.test.') && !f.includes('.spec.'));
  const noDefTest = noDefinitions.filter(f => f.includes('.test.') || f.includes('.spec.') || f.startsWith('tests/'));
  const noDefOther = noDefinitions.filter(f => !f.startsWith('src/') && !f.includes('.test.') && !f.startsWith('tests/'));
  
  console.log(`\n   📁 Archivos sin definitions: ${noDefinitions.length}`);
  console.log(`      - src/ (código fuente):  ${noDefSrc.length}`);
  console.log(`      - tests/ (tests):        ${noDefTest.length} (esperado)`);
  console.log(`      - other (config, etc):   ${noDefOther.length}`);
  
  // Mostrar archivos src/ sin definitions
  if (noDefSrc.length > 0 && noDefSrc.length <= 20) {
    console.log('\n   📄 Archivos src/ sin definitions:');
    noDefSrc.forEach(f => console.log(`      - ${f}`));
  } else if (noDefSrc.length > 20) {
    console.log(`\n   📄 Primeros 20 archivos src/ sin definitions:`);
    noDefSrc.slice(0, 20).forEach(f => console.log(`      - ${f}`));
    console.log(`      ... y ${noDefSrc.length - 20} más`);
  }
  
  // Archivos aislados
  console.log(`\n   📁 Archivos aislados (sin imports NI usedBy): ${isolatedFiles.length}`);
  if (isolatedFiles.length <= 10) {
    isolatedFiles.forEach(f => console.log(`      - ${f}`));
  } else {
    isolatedFiles.slice(0, 10).forEach(f => console.log(`      - ${f}`));
    console.log(`      ... y ${isolatedFiles.length - 10} más`);
  }
  
  // Calcular "health score"
  const definitionScore = stats.withDefinitions / stats.total;
  const connectionScore = (stats.withImports + stats.withUsedBy) / (stats.total * 2);
  const semanticScore = stats.withSemanticConnections / stats.total;
  
  const healthScore = ((definitionScore * 0.5) + (connectionScore * 0.3) + (semanticScore * 0.2)) * 100;
  
  console.log('\n' + '═'.repeat(70));
  console.log('🏥 HEALTH SCORE:');
  console.log('═'.repeat(70));
  
  console.log(`\n   Definition coverage: ${(definitionScore * 100).toFixed(1)}%`);
  console.log(`   Connection coverage: ${(connectionScore * 100).toFixed(1)}%`);
  console.log(`   Semantic coverage:   ${(semanticScore * 100).toFixed(1)}%`);
  console.log(`\n   ⭐ HEALTH SCORE: ${healthScore.toFixed(1)}/100`);
  
  if (healthScore >= 70) {
    console.log('   ✅ EXCELENTE: Datos de alta calidad');
  } else if (healthScore >= 50) {
    console.log('   ⚠️  REGULAR: Calidad media, revisar gaps');
  } else {
    console.log('   ❌ BAJO: Problemas de extracción detectados');
  }
  
  // Recomendaciones
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMENDACIONES:');
  console.log('═'.repeat(70));
  
  if (noDefSrc.length > 0) {
    console.log(`\n   ⚠️  ${noDefSrc.length} archivos src/ sin definitions.`);
    console.log('      Posibles causas:');
    console.log('      1. Archivos vacíos o solo re-exports');
    console.log('      2. Parser fallando en sintaxis específica');
    console.log('      3. Archivos con solo constantes/types');
    console.log('\n      Verificar manualmente algunos de estos archivos.');
  }
  
  if (isolatedFiles.length > stats.total * 0.1) {
    console.log(`\n   ⚠️  ${isolatedFiles.length} archivos aislados (más del 10%).`);
    console.log('      Estos archivos no tienen conexiones detectadas.');
    console.log('      Podrían ser entry points, o archivos no utilizados.');
  }
  
  console.log('\n');
  
  return stats;
}

