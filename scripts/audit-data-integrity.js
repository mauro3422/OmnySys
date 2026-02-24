/**
 * @fileoverview audit-data-integrity.js
 * 
 * Audita la integridad de los datos extraídos por el indexer.
 * Detecta problemas de extracción y datos faltantes.
 * 
 * Uso: node scripts/audit-data-integrity.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanJsonFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Lee todos los archivos de storage recursivamente
 */
async function readAllStorageFiles() {
  const jsonFiles = await scanJsonFiles(ROOT_PATH, '.omnysysdata/files');
  const files = new Map();
  
  for (const fullPath of jsonFiles) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      const filePath = data.path || data.filePath;
      if (filePath) {
        files.set(filePath, {
          fullPath,
          data,
          size: content.length
        });
      }
    } catch (e) {
      console.error(`Error leyendo ${fullPath}: ${e.message}`);
    }
  }
  
  return files;
}

/**
 * Verifica la integridad de un archivo de storage
 */
function analyzeFileIntegrity(filePath, fileData) {
  const issues = [];
  const warnings = [];
  const data = fileData.data;
  
  // 1. Verificar campos mínimos esperados
  const requiredFields = ['path', 'exports', 'imports', 'definitions'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      issues.push(`missing-field:${field}`);
    }
  }
  
  // 2. Verificar si tiene definiciones pero no exports
  const definitions = data.definitions || [];
  const exports = data.exports || [];
  if (definitions.length > 0 && exports.length === 0) {
    warnings.push('has-definitions-no-exports');
  }
  
  // 3. Verificar estructura de definiciones
  let invalidDefinitions = 0;
  for (const def of definitions) {
    if (!def.type || !def.name) {
      invalidDefinitions++;
    }
  }
  if (invalidDefinitions > 0) {
    issues.push(`invalid-definitions:${invalidDefinitions}`);
  }
  
  // 4. Verificar si tiene imports pero no dependencias
  const imports = data.imports || [];
  const dependsOn = data.dependsOn || [];
  if (imports.length > 0 && dependsOn.length === 0) {
    // Esto puede ser normal si todos los imports son de node_modules
    // Solo warning
  }
  
  // 5. Verificar usedBy vs transitiveDependents
  const usedBy = data.usedBy || [];
  const transitiveDependents = data.transitiveDependents || [];
  // usedBy debería ser subset de transitiveDependents
  
  // 6. Verificar si tiene semanticAnalysis
  const semanticAnalysis = data.semanticAnalysis || {};
  const hasSemanticData = 
    (semanticAnalysis.events?.all?.length > 0) ||
    (semanticAnalysis.localStorage?.all?.length > 0) ||
    (semanticAnalysis.globals?.all?.length > 0) ||
    (semanticAnalysis.envVars?.length > 0);
  
  // 7. Verificar riskScore
  const riskScore = data.riskScore;
  if (riskScore && riskScore.total > 0) {
    // Tiene riesgo calculado
  }
  
  // 8. Calcular completitud
  let completeness = 0;
  if (data.exports?.length > 0) completeness += 20;
  if (data.imports?.length > 0) completeness += 20;
  if (data.definitions?.length > 0) completeness += 20;
  if (data.usedBy?.length > 0) completeness += 15;
  if (data.dependsOn?.length > 0) completeness += 10;
  if (hasSemanticData) completeness += 10;
  if (riskScore) completeness += 5;
  
  return {
    filePath,
    completeness,
    definitions: definitions.length,
    exports: exports.length,
    imports: imports.length,
    usedBy: usedBy?.length || 0,
    dependsOn: dependsOn?.length || 0,
    semanticConnections: data.semanticConnections?.length || 0,
    hasSemanticData,
    hasRiskScore: !!riskScore,
    issues,
    warnings,
    size: fileData.size
  };
}

/**
 * Analiza el contenido de un archivo JS real para comparar
 */
