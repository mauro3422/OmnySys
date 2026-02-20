/**
 * @fileoverview demo-system-capabilities.js
 * 
 * Demuestra las capacidades del sistema sin necesidad del MCP.
 * Simula las queries más comunes que haría un usuario:
 * 
 * 1. Impacto de modificar un archivo
 * 2. Funciones relacionadas con una función
 * 3. Dead code real
 * 4. API surface
 * 5. Dependencias de un módulo
 * 
 * Usage: node scripts/demo-system-capabilities.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllData() {
  // Load atoms
  const atomsDir = path.join(ROOT_PATH, '.omnysysdata', 'atoms');
  const atoms = new Map();
  
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
            if (data.id) atoms.set(data.id, data);
          } catch {}
        }
      }
    } catch {}
  }
  await scanDir(atomsDir);
  
  // Load system-map
  let systemMap = null;
  try {
    const content = await fs.readFile(path.join(ROOT_PATH, '.omnysysdata', 'system-map.json'), 'utf-8');
    systemMap = JSON.parse(content);
  } catch {}
  
  // Load files
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const files = new Map();
  try {
    const entries = await fs.readdir(filesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(filesDir, entry.name), 'utf-8');
          const data = JSON.parse(content);
          if (data.path) files.set(data.path, data);
        } catch {}
      }
    }
  } catch {}
  
  return { atoms, systemMap, files };
}

// ============================================================================
// CAPABILITIES
// ============================================================================

/**
 * 1. IMPACTO DE MODIFICAR UN ARCHIVO
 * ¿Qué se rompe si cambio este archivo?
 */
function analyzeFileImpact(filePath, atoms, systemMap, files) {
  console.log('\n📊 1. IMPACTO DE MODIFICAR ARCHIVO');
  console.log('═'.repeat(70));
  console.log(`   Archivo: ${filePath}`);
  console.log('─'.repeat(50));
  
  // Encontrar átomos en este archivo
  const fileAtoms = Array.from(atoms.values()).filter(a => a.filePath === filePath);
  console.log(`\n   📝 Átomos en el archivo: ${fileAtoms.length}`);
  
  // Átomos exportados (API del archivo)
  const exported = fileAtoms.filter(a => a.isExported);
  console.log(`   📤 Exportados (API): ${exported.length}`);
  
  // Quién usa estos átomos
  const callers = new Set();
  for (const atom of exported) {
    for (const caller of (atom.calledBy || [])) {
      callers.add(caller);
    }
  }
  
  console.log(`\n   ⚠️  Archivos que dependen de este:`);
  
  // Agrupar callers por archivo
  const callersByFile = {};
  for (const caller of callers) {
    // Extraer archivo del caller ID
    const match = caller.match(/^(.+)::/);
    if (match) {
      const callerFile = match[1];
      if (!callersByFile[callerFile]) callersByFile[callerFile] = [];
      callersByFile[callerFile].push(caller);
    }
  }
  
  const sortedCallers = Object.entries(callersByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [file, callerList] of sortedCallers) {
    console.log(`      • ${file} (${callerList.length} calls)`);
  }
  
  // Calcular riesgo
  const riskLevel = callers.size > 50 ? 'ALTO' : callers.size > 10 ? 'MEDIO' : 'BAJO';
  console.log(`\n   🎯 Nivel de riesgo: ${riskLevel}`);
  console.log(`   📊 Total dependientes: ${callers.size}`);
  
  return { fileAtoms, exported, callers, riskLevel };
}

/**
 * 2. FUNCIONES RELACIONADAS
 * ¿Qué funciones están conectadas con esta?
 */
function analyzeRelatedFunctions(atomId, atoms) {
  console.log('\n📊 2. FUNCIONES RELACIONADAS');
  console.log('═'.repeat(70));
  console.log(`   Átomo: ${atomId}`);
  console.log('─'.repeat(50));
  
  const atom = atoms.get(atomId);
  if (!atom) {
    console.log('   ❌ Átomo no encontrado');
    return;
  }
  
  console.log(`   Nombre: ${atom.name}`);
  console.log(`   Purpose: ${atom.purpose}`);
  console.log(`   Archivo: ${atom.filePath}`);
  
  // Calls (qué llama esta función)
  const calls = atom.calls || [];
  console.log(`\n   📞 Llama a (${calls.length}):`);
  const uniqueCalls = [...new Set(calls.map(c => c.name))].slice(0, 10);
  for (const name of uniqueCalls) {
    const targetAtom = Array.from(atoms.values()).find(a => a.name === name);
    const purpose = targetAtom?.purpose || '?';
    console.log(`      • ${name} [${purpose}]`);
  }
  
  // CalledBy (quién llama a esta función)
  const calledBy = atom.calledBy || [];
  console.log(`\n   📥 Llamada por (${calledBy.length}):`);
  for (const caller of calledBy.slice(0, 10)) {
    const match = caller.match(/::(.+)$/);
    const funcName = match ? match[1] : caller;
    console.log(`      • ${funcName}`);
  }
  
  // Data flow
  const inputs = atom.dataFlow?.inputs || [];
  const outputs = atom.dataFlow?.outputs || [];
  console.log(`\n   🔄 Data Flow:`);
  console.log(`      Inputs: ${inputs.map(i => i.name).join(', ') || 'ninguno'}`);
  console.log(`      Outputs: ${outputs.length}`);
  
  return { calls, calledBy };
}

/**
 * 3. DEAD CODE REAL
 * Funciones que realmente no se usan
 */
