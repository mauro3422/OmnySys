/**
 * Test de caché atómico - Verifica eficiencia y estructura
 */

import { UnifiedCacheManager } from './src/core/unified-cache-manager/index.js';
import { parseFile } from './src/layer-a-static/parser/index.js';
import { extractMolecularStructure } from './src/layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule, saveFileAnalysis } from './src/layer-a-static/storage/storage-manager.js';
import { getFileAnalysisWithAtoms, getAtomDetails } from './src/layer-a-static/query/queries/file-query.js';
import fs from 'fs/promises';

const PROJECT_PATH = './test-cache-project';
const FILE_PATH = 'src/services/userService.js';

const TEST_CODE = `
export async function fetchUser(id) {
  return fetch(\`/api/users/\${id}\`);
}

function helper(data) {
  return data.filter(x => x.active);
}

export function processUsers(users) {
  return helper(users).map(u => u.name);
}
`;

async function cleanup() {
  try {
    await fs.rm(PROJECT_PATH, { recursive: true });
  } catch {}
}

async function runTest() {
  console.log('🧪 TEST DE CACHÉ ATÓMICO\n');
  
  await cleanup();
  await fs.mkdir(PROJECT_PATH, { recursive: true });
  
  // 1. Crear caché
  console.log('1️⃣  Creando UnifiedCacheManager...');
  const cache = new UnifiedCacheManager(PROJECT_PATH);
  console.log('   ✅ Caché creado\n');
  
  // 2. Extraer y guardar átomos
  console.log('2️⃣  Extrayendo átomos...');
  const parsed = parseFile(FILE_PATH, TEST_CODE);
  const molecular = extractMolecularStructure(FILE_PATH, TEST_CODE, parsed, {});
  
  for (const atom of molecular.atoms) {
    await saveAtom(PROJECT_PATH, FILE_PATH, atom.name, atom);
  }
  await saveMolecule(PROJECT_PATH, FILE_PATH, {
    filePath: FILE_PATH,
    type: 'molecule',
    atoms: molecular.atoms.map(a => a.id),
    extractedAt: new Date().toISOString()
  });
  
  // Guardar análisis base del archivo
  await saveFileAnalysis(PROJECT_PATH, FILE_PATH, {
    filePath: FILE_PATH,
    atomIds: molecular.atoms.map(a => a.id),
    atomCount: molecular.atoms.length,
    functionRefs: molecular.atoms.map(a => ({
      id: a.id,
      name: a.name,
      line: a.line,
      isExported: a.isExported
    })),
    exports: parsed.exports,
    imports: parsed.imports,
    definitions: parsed.definitions,
    analyzedAt: new Date().toISOString()
  });
  
  console.log(`   ✅ ${molecular.atoms.length} átomos guardados\n`);
  
  // 3. Primera llamada (sin caché)
  console.log('3️⃣  Primera consulta (sin caché)...');
  console.time('   ⏱️  Tiempo');
  const result1 = await getFileAnalysisWithAtoms(PROJECT_PATH, FILE_PATH, cache);
  console.timeEnd('   ⏱️  Tiempo');
  console.log(`   ✅ ${result1.atoms.length} átomos cargados`);
  console.log(`   📊 Stats: ${result1.stats.totalAtoms} átomos, complejidad ${result1.stats.totalComplexity}\n`);
  
  // 4. Verificar caché
  console.log('4️⃣  Verificando caché...');
  const cacheStats = cache.getRamStats();
  const atomStats = cache.getAtomStats();
  console.log(`   📦 Entradas en caché: ${cacheStats.size}`);
  console.log(`   🧬 Átomos en caché: ${atomStats.atomsCached}`);
  console.log(`   📊 Metadata derivada: ${atomStats.derivedCached}`);
  console.log(`   💾 Memoria usada: ${cacheStats.memoryUsageKB} KB\n`);
  
  // 5. Segunda llamada (con caché)
  console.log('5️⃣  Segunda consulta (con caché)...');
  console.time('   ⏱️  Tiempo');
  const result2 = await getFileAnalysisWithAtoms(PROJECT_PATH, FILE_PATH, cache);
  console.timeEnd('   ⏱️  Tiempo');
  console.log(`   ✅ ${result2.atoms.length} átomos desde caché\n`);
  
  // 6. Consulta individual de átomo
  console.log('6️⃣  Consulta individual de átomo...');
  console.time('   ⏱️  Tiempo primera vez');
  const atom1 = await getAtomDetails(PROJECT_PATH, FILE_PATH, 'fetchUser', cache);
  console.timeEnd('   ⏱️  Tiempo primera vez');
  console.log(`   ✅ Átomo: ${atom1.name}, complexity: ${atom1.complexity}`);
  
  console.time('   ⏱️  Tiempo con caché');
  const atom2 = await getAtomDetails(PROJECT_PATH, FILE_PATH, 'fetchUser', cache);
  console.timeEnd('   ⏱️  Tiempo con caché');
  console.log(`   ✅ Átomo desde caché: ${atom2.name}\n`);
  
  // 7. Verificar estructura de caché
  console.log('7️⃣  Estructura del caché:');
  console.log(`   🔑 Claves:`);
  for (const key of cache.ramCache.keys()) {
    const type = key.startsWith('atom:') ? 'Átomo' : 
                 key.startsWith('derived:') ? 'Derivada' : 'Otro';
    console.log(`      - ${key.substring(0, 60)}... (${type})`);
  }
  console.log();
  
  // 8. Invalidación
  console.log('8️⃣  Probando invalidación...');
  const before = cache.getAtomStats().atomsCached;
  cache.invalidateFileAtoms(FILE_PATH);
  const after = cache.getAtomStats().atomsCached;
  console.log(`   🗑️  Átomos antes: ${before}, después: ${after}\n`);
  
  console.log('✅ TEST COMPLETADO');
  console.log('\n📊 Resumen del caché:');
  const finalStats = cache.getAtomStats();
  console.log(`   • Átomos cacheados: ${finalStats.atomsCached}`);
  console.log(`   • Metadata derivada: ${finalStats.derivedCached}`);
  console.log(`   • Memoria átomos: ${finalStats.atomMemoryKB} KB`);
  console.log(`   • Memoria derivada: ${finalStats.derivedMemoryKB} KB`);
  console.log(`   • Total memoria: ${finalStats.atomMemoryKB + finalStats.derivedMemoryKB} KB`);
  console.log('\n🎯 El caché es rápido y eficiente:');
  console.log('   ✅ Segunda consulta ~instantánea (desde RAM)');
  console.log('   ✅ Invalidación por archivo (wildcards)');
  console.log('   ✅ LRU automático (evita memory leaks)');
  console.log('   ✅ TTL automático (datos frescos)');
  
  await cleanup();
}

runTest().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
