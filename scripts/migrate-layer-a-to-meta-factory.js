#!/usr/bin/env node
/**
 * @fileoverview Script de Migración Masiva a Meta-Factory
 * 
 * Migra TODOS los tests de Layer A al patrón Meta-Factory automáticamente.
 * 
 * Uso:
 *   node scripts/migrate-layer-a-to-meta-factory.js
 *   node scripts/migrate-layer-a-to-meta-factory.js --dry-run  (solo simular)
 *   node scripts/migrate-layer-a-to-meta-factory.js --area=analyses/tier2  (solo un área)
 * 
 * @module scripts/migrate-layer-a-to-meta-factory
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Verifica si un archivo de test ya usa Meta-Factory
 */
function isMetaFactoryMigrated(testPath) {
  try {
    const content = fs.readFileSync(testPath, 'utf-8');
    return content.includes('createAnalysisTestSuite') ||
           content.includes('createUtilityTestSuite') ||
           content.includes('createDetectorTestSuite') ||
           content.includes('createTestSuite');
  } catch {
    return false;
  }
}

/**
 * Encuentra todos los archivos fuente de Layer A
 */
function findSourceFiles(basePath) {
  const files = [];
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js') && !item.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(basePath);
  return files;
}

/**
 * Mapea ruta de source a ruta de test
 */
function getTestPath(sourcePath) {
  const relativePath = sourcePath.replace(/.*src\/layer-a-static\//, '');
  return path.join('tests/unit/layer-a-analysis', relativePath.replace('.js', '.test.js'));
}

/**
 * Ejecuta el generador para un archivo
 */
function migrateFile(sourcePath, dryRun = false) {
  const testPath = getTestPath(sourcePath);
  
  // Verificar si ya está migrado
  if (isMetaFactoryMigrated(testPath)) {
    return { status: 'already-migrated', source: sourcePath, test: testPath };
  }
  
  if (dryRun) {
    return { status: 'would-migrate', source: sourcePath, test: testPath };
  }
  
  // Verificar PRIMERO si ya está migrado (antes de ejecutar el generador)
  if (fs.existsSync(testPath)) {
    const content = fs.readFileSync(testPath, 'utf-8');
    if (content.includes('createAnalysisTestSuite') || content.includes('createUtilityTestSuite') || 
        content.includes('createDetectorTestSuite') || content.includes('createExtractorTestSuite') ||
        content.includes('createTestSuite')) {
      return { status: 'already-migrated', source: sourcePath, test: testPath };
    }
  }
  
  // Ejecutar el generador
  try {
    // En Windows, redirigimos stderr a stdout para evitar que warnings "rompan" la ejecución
    const cmd = `node "${path.join(__dirname, 'generate-meta-test.js')}" "${sourcePath}" --force 2>&1`;
    execSync(cmd, { encoding: 'utf-8', windowsHide: true });
  } catch (error) {
    // Ignorar errores - verificaremos después si el test se creó
  }
  
  // Verificar si el test fue creado/actualizado
  if (fs.existsSync(testPath)) {
    const content = fs.readFileSync(testPath, 'utf-8');
    // Verificar que use Meta-Factory
    if (content.includes('createAnalysisTestSuite') || content.includes('createUtilityTestSuite') || 
        content.includes('createDetectorTestSuite') || content.includes('createExtractorTestSuite') ||
        content.includes('createTestSuite')) {
      return { status: 'migrated', source: sourcePath, test: testPath };
    }
  }
  
  return { status: 'error', source: sourcePath, test: testPath, error: 'No se pudo generar el test' };
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const areaArg = args.find(arg => arg.startsWith('--area='));
  const specificArea = areaArg ? areaArg.replace('--area=', '') : null;
  
  log('\n🚀 Layer A Meta-Factory Migration Tool\n', 'blue');
  
  if (dryRun) {
    log('📋 MODO SIMULACIÓN (dry-run) - No se realizarán cambios\n', 'yellow');
  }
  
  // Determinar ruta base
  let basePath = path.join(process.cwd(), 'src/layer-a-static');
  if (specificArea) {
    basePath = path.join(basePath, specificArea);
    log(`📁 Área específica: ${specificArea}\n`, 'cyan');
  }
  
  if (!fs.existsSync(basePath)) {
    log(`❌ Error: Ruta no encontrada: ${basePath}`, 'red');
    process.exit(1);
  }
  
  // Encontrar todos los archivos fuente
  log('🔍 Buscando archivos fuente...', 'gray');
  const sourceFiles = findSourceFiles(basePath);
  log(`   Encontrados: ${sourceFiles.length} archivos\n`, 'green');
  
  // Estadísticas
  const stats = {
    total: sourceFiles.length,
    migrated: 0,
    alreadyMigrated: 0,
    errors: 0,
    wouldMigrate: 0
  };
  
  // Procesar cada archivo
  log('⚙️  Procesando archivos...\n', 'cyan');
  
  for (let i = 0; i < sourceFiles.length; i++) {
    const sourceFile = sourceFiles[i];
    const relativePath = sourceFile.replace(/.*src\/layer-a-static\//, '');
    
    // Mostrar progreso
    const progress = Math.round(((i + 1) / sourceFiles.length) * 100);
    process.stdout.write(`\r   [${progress}%] ${relativePath.substring(0, 50)}...         `);
    
    const result = migrateFile(sourceFile, dryRun);
    
    switch (result.status) {
      case 'migrated':
        stats.migrated++;
        break;
      case 'already-migrated':
        stats.alreadyMigrated++;
        break;
      case 'would-migrate':
        stats.wouldMigrate++;
        break;
      case 'error':
        stats.errors++;
        if (!dryRun) {
          console.log(); // Nueva línea
          log(`   ❌ Error: ${relativePath}`, 'red');
        }
        break;
    }
  }
  
  console.log(); // Nueva línea
  
  // Mostrar resumen
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE MIGRACIÓN', 'blue');
  log('='.repeat(60), 'blue');
  log(`   Total archivos:      ${stats.total}`, 'cyan');
  
  if (dryRun) {
    log(`   Se migrarían:        ${stats.wouldMigrate}`, 'yellow');
    log(`   Ya migrados:         ${stats.alreadyMigrated}`, 'green');
  } else {
    log(`   Migrados:            ${stats.migrated}`, 'green');
    log(`   Ya estaban migrados: ${stats.alreadyMigrated}`, 'cyan');
    log(`   Errores:             ${stats.errors}`, stats.errors > 0 ? 'red' : 'gray');
  }
  
  log('='.repeat(60), 'blue');
  
  if (!dryRun && stats.migrated > 0) {
    log(`\n✅ ${stats.migrated} archivos migrados exitosamente!`, 'green');
    log('\n📋 Próximos pasos:', 'cyan');
    log('   1. Revisar los tests generados', 'cyan');
    log('   2. Ejecutar: npm test -- tests/unit/layer-a-analysis/', 'cyan');
    log('   3. Ajustar tests específicos según necesidad', 'cyan');
  }
  
  if (dryRun && stats.wouldMigrate > 0) {
    log(`\n💡 Para migrar realmente, ejecuta sin --dry-run`, 'yellow');
  }
  
  log('');
}

main().catch(err => {
  log(`\n❌ Error fatal: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
