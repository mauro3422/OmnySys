/**
 * Test de integración completo - Verifica consistencia de IDs y no duplicación
 */

import { parseFile } from './src/layer-a-static/parser/index.js';
import { extractMolecularStructure } from './src/layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule, loadAtoms, loadMolecule } from './src/layer-a-static/storage/storage-manager.js';
import { composeMolecularMetadata } from './src/shared/derivation-engine.js';
import { getFileId } from './src/layer-a-static/parser/helpers.js';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_PATH = './test-integration-project';
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
  console.log('🔬 TEST DE INTEGRACIÓN: Consistencia de IDs y No Duplicación\n');
  
  await cleanup();
  
  // 1. Verificar generación de ID de archivo
  console.log('1️⃣  Verificando ID de archivo...');
  const fileId = getFileId(FILE_PATH);
  console.log(`   📁 File: ${FILE_PATH}`);
  console.log(`   🆔 File ID: ${fileId}`);
  
  // El ID debe ser único basado en el path
  const fileId2 = getFileId('src/api/userService.js');
  const fileId3 = getFileId('src/services/userService.js');
  console.log(`   🆔 userService (api): ${fileId2}`);
  console.log(`   🆔 userService (services): ${fileId3}`);
  
  if (fileId2 === fileId3) {
    console.error('   ❌ ERROR: Colisión de IDs!');
    process.exit(1);
  }
  console.log('   ✅ IDs son únicos\n');
  
  // 2. Parsear y extraer
  console.log('2️⃣  Parseando código...');
  const parsed = parseFile(FILE_PATH, TEST_CODE);
  console.log(`   ✅ ${parsed.functions?.length || 0} funciones encontradas`);
  
  // Verificar IDs de funciones
  parsed.functions?.forEach(f => {
    console.log(`      ${f.name}: ${f.id}`);
    if (!f.id.includes('::')) {
      console.error('   ❌ ERROR: ID no usa formato ::');
      process.exit(1);
    }
  });
  console.log('   ✅ IDs usan formato correcto (::)\n');
  
  // 3. Extraer estructura molecular
  console.log('3️⃣  Extrayendo estructura molecular...');
  const molecular = extractMolecularStructure(FILE_PATH, TEST_CODE, parsed, {});
  
  // Verificar que IDs de átomos coincidan con functions
  console.log('   Verificando consistencia de IDs:');
  molecular.atoms.forEach(atom => {
    const matchingFunc = parsed.functions?.find(f => f.name === atom.name);
    if (matchingFunc) {
      if (atom.id !== matchingFunc.id) {
        console.error(`   ❌ ERROR: ID mismatch! Átomo: ${atom.id}, Función: ${matchingFunc.id}`);
        process.exit(1);
      }
      console.log(`      ✅ ${atom.name}: ${atom.id}`);
    }
  });
  console.log('   ✅ IDs consistentes entre parser y extractor\n');
  
  // 4. Verificar calledBy se calcula correctamente
  console.log('4️⃣  Verificando grafo de llamadas (calledBy)...');
  const helperAtom = molecular.atoms.find(a => a.name === 'helper');
  const processUsersAtom = molecular.atoms.find(a => a.name === 'processUsers');
  
  if (helperAtom.calledBy?.includes(processUsersAtom.id)) {
    console.log(`   ✅ helper es llamada por: ${helperAtom.calledBy.join(', ')}`);
  } else {
    console.error('   ❌ ERROR: calledBy no calculado correctamente');
    process.exit(1);
  }
  console.log();
  
  // 5. Guardar átomos
  console.log('5️⃣  Guardando átomos...');
  for (const atom of molecular.atoms) {
    await saveAtom(PROJECT_PATH, FILE_PATH, atom.name, atom);
  }
  console.log(`   ✅ ${molecular.atoms.length} átomos guardados\n`);
  
  // 6. Guardar molécula
  console.log('6️⃣  Guardando molécula...');
  await saveMolecule(PROJECT_PATH, FILE_PATH, {
    filePath: FILE_PATH,
    type: 'molecule',
    atoms: molecular.atoms.map(a => a.id),
    extractedAt: new Date().toISOString()
  });
  console.log('   ✅ Molécula guardada\n');
  
  // 7. Cargar y verificar integridad
  console.log('7️⃣  Cargando desde storage...');
  const loadedAtoms = await loadAtoms(PROJECT_PATH, FILE_PATH);
  const loadedMolecule = await loadMolecule(PROJECT_PATH, FILE_PATH);
  
  console.log(`   ✅ ${loadedAtoms.length} átomos cargados`);
  console.log(`   ✅ Molécula cargada: ${loadedMolecule?.filePath}`);
  
  // Verificar que IDs se mantienen
  console.log('   Verificando IDs cargados:');
  loadedAtoms.forEach(atom => {
    const original = molecular.atoms.find(a => a.name === atom.name);
    if (atom.id !== original.id) {
      console.error(`   ❌ ERROR: ID corrompido! Original: ${original.id}, Cargado: ${atom.id}`);
      process.exit(1);
    }
    console.log(`      ✅ ${atom.name}: ${atom.id}`);
  });
  console.log('   ✅ IDs se mantienen consistentes\n');
  
  // 8. Verificar NO duplicación
  console.log('8️⃣  Verificando NO duplicación de datos...');
  
  // Verificar estructura de archivos
  const dataDir = path.join(PROJECT_PATH, '.omnysysdata');
  const atomsDir = path.join(dataDir, 'atoms');
  const moleculesDir = path.join(dataDir, 'molecules');
  
  try {
    const atomsFiles = await fs.readdir(path.join(atomsDir, 'src', 'services', 'userService'));
    console.log(`   📁 Átomos: ${atomsFiles.join(', ')}`);
    
    // Verificar que cada átomo tiene su propio archivo
    if (atomsFiles.length !== molecular.atoms.length) {
      console.error(`   ❌ ERROR: Número de archivos de átomos incorrecto`);
      process.exit(1);
    }
    
    // Verificar que los IDs en los archivos coincidan
    for (const file of atomsFiles) {
      const content = await fs.readFile(path.join(atomsDir, 'src', 'services', 'userService', file), 'utf-8');
      const atom = JSON.parse(content);
      const expectedId = molecular.atoms.find(a => a.name === atom.name)?.id;
      if (atom.id !== expectedId) {
        console.error(`   ❌ ERROR: ID en archivo ${file} no coincide: ${atom.id} vs ${expectedId}`);
        process.exit(1);
      }
    }
    console.log('   ✅ Archivos de átomos correctos');
    
    // Verificar molécula
    const moleculeFiles = await fs.readdir(path.join(moleculesDir, 'src', 'services'));
    console.log(`   📁 Moléculas: ${moleculeFiles.join(', ')}`);
    
    const moleculeContent = await fs.readFile(
      path.join(moleculesDir, 'src', 'services', 'userService.js.molecule.json'), 
      'utf-8'
    );
    const moleculeData = JSON.parse(moleculeContent);
    
    // Verificar que molécula solo tiene referencias, no datos duplicados
    if (!moleculeData.atoms || !Array.isArray(moleculeData.atoms)) {
      console.error('   ❌ ERROR: Molécula no tiene array de atom IDs');
      process.exit(1);
    }
    
    // Verificar que todos los IDs de átomos están en la molécula
    const expectedIds = molecular.atoms.map(a => a.id).sort();
    const storedIds = moleculeData.atoms.sort();
    
    if (JSON.stringify(expectedIds) !== JSON.stringify(storedIds)) {
      console.error('   ❌ ERROR: IDs en molécula no coinciden con átomos');
      console.error(`      Esperado: ${expectedIds.join(', ')}`);
      console.error(`      Guardado: ${storedIds.join(', ')}`);
      process.exit(1);
    }
    console.log('   ✅ Molécula solo tiene referencias (no duplicación)');
    
  } catch (e) {
    console.error(`   ❌ ERROR: ${e.message}`);
    process.exit(1);
  }
  console.log();
  
  // 9. Verificar derivación
  console.log('9️⃣  Verificando derivación de metadata...');
  const derived = composeMolecularMetadata(FILE_PATH, loadedAtoms);
  
  console.log(`   📊 Complejidad total: ${derived.totalComplexity}`);
  console.log(`   🎯 Risk score: ${derived.riskScore}`);
  console.log(`   🔍 Archetype: ${derived.archetype?.type}`);
  console.log(`   🌐 Has network calls: ${derived.hasNetworkCalls}`);
  console.log(`   📝 Export count: ${derived.exportCount}`);
  
  // Verificar que derivación es correcta
  const expectedComplexity = loadedAtoms.reduce((sum, a) => sum + (a.complexity || 0), 0);
  if (derived.totalComplexity !== expectedComplexity) {
    console.error(`   ❌ ERROR: Complejidad derivada incorrecta`);
    process.exit(1);
  }
  console.log('   ✅ Derivación correcta\n');
  
  console.log('🎉 TODOS LOS TESTS PASARON!');
  console.log('\n✅ Sistema atómico:');
  console.log('   • IDs únicos y consistentes');
  console.log('   • No hay duplicación de datos');
  console.log('   • calledBy calculado correctamente');
  console.log('   • Derivación funciona desde átomos');
  console.log('   • Storage mantiene integridad');
  
  await cleanup();
}

runTest().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
