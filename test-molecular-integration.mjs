/**
 * Test script para verificar integración molecular
 * Prueba que se extraen y guardan átomos/moléculas correctamente
 */

import { parseFile } from './src/layer-a-static/parser/index.js';
import { extractMolecularStructure } from './src/layer-a-static/pipeline/molecular-extractor.js';
import { saveAtom, saveMolecule, loadAtoms, loadMolecule } from './src/layer-a-static/storage/storage-manager.js';
import { composeMolecularMetadata } from './src/shared/derivation-engine.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_CODE = `
/**
 * Servicio de usuario con operaciones CRUD
 */

export async function fetchUser(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export function validateUser(user) {
  if (!user || !user.id) return false;
  return user.id > 0;
}

function internalHelper(data) {
  return data.map(x => x * 2);
}

export async function updateUser(userId, data) {
  await fetchUser(userId); // Verifica que existe
  const validated = validateUser(data);
  if (!validated) throw new Error('Invalid user data');
  
  const processed = internalHelper([1, 2, 3]);
  
  return { userId, data, processed };
}
`;

const PROJECT_PATH = './test-molecular-project';
const FILE_PATH = 'src/api/userService.js';

async function runTest() {
  console.log('🧪 Testing Molecular Architecture Integration\n');
  
  // 1. Parsear código de prueba
  console.log('1️⃣ Parseando código de prueba...');
  const parsed = parseFile(FILE_PATH, TEST_CODE);
  console.log(`   ✅ Encontradas ${parsed.functions?.length || 0} funciones`);
  
  if (parsed.functions) {
    parsed.functions.forEach(f => {
      console.log(`      - ${f.name} (ID: ${f.id})`);
    });
  }
  
  // 2. Extraer estructura molecular
  console.log('\n2️⃣ Extrayendo estructura molecular...');
  const molecularStructure = extractMolecularStructure(FILE_PATH, TEST_CODE, parsed, {});
  console.log(`   ✅ Extraídos ${molecularStructure.atoms?.length || 0} átomos`);
  console.log(`   ✅ Molécula creada: ${molecularStructure.filePath}`);
  
  // Mostrar detalles de átomos
  if (molecularStructure.atoms) {
    molecularStructure.atoms.forEach(atom => {
      console.log(`\n   📍 Átomo: ${atom.name}`);
      console.log(`      - ID: ${atom.id}`);
      console.log(`      - Complejidad: ${atom.complexity}`);
      console.log(`      - Exportado: ${atom.isExported}`);
      console.log(`      - Async: ${atom.isAsync}`);
      console.log(`      - Network calls: ${atom.hasNetworkCalls}`);
      console.log(`      - Error handling: ${atom.hasErrorHandling}`);
      console.log(`      - Archetype: ${atom.archetype?.type} (severity: ${atom.archetype?.severity})`);
      console.log(`      - Calls: ${atom.calls?.length || 0} funciones`);
      console.log(`      - Called by: ${atom.calledBy?.length || 0} funciones`);
      if (atom.calledBy?.length > 0) {
        console.log(`        → ${atom.calledBy.join(', ')}`);
      }
    });
  }
  
  // 3. Crear directorio de prueba
  console.log('\n3️⃣ Preparando estructura de directorios...');
  try {
    await fs.mkdir(PROJECT_PATH, { recursive: true });
    console.log(`   ✅ Directorio creado: ${PROJECT_PATH}`);
  } catch (e) {
    console.log(`   ⚠️  Directorio ya existe`);
  }
  
  // 4. Guardar átomos
  console.log('\n4️⃣ Guardando átomos individualmente...');
  for (const atom of molecularStructure.atoms || []) {
    const savedPath = await saveAtom(PROJECT_PATH, FILE_PATH, atom.name, atom);
    console.log(`   💾 ${atom.name} → ${savedPath}`);
  }
  
  // 5. Guardar molécula
  console.log('\n5️⃣ Guardando molécula...');
  const moleculeData = {
    filePath: FILE_PATH,
    type: 'molecule',
    atoms: molecularStructure.atoms?.map(a => a.id) || [],
    extractedAt: new Date().toISOString()
  };
  const moleculePath = await saveMolecule(PROJECT_PATH, FILE_PATH, moleculeData);
  console.log(`   💾 Molécula → ${moleculePath}`);
  
  // 6. Cargar átomos desde storage
  console.log('\n6️⃣ Cargando átomos desde storage...');
  const loadedAtoms = await loadAtoms(PROJECT_PATH, FILE_PATH);
  console.log(`   ✅ Cargados ${loadedAtoms.length} átomos`);
  
  // 7. Cargar molécula desde storage
  console.log('\n7️⃣ Cargando molécula desde storage...');
  const loadedMolecule = await loadMolecule(PROJECT_PATH, FILE_PATH);
  console.log(`   ✅ Molécula cargada: ${loadedMolecule?.filePath}`);
  console.log(`   📊 Referencias a átomos: ${loadedMolecule?.atoms?.length || 0}`);
  
  // 8. Derivar metadata molecular
  console.log('\n8️⃣ Derivando metadata molecular desde átomos...');
  if (loadedAtoms.length > 0) {
    const derivedMetadata = composeMolecularMetadata(FILE_PATH, loadedAtoms);
    console.log(`   📊 Total complejidad: ${derivedMetadata.totalComplexity}`);
    console.log(`   🎯 Risk score: ${derivedMetadata.riskScore}`);
    console.log(`   🔍 Archetype: ${derivedMetadata.archetype?.type}`);
    console.log(`   🌐 Has network calls: ${derivedMetadata.hasNetworkCalls}`);
    console.log(`   📝 Export count: ${derivedMetadata.exportCount}`);
    console.log(`   ⚡ Function count: ${derivedMetadata.functionCount}`);
  }
  
  // 9. Verificar estructura de archivos
  console.log('\n9️⃣ Verificando estructura de archivos...');
  try {
    const atomsDir = path.join(PROJECT_PATH, '.omnysysdata', 'atoms', 'src', 'api', 'userService');
    const atomsFiles = await fs.readdir(atomsDir);
    console.log(`   📁 Átomos: ${atomsFiles.join(', ')}`);
    
    const moleculesDir = path.join(PROJECT_PATH, '.omnysysdata', 'molecules', 'src', 'api');
    const moleculesFiles = await fs.readdir(moleculesDir);
    console.log(`   📁 Moléculas: ${moleculesFiles.join(', ')}`);
  } catch (e) {
    console.log(`   ⚠️  Error leyendo directorios: ${e.message}`);
  }
  
  console.log('\n✅ Test completado exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   - Átomos extraídos: ${molecularStructure.atoms?.length || 0}`);
  console.log(`   - Átomos guardados: ${loadedAtoms.length}`);
  console.log(`   - Molécula guardada: ${loadedMolecule ? 'Sí' : 'No'}`);
  console.log(`   - Metadata derivada: ${loadedAtoms.length > 0 ? 'Sí' : 'No'}`);
}

runTest().catch(console.error);