async function analyzeSourceFile(filePath) {
  const fullPath = path.join(ROOT_PATH, filePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Conteos básicos
    const lines = content.split('\n').length;
    const functionCount = (content.match(/function\s+\w+|=>\s*{|async\s+\w+\s*\(/g) || []).length;
    const classCount = (content.match(/class\s+\w+/g) || []).length;
    const exportCount = (content.match(/export\s+(default\s+)?|export\s*{|\bexport\s+function|\bexport\s+class|\bexport\s+const/g) || []).length;
    const importCount = (content.match(/import\s+.*from|require\s*\(/g) || []).length;
    
    return {
      exists: true,
      lines,
      functionCount,
      classCount,
      exportCount,
      importCount,
      size: content.length
    };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 OmnySys Data Integrity Audit');
  console.log('═'.repeat(70));
  
  // Leer archivos de storage
  console.log('\n📁 Leyendo archivos de storage...');
  const storageFiles = await readAllStorageFiles();
  console.log(`   ${storageFiles.size} archivos encontrados`);
  
  // Analizar integridad
  console.log('\n⏳ Analizando integridad...');
  const results = [];
  const issuesByType = {};
  const warningsByType = {};
  
  for (const [filePath, fileData] of storageFiles) {
    const result = analyzeFileIntegrity(filePath, fileData);
    results.push(result);
    
    // Agregar issues
    for (const issue of result.issues) {
      if (!issuesByType[issue]) issuesByType[issue] = [];
      issuesByType[issue].push(filePath);
    }
    
    // Agregar warnings
    for (const warning of result.warnings) {
      if (!warningsByType[warning]) warningsByType[warning] = [];
      warningsByType[warning].push(filePath);
    }
  }
  
  // Reporte
  console.log('\n' + '═'.repeat(70));
  console.log('📊 REPORTE DE INTEGRIDAD');
  console.log('═'.repeat(70));
  
  // Distribución de completitud
  const highCompleteness = results.filter(r => r.completeness >= 70).length;
  const mediumCompleteness = results.filter(r => r.completeness >= 40 && r.completeness < 70).length;
  const lowCompleteness = results.filter(r => r.completeness < 40).length;
  
  console.log('\n📈 DISTRIBUCIÓN DE COMPLETITUD:');
  console.log(`   Alto (≥70%):     ${highCompleteness} (${((highCompleteness/results.length)*100).toFixed(1)}%)`);
  console.log(`   Medio (40-69%):  ${mediumCompleteness} (${((mediumCompleteness/results.length)*100).toFixed(1)}%)`);
  console.log(`   Bajo (<40%):     ${lowCompleteness} (${((lowCompleteness/results.length)*100).toFixed(1)}%)`);
  
  // Estadísticas de campos
  console.log('\n📊 CAMPOS PRESENTES:');
  const withDefinitions = results.filter(r => r.definitions > 0).length;
  const withExports = results.filter(r => r.exports > 0).length;
  const withImports = results.filter(r => r.imports > 0).length;
  const withUsedBy = results.filter(r => r.usedBy > 0).length;
  const withSemanticData = results.filter(r => r.hasSemanticData).length;
  const withRiskScore = results.filter(r => r.hasRiskScore).length;
  
  console.log(`   Con definitions:   ${withDefinitions} (${((withDefinitions/results.length)*100).toFixed(1)}%)`);
  console.log(`   Con exports:       ${withExports} (${((withExports/results.length)*100).toFixed(1)}%)`);
  console.log(`   Con imports:       ${withImports} (${((withImports/results.length)*100).toFixed(1)}%)`);
  console.log(`   Con usedBy:        ${withUsedBy} (${((withUsedBy/results.length)*100).toFixed(1)}%)`);
  console.log(`   Con semanticData:  ${withSemanticData} (${((withSemanticData/results.length)*100).toFixed(1)}%)`);
  console.log(`   Con riskScore:     ${withRiskScore} (${((withRiskScore/results.length)*100).toFixed(1)}%)`);
  
  // Issues encontrados
  if (Object.keys(issuesByType).length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('❌ ISSUES ENCONTRADOS:');
    console.log('═'.repeat(70));
    
    for (const [issue, files] of Object.entries(issuesByType).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n   ${issue}: ${files.length} archivos`);
      if (files.length <= 5) {
        files.forEach(f => console.log(`      - ${f}`));
      } else {
        files.slice(0, 5).forEach(f => console.log(`      - ${f}`));
        console.log(`      ... y ${files.length - 5} más`);
      }
    }
  }
  
  // Warnings
  if (Object.keys(warningsByType).length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('⚠️  WARNINGS:');
    console.log('─'.repeat(70));
    
    for (const [warning, files] of Object.entries(warningsByType).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n   ${warning}: ${files.length} archivos`);
      if (files.length <= 3) {
        files.forEach(f => console.log(`      - ${f}`));
      } else {
        files.slice(0, 3).forEach(f => console.log(`      - ${f}`));
        console.log(`      ... y ${files.length - 3} más`);
      }
    }
  }
  
  // Análisis de archivos con definitions = 0
  const noDefinitions = results.filter(r => r.definitions === 0);
  if (noDefinitions.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ANÁLISIS DE ARCHIVOS SIN DEFINITIONS:');
    console.log('═'.repeat(70));
    console.log(`\n   Total: ${noDefinitions.length} archivos`);
    
    // Clasificar por tipo
    const byType = {
      test: noDefinitions.filter(r => r.filePath.includes('.test.') || r.filePath.includes('.spec.') || r.filePath.includes('/tests/')),
      config: noDefinitions.filter(r => r.filePath.includes('config') || r.filePath.includes('.config.')),
      types: noDefinitions.filter(r => r.filePath.endsWith('.d.ts') || r.filePath.includes('/types/')),
      scripts: noDefinitions.filter(r => r.filePath.startsWith('scripts/')),
      archive: noDefinitions.filter(r => r.filePath.startsWith('archive/')),
      root: noDefinitions.filter(r => !r.filePath.includes('/')),
      other: []
    };
    
    byType.other = noDefinitions.filter(r => 
      !r.filePath.includes('.test.') && 
      !r.filePath.includes('.spec.') && 
      !r.filePath.includes('/tests/') &&
      !r.filePath.includes('config') &&
      !r.filePath.includes('.config.') &&
      !r.filePath.endsWith('.d.ts') &&
      !r.filePath.includes('/types/') &&
      !r.filePath.startsWith('scripts/') &&
      !r.filePath.startsWith('archive/') &&
      r.filePath.includes('/')
    );
    
    console.log('\n   📁 Clasificación:');
    console.log(`      tests/:     ${byType.test.length} (esperado - archivos de test)`);
    console.log(`      config:     ${byType.config.length} (esperado - configs)`);
    console.log(`      types:      ${byType.types.length} (esperado - type definitions)`);
    console.log(`      scripts/:   ${byType.scripts.length}`);
    console.log(`      archive/:   ${byType.archive.length} (esperado - archivos viejos)`);
    console.log(`      root:       ${byType.root.length}`);
    console.log(`      src/ other: ${byType.other.length} ⚠️ (revisar)`);
    
    // Mostrar archivos src/ sin definitions
    if (byType.other.length > 0) {
      console.log('\n   📄 Archivos src/ sin definitions (primeros 10):');
      
      // Analizar algunos de estos archivos
      for (const file of byType.other.slice(0, 10)) {
        const source = await analyzeSourceFile(file.filePath);
        if (source.exists) {
          console.log(`      - ${file.filePath}`);
          console.log(`        Source: ${source.lines} lines, ${source.functionCount} functions, ${source.classCount} classes`);
          console.log(`        Storage: exports=${file.exports}, imports=${file.imports}, usedBy=${file.usedBy}`);
          console.log(`        Issues: ${file.issues.join(', ') || 'none'}`);
        } else {
          console.log(`      - ${file.filePath} (FILE NOT FOUND)`);
        }
      }
    }
  }
  
  // Verificar archivos huérfanos (en storage pero no en disco)
  console.log('\n' + '═'.repeat(70));
  console.log('🔗 VERIFICACIÓN DE ORIGEN:');
  console.log('═'.repeat(70));
  
  let missingFiles = 0;
  const sampleToCheck = [...storageFiles.keys()].slice(0, 50); // Verificar muestra de 50
  
  for (const filePath of sampleToCheck) {
    const source = await analyzeSourceFile(filePath);
    if (!source.exists) {
      missingFiles++;
    }
  }
  
  if (missingFiles > 0) {
    console.log(`\n   ⚠️  ${missingFiles} archivos en storage no existen en disco (de ${sampleToCheck.length} verificados)`);
  } else {
    console.log(`\n   ✅ Todos los archivos verificados existen en disco (${sampleToCheck.length} revisados)`);
  }
  
  // Recomendaciones
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMENDACIONES:');
  console.log('═'.repeat(70));
  
  if (lowCompleteness > results.length * 0.3) {
    console.log('\n   ⚠️  Más del 30% de archivos tienen baja completitud.');
    console.log('      Posible problema en el extractor del indexer.');
  }
  
  if (byType?.other?.length > 50) {
    console.log('\n   ⚠️  Muchos archivos src/ sin definitions.');
    console.log('      Revisar si el parser está fallando en archivos específicos.');
    console.log('      Ejecutar: node src/layer-a-static/indexer.js . --verbose');
  }
  
  if (withExports < results.length * 0.5) {
    console.log('\n   ⚠️  Menos del 50% de archivos tienen exports detectados.');
    console.log('      El export-extractor puede estar fallando.');
  }
  
  console.log('\n');
  
  return {
    total: results.length,
    issues: issuesByType,
    warnings: warningsByType,
    noDefinitions: noDefinitions.length
  };
}

main().catch(console.error);