function findRealDeadCode(atoms) {
  console.log('\n📊 3. DEAD CODE REAL');
  console.log('═'.repeat(70));
  console.log('─'.repeat(50));
  
  const deadAtoms = Array.from(atoms.values()).filter(a => 
    a.purpose === 'DEAD_CODE' && (!a.calledBy || a.calledBy.length === 0)
  );
  
  console.log(`   💀 Dead code real: ${deadAtoms.length}`);
  console.log(`   📊 Porcentaje del total: ${(deadAtoms.length/atoms.size*100).toFixed(2)}%`);
  
  // Agrupar por archivo
  const byFile = {};
  for (const atom of deadAtoms) {
    if (!byFile[atom.filePath]) byFile[atom.filePath] = [];
    byFile[atom.filePath].push(atom);
  }
  
  console.log(`\n   📁 Archivos con más dead code:`);
  const sortedFiles = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  for (const [file, atoms] of sortedFiles) {
    console.log(`      • ${file}: ${atoms.length} funciones`);
    for (const atom of atoms.slice(0, 3)) {
      console.log(`         - ${atom.name} (line ${atom.line})`);
    }
  }
  
  // Clasificar por tipo
  console.log(`\n   📋 Por tipo:`);
  const byType = {};
  for (const atom of deadAtoms) {
    const type = atom.functionType || 'function';
    byType[type] = (byType[type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`      • ${type}: ${count}`);
  }
  
  return deadAtoms;
}

/**
 * 4. API SURFACE
 * Qué funciones conforman la API pública
 */
function analyzeAPISurface(atoms) {
  console.log('\n📊 4. API SURFACE (API Pública)');
  console.log('═'.repeat(70));
  console.log('─'.repeat(50));
  
  const apiAtoms = Array.from(atoms.values()).filter(a => a.purpose === 'API_EXPORT');
  
  console.log(`   📤 Total API exports: ${apiAtoms.length}`);
  
  // Por archivo
  const byFile = {};
  for (const atom of apiAtoms) {
    if (!byFile[atom.filePath]) byFile[atom.filePath] = [];
    byFile[atom.filePath].push(atom);
  }
  
  console.log(`\n   📁 Top archivos por exports:`);
  const sortedFiles = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [file, atoms] of sortedFiles) {
    console.log(`      • ${file}: ${atoms.length} exports`);
  }
  
  // Hubs (más callers)
  console.log(`\n   🌟 API Hubs (más usados):`);
  const hubs = apiAtoms
    .filter(a => a.calledBy && a.calledBy.length > 0)
    .sort((a, b) => b.calledBy.length - a.calledBy.length)
    .slice(0, 10);
  
  for (const atom of hubs) {
    console.log(`      • ${atom.name}: ${atom.calledBy.length} callers`);
    console.log(`        File: ${atom.filePath}`);
  }
  
  // Async API
  const asyncApi = apiAtoms.filter(a => a.isAsync);
  console.log(`\n   ⚡ Async API: ${asyncApi.length} (${(asyncApi.length/apiAtoms.length*100).toFixed(1)}%)`);
  
  return apiAtoms;
}

/**
 * 5. DEPENDENCIAS DE UN MÓDULO
 * Qué necesita este archivo para funcionar
 */
function analyzeModuleDependencies(filePath, atoms, systemMap) {
  console.log('\n📊 5. DEPENDENCIAS DE MÓDULO');
  console.log('═'.repeat(70));
  console.log(`   Archivo: ${filePath}`);
  console.log('─'.repeat(50));
  
  // Encontrar el archivo en system-map
  const fileData = systemMap?.files?.[filePath];
  if (fileData) {
    console.log(`\n   📥 Imports:`);
    for (const imp of (fileData.imports || []).slice(0, 10)) {
      console.log(`      • ${imp.module || imp.source}`);
    }
    
    console.log(`\n   📤 Exports:`);
    for (const exp of (fileData.exports || []).slice(0, 10)) {
      console.log(`      • ${exp.name}`);
    }
  }
  
  // Átomos del archivo y sus calls
  const fileAtoms = Array.from(atoms.values()).filter(a => a.filePath === filePath);
  
  const externalDeps = new Set();
  for (const atom of fileAtoms) {
    for (const call of (atom.calls || [])) {
      if (call.type === 'external' || call.name) {
        // Buscar si es una función de otro archivo
        const targetAtom = Array.from(atoms.values()).find(a => a.name === call.name && a.filePath !== filePath);
        if (targetAtom) {
          externalDeps.add(`${call.name} ← ${targetAtom.filePath}`);
        }
      }
    }
  }
  
  console.log(`\n   🔗 Dependencias externas (funciones):`);
  for (const dep of [...externalDeps].slice(0, 10)) {
    console.log(`      • ${dep}`);
  }
  
  return { fileAtoms, externalDeps };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 DEMOSTRACIÓN DE CAPACIDADES DEL SISTEMA');
  console.log('═'.repeat(70));
  
  // Cargar datos
  console.log('\n📁 Cargando datos...');
  const { atoms, systemMap, files } = await loadAllData();
  console.log(`   ✅ Átomos: ${atoms.size}`);
  console.log(`   ✅ System Map: ${systemMap ? '✓' : '✗'}`);
  console.log(`   ✅ Files: ${files.size}`);
  
  // 1. Impacto de archivo
  analyzeFileImpact(
    'src/layer-a-static/indexer.js',
    atoms, systemMap, files
  );
  
  // 2. Funciones relacionadas
  analyzeRelatedFunctions(
    'src/layer-a-static/indexer.js::indexProject',
    atoms
  );
  
  // 3. Dead code real
  findRealDeadCode(atoms);
  
  // 4. API Surface
  analyzeAPISurface(atoms);
  
  // 5. Dependencias de módulo
  analyzeModuleDependencies(
    'src/core/cache/manager/ram-cache.js',
    atoms, systemMap
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ DEMOSTRACIÓN COMPLETADA');
  console.log('═'.repeat(70));
}

main().catch(console.error);