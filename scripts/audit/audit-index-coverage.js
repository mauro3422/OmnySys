/**
 * @fileoverview audit-index-coverage.js
 * 
 * Compara archivos totales del proyecto vs archivos indexados.
 * Detecta problemas de cobertura del indexer.
 * 
 * Uso: node scripts/audit-index-coverage.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanJsonFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Escanea todos los archivos JS/TS del proyecto
 */
async function scanAllProjectFiles() {
  const files = [];
  const excludeDirs = ['node_modules', '.git', 'coverage', 'logs', '.omnysysdata'];
  
  async function scan(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip directorios excluidos
          if (!excludeDirs.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
            files.push(path.relative(ROOT_PATH, fullPath).replace(/\\/g, '/'));
          }
        }
      }
    } catch (error) {
      // Skip directorios sin permiso
    }
  }
  
  await scan(ROOT_PATH);
  return files;
}

/**
 * Lee archivos del storage indexado (recursivamente en subdirectorios)
 */
async function getIndexedFiles() {
  const jsonFiles = await scanJsonFiles(ROOT_PATH, '.omnysysdata/files');
  const files = [];
  
  for (const fullPath of jsonFiles) {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      const filePath = data.path || data.filePath;
      if (filePath) {
        files.push(filePath);
      }
    } catch {}
  }
  
  return files;
}

/**
 * Lee archivos del index.json (fileIndex)
 */
async function getIndexFiles() {
  const indexPath = path.join(ROOT_PATH, '.omnysysdata', 'index.json');
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);
    return Object.keys(data.fileIndex || {});
  } catch {
    return [];
  }
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 OmnySys Index Coverage Audit');
  console.log('═'.repeat(70));
  
  // Escanear archivos del proyecto
  console.log('\n📁 Escaneando archivos del proyecto...');
  const allFiles = await scanAllProjectFiles();
  
  // Leer archivos indexados (storage)
  console.log('📁 Leyendo archivos indexados (storage)...');
  const indexedFiles = await getIndexedFiles();
  
  // Leer fileIndex del index.json
  console.log('📁 Leyendo fileIndex del index.json...');
  const fileIndexEntries = await getIndexFiles();
  
  // Estadísticas
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ESTADÍSTICAS DE COBERTURA');
  console.log('═'.repeat(70));
  
  console.log(`\n   Archivos en proyecto (src/, tests/, etc.):  ${allFiles.length}`);
  console.log(`   Archivos en storage (.omnysysdata/files/):  ${indexedFiles.length}`);
  console.log(`   Entradas en fileIndex (index.json):         ${fileIndexEntries.length}`);
  
  // Calcular cobertura
  const coverage = allFiles.length > 0 ? ((indexedFiles.length / allFiles.length) * 100).toFixed(1) : 0;
  console.log(`\n   📈 Cobertura de indexación: ${coverage}%`);
  
  // Detectar problemas
  if (indexedFiles.length === 0) {
    console.log('\n   ❌ PROBLEMA CRÍTICO: No hay archivos indexados.');
    console.log('      El indexer no se ejecutó o falló completamente.');
  } else if (coverage < 50) {
    console.log('\n   ⚠️  PROBLEMA GRAVE: Menos del 50% de archivos indexados.');
    console.log('      El indexer no está procesando todos los archivos.');
  } else if (coverage < 90) {
    console.log('\n   ⚠️  PROBLEMA MODERADO: Menos del 90% de archivos indexados.');
  } else {
    console.log('\n   ✅ Cobertura aceptable (≥90%).');
  }
  
  // Archivos faltantes
  const indexedSet = new Set(indexedFiles);
  const missingFiles = allFiles.filter(f => !indexedSet.has(f));
  
  if (missingFiles.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('❌ ARCHIVOS NO INDEXADOS:');
    console.log('─'.repeat(70));
    
    // Agrupar por directorio
    const byDir = {};
    for (const file of missingFiles) {
      const dir = file.split('/').slice(0, -1).join('/') || 'root';
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(file);
    }
    
    const dirs = Object.entries(byDir).sort((a, b) => b[1].length - a[1].length);
    
    console.log(`\n   Total archivos faltantes: ${missingFiles.length}\n`);
    
    // Mostrar top 10 directorios con más archivos faltantes
    console.log('   📁 Top directorios con archivos faltantes:');
    dirs.slice(0, 10).forEach(([dir, files]) => {
      console.log(`      ${dir}: ${files.length} archivos`);
    });
    
    // Mostrar primeros archivos faltantes
    if (missingFiles.length <= 20) {
      console.log('\n   📄 Archivos faltantes:');
      missingFiles.forEach(f => console.log(`      - ${f}`));
    } else {
      console.log('\n   📄 Primeros 20 archivos faltantes:');
      missingFiles.slice(0, 20).forEach(f => console.log(`      - ${f}`));
      console.log(`      ... y ${missingFiles.length - 20} más`);
    }
  }
  
  // Archivos huérfanos (indexados pero no existen)
  const allSet = new Set(allFiles);
  const orphanFiles = indexedFiles.filter(f => !allSet.has(f));
  
  if (orphanFiles.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('⚠️  ARCHIVOS HUÉRFANOS (indexados pero eliminados):');
    console.log('─'.repeat(70));
    orphanFiles.forEach(f => console.log(`      - ${f}`));
  }
  
  // Distribución por tipo
  console.log('\n' + '─'.repeat(70));
  console.log('📊 DISTRIBUCIÓN POR TIPO (archivos del proyecto):');
  console.log('─'.repeat(70));
  
  const byType = {
    src: allFiles.filter(f => f.startsWith('src/')),
    tests: allFiles.filter(f => f.startsWith('tests/') || f.startsWith('test/')),
    scripts: allFiles.filter(f => f.startsWith('scripts/')),
    root: allFiles.filter(f => !f.includes('/')),
    other: []
  };
  
  byType.other = allFiles.filter(f => 
    !f.startsWith('src/') && 
    !f.startsWith('tests/') && 
    !f.startsWith('test/') &&
    !f.startsWith('scripts/') &&
    f.includes('/')
  );
  
  console.log(`\n   src/      : ${byType.src.length} archivos`);
  console.log(`   tests/    : ${byType.tests.length} archivos`);
  console.log(`   scripts/  : ${byType.scripts.length} archivos`);
  console.log(`   root      : ${byType.root.length} archivos`);
  console.log(`   other     : ${byType.other.length} archivos`);
  
  // Cobertura por tipo
  console.log('\n' + '─'.repeat(70));
  console.log('📊 COBERTURA POR TIPO:');
  console.log('─'.repeat(70));
  
  const coverageByType = (type, files) => {
    const indexed = files.filter(f => indexedSet.has(f)).length;
    const pct = files.length > 0 ? ((indexed / files.length) * 100).toFixed(1) : 0;
    const icon = pct >= 90 ? '✅' : pct >= 50 ? '⚠️' : '❌';
    return `${icon} ${type.padEnd(12)}: ${indexed}/${files.length} (${pct}%)`;
  };
  
  console.log(`\n   ${coverageByType('src/', byType.src)}`);
  console.log(`   ${coverageByType('tests/', byType.tests)}`);
  console.log(`   ${coverageByType('scripts/', byType.scripts)}`);
  console.log(`   ${coverageByType('root', byType.root)}`);
  console.log(`   ${coverageByType('other', byType.other)}`);
  
  // Recomendaciones
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMENDACIONES:');
  console.log('═'.repeat(70));
  
  if (byType.src.length > 0 && indexedFiles.filter(f => f.startsWith('src/')).length === 0) {
    console.log('\n   ❌ CRÍTICO: Ningún archivo de src/ está indexado.');
    console.log('      Verificar:');
    console.log('      1. El indexer se ejecutó con el path correcto');
    console.log('      2. No hay errores en el proceso de indexación');
    console.log('      3. El .parserignore no excluye src/');
    console.log('\n      Ejecutar: node src/layer-a-static/indexer.js . --verbose');
  } else if (coverage < 100) {
    console.log('\n   ⚠️  Indexación incompleta.');
    console.log('      Re-ejecutar el indexer para completar:');
    console.log('      node src/layer-a-static/indexer.js .');
  } else {
    console.log('\n   ✅ Todos los archivos están indexados.');
  }
  
  console.log('\n');
  
  return {
    totalFiles: allFiles.length,
    indexedFiles: indexedFiles.length,
    coverage: parseFloat(coverage),
    missingFiles,
    orphanFiles
  };
}

main().catch(console.error);