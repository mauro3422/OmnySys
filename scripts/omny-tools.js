#!/usr/bin/env node
/**
 * @fileoverview omny-tools.js
 * 
 * Herramientas MCP offline - Lee datos de .omnysysdata/ sin iniciar el servidor.
 * Funciona como las herramientas MCP pero directamente desde el filesystem.
 * 
 * Uso: 
 *   node scripts/omny-tools.js                    # Menú interactivo
 *   node scripts/omny-tools.js status             # Estado del sistema
 *   node scripts/omny-tools.js impact <file>      # Impacto de archivo
 *   node scripts/omny-tools.js function <id>      # Detalles de función
 *   node scripts/omny-tools.js dead               # Dead code real
 *   node scripts/omny-tools.js api                # API surface
 *   node scripts/omny-tools.js cycles             # Ciclos de dependencias
 *   node scripts/omny-tools.js risk               # Archivos de riesgo
 *   node scripts/omny-tools.js search <term>      # Buscar funciones
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_PATH, '.omnysysdata');

// ============================================================================
// DATA LOADERS
// ============================================================================

let _atoms = null;
let _systemMap = null;
let _index = null;

async function loadAtoms() {
  if (_atoms) return _atoms;
  
  _atoms = new Map();
  const atomsDir = path.join(DATA_DIR, 'atoms');
  
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
            if (data.id) _atoms.set(data.id, data);
          } catch {}
        }
      }
    } catch {}
  }
  await scanDir(atomsDir);
  return _atoms;
}

async function loadSystemMap() {
  if (_systemMap) return _systemMap;
  
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'system-map.json'), 'utf-8');
    _systemMap = JSON.parse(content);
  } catch {
    _systemMap = { files: {} };
  }
  return _systemMap;
}

async function loadIndex() {
  if (_index) return _index;
  
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf-8');
    _index = JSON.parse(content);
  } catch {
    _index = {};
  }
  return _index;
}

// ============================================================================
// TOOLS (simulando MCP tools)
// ============================================================================

/**
 * get_server_status - Estado del sistema
 */
async function tool_get_server_status() {
  console.log('\n📊 SERVER STATUS (desde .omnysysdata/)');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();
  const index = await loadIndex();
  
  // Contar propósitos
  const purposes = {};
  for (const atom of atoms.values()) {
    const p = atom.purpose || 'UNKNOWN';
    purposes[p] = (purposes[p] || 0) + 1;
  }
  
  console.log('\n📦 DATOS DISPONIBLES:');
  console.log(`   Átomos (funciones): ${atoms.size}`);
  console.log(`   Archivos en system-map: ${Object.keys(systemMap.files || {}).length}`);
  console.log(`   Índice: ${index.metadata?.totalFiles || 'N/A'} archivos`);
  
  console.log('\n📊 DISTRIBUCIÓN POR PURPOSE:');
  for (const [purpose, count] of Object.entries(purposes).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / atoms.size) * 100).toFixed(1);
    console.log(`   ${purpose.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
  }
  
  // Dead code real
  const deadAtoms = Array.from(atoms.values()).filter(a => 
    a.purpose === 'DEAD_CODE' && (!a.calledBy || a.calledBy.length === 0)
  );
  console.log(`\n💀 DEAD CODE REAL: ${deadAtoms.length} (${((deadAtoms.length/atoms.size)*100).toFixed(2)}%)`);
  
  // API Surface
  const apiAtoms = Array.from(atoms.values()).filter(a => a.purpose === 'API_EXPORT');
  console.log(`📤 API EXPORTS: ${apiAtoms.length}`);
  
  // Archivos analizados
  const srcFiles = Object.keys(systemMap.files || {}).filter(f => f.startsWith('src/'));
  console.log(`📁 Archivos src/ analizados: ${srcFiles.length}`);
  
  return {
    atoms: atoms.size,
    files: Object.keys(systemMap.files || {}).length,
    purposes,
    deadCode: deadAtoms.length,
    apiExports: apiAtoms.length
  };
}

/**
 * get_impact_map - Impacto de modificar un archivo
 */
async function tool_get_impact_map(filePath) {
  console.log(`\n📊 IMPACT MAP: ${filePath}`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();
  
  // Normalizar path
  filePath = filePath.replace(/\\/g, '/');
  
  // También buscar en system-map
  const fileData = systemMap.files?.[filePath];
  
  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN NUEVA: IMPORTS DEL ARCHIVO (qué necesita)
  // ═══════════════════════════════════════════════════════════════
  if (fileData) {
    const imports = fileData.imports || [];
    console.log(`\n📥 IMPORTS (dependencias): ${imports.length}`);
    
    const internalImports = imports.filter(i => {
      const src = i.source || i.module || '';
      return src.startsWith('./') || src.startsWith('../') || src.startsWith('#');
    });
    const externalImports = imports.filter(i => {
      const src = i.source || i.module || '';
      return !src.startsWith('./') && !src.startsWith('../') && !src.startsWith('#');
    });
    
    console.log(`   Internos: ${internalImports.length}`);
    console.log(`   Externos: ${externalImports.length}`);
    
    if (internalImports.length > 0) {
      console.log(`\n   📁 Imports internos:`);
      for (const imp of internalImports.slice(0, 15)) {
        const src = imp.source || imp.module;
        const names = imp.names?.join(', ') || '*';
        console.log(`      • ${src} → ${names}`);
      }
      if (internalImports.length > 15) {
        console.log(`      ... y ${internalImports.length - 15} más`);
      }
    }
    
    if (externalImports.length > 0) {
      console.log(`\n   📦 Imports externos:`);
      const uniqueExternal = [...new Set(externalImports.map(i => i.source || i.module))];
      for (const src of uniqueExternal.slice(0, 10)) {
        console.log(`      • ${src}`);
      }
    }
    
    // Exports del archivo
    const exports = fileData.exports || [];
    console.log(`\n📤 EXPORTS: ${exports.length}`);
    for (const exp of exports.slice(0, 10)) {
      console.log(`      • ${exp.name}`);
    }
    
    // UsedBy (quién importa este archivo)
    const usedBy = fileData.usedBy || fileData.dependsOn || [];
    console.log(`\n⚠️  USED BY (archivos que importan este): ${usedBy.length}`);
    for (const user of usedBy.slice(0, 10)) {
      console.log(`      • ${user}`);
    }
  }
  console.log(`\n📊 IMPACT MAP: ${filePath}`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();
  
  // Normalizar path
  filePath = filePath.replace(/\\/g, '/');
  
  // Átomos en el archivo
  const fileAtoms = Array.from(atoms.values()).filter(a => 
    a.filePath?.replace(/\\/g, '/') === filePath
  );
  
  if (fileAtoms.length === 0) {
    console.log('   ❌ Archivo no encontrado en átomos');
    console.log('   💡 Intenta con la ruta relativa: src/...');
    return null;
  }
  
  console.log(`\n📝 Átomos en archivo: ${fileAtoms.length}`);
  
  // Exportados
  const exported = fileAtoms.filter(a => a.isExported);
  console.log(`📤 Exportados (API): ${exported.length}`);
  
  // Callers de los exportados
  const allCallers = new Set();
  const callersByFile = {};
  
  for (const atom of exported) {
    for (const caller of (atom.calledBy || [])) {
      allCallers.add(caller);
      // Extraer archivo del caller
      const match = caller.match(/^(.+)::/);
      if (match) {
        const callerFile = match[1];
        if (!callersByFile[callerFile]) callersByFile[callerFile] = [];
        callersByFile[callerFile].push(caller);
      }
    }
  }
  
  console.log(`\n⚠️  ARCHIVOS DEPENDIENTES: ${Object.keys(callersByFile).length}`);
  
  const sorted = Object.entries(callersByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);
  
  for (const [file, callers] of sorted) {
    console.log(`   • ${file} (${callers.length} calls)`);
  }
  
  // Risk level
  const totalCallers = allCallers.size;
  const risk = totalCallers > 50 ? '🔴 ALTO' : totalCallers > 10 ? '🟡 MEDIO' : '🟢 BAJO';
  console.log(`\n🎯 RISK LEVEL: ${risk}`);
  console.log(`📊 Total callers: ${totalCallers}`);
  
  return { fileAtoms: fileAtoms.length, exported: exported.length, callers: totalCallers, risk };
}

/**
 * get_function_details - Detalles de una función
 */
async function tool_get_function_details(atomId) {
  console.log(`\n📊 FUNCTION DETAILS`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  // Buscar por ID o por nombre
  let atom = atoms.get(atomId);
  if (!atom) {
    // Buscar por nombre
    atom = Array.from(atoms.values()).find(a => 
      a.name === atomId || a.id?.includes(atomId)
    );
  }
  
  if (!atom) {
    console.log(`   ❌ Función no encontrada: ${atomId}`);
    console.log('   💡 Usa el ID completo o nombre de función');
    return null;
  }
  
  console.log(`\n📝 ID: ${atom.id}`);
  console.log(`   Nombre: ${atom.name}`);
  console.log(`   Archivo: ${atom.filePath}`);
  console.log(`   Línea: ${atom.line || 'N/A'}`);
  console.log(`   Tipo: ${atom.functionType || 'function'}`);
  console.log(`   Purpose: ${atom.purpose}`);
  console.log(`   Exportado: ${atom.isExported ? 'Sí' : 'No'}`);
  console.log(`   Async: ${atom.isAsync ? 'Sí' : 'No'}`);
  
  // Calls
  const calls = atom.calls || [];
  console.log(`\n📞 CALLS (${calls.length}):`);
  const uniqueCalls = [...new Set(calls.map(c => c.name))].slice(0, 10);
  for (const name of uniqueCalls) {
    console.log(`   → ${name}`);
  }
  if (calls.length > 10) console.log(`   ... y ${calls.length - 10} más`);
  
  // CalledBy
  const calledBy = atom.calledBy || [];
  console.log(`\n📥 CALLED BY (${calledBy.length}):`);
  for (const caller of calledBy.slice(0, 10)) {
    const match = caller.match(/::(.+)$/);
    console.log(`   ← ${match ? match[1] : caller}`);
  }
  if (calledBy.length > 10) console.log(`   ... y ${calledBy.length - 10} más`);
  
  // Data flow
  if (atom.dataFlow) {
    const inputs = atom.dataFlow.inputs || [];
    const outputs = atom.dataFlow.outputs || [];
    console.log(`\n🔄 DATA FLOW:`);
    console.log(`   Inputs: ${inputs.map(i => i.name).join(', ') || 'ninguno'}`);
    console.log(`   Outputs: ${outputs.length}`);
  }
  
  // Side effects
  if (atom.sideEffects?.length > 0) {
    console.log(`\n⚠️  SIDE EFFECTS: ${atom.sideEffects.join(', ')}`);
  }
  
  return atom;
}

/**
 * get_dead_code - Dead code real
 */
async function tool_get_dead_code() {
  console.log('\n📊 DEAD CODE REAL');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  const deadAtoms = Array.from(atoms.values()).filter(a => 
    a.purpose === 'DEAD_CODE' && (!a.calledBy || a.calledBy.length === 0)
  );
  
  console.log(`\n💀 Total dead code: ${deadAtoms.length}`);
  console.log(`📊 Porcentaje: ${((deadAtoms.length/atoms.size)*100).toFixed(2)}%`);
  
  // Agrupar por archivo
  const byFile = {};
  for (const atom of deadAtoms) {
    if (!byFile[atom.filePath]) byFile[atom.filePath] = [];
    byFile[atom.filePath].push(atom);
  }
  
  console.log(`\n📁 Top archivos con dead code:`);
  const sorted = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [file, atoms] of sorted) {
    console.log(`\n   ${file}: ${atoms.length} funciones`);
    for (const atom of atoms.slice(0, 3)) {
      console.log(`      - ${atom.name} (line ${atom.line || '?'})`);
    }
  }
  
  return deadAtoms;
}

/**
 * get_api_surface - API pública
 */
async function tool_get_api_surface() {
  console.log('\n📊 API SURFACE (Exportados)');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  const apiAtoms = Array.from(atoms.values()).filter(a => a.purpose === 'API_EXPORT');
  console.log(`\n📤 Total API exports: ${apiAtoms.length}`);
  
  // Por archivo
  const byFile = {};
  for (const atom of apiAtoms) {
    if (!byFile[atom.filePath]) byFile[atom.filePath] = [];
    byFile[atom.filePath].push(atom);
  }
  
  console.log(`\n📁 Top archivos por exports:`);
  const sorted = Object.entries(byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  for (const [file, atoms] of sorted) {
    console.log(`   ${file}: ${atoms.length} exports`);
  }
  
  // Hubs (más callers)
  console.log(`\n🌟 API HUBS (más usados):`);
  const hubs = apiAtoms
    .filter(a => a.calledBy && a.calledBy.length > 0)
    .sort((a, b) => b.calledBy.length - a.calledBy.length)
    .slice(0, 10);
  
  for (const atom of hubs) {
    console.log(`   ${atom.name}: ${atom.calledBy.length} callers`);
    console.log(`      ${atom.filePath}`);
  }
  
  return apiAtoms;
}

/**
 * get_cycles - Ciclos de dependencias
 */
async function tool_get_cycles() {
  console.log('\n📊 DEPENDENCY CYCLES');
  console.log('═'.repeat(70));
  
  const systemMap = await loadSystemMap();
  const files = systemMap.files || {};
  
  // Detectar ciclos simples
  const cycles = [];
  const visited = new Set();
  
  function findCycle(start, current, path) {
    if (visited.has(current)) return;
    if (path.length > 10) return; // Limit depth
    
    const file = files[current];
    if (!file) return;
    
    for (const imp of (file.imports || [])) {
      const dep = imp.source || imp.module;
      if (!dep || dep.startsWith('.') === false) continue; // External
      
      if (dep === start && path.length > 0) {
        cycles.push([...path, current, start]);
        return;
      }
      
      findCycle(start, dep, [...path, current]);
    }
  }
  
  for (const file of Object.keys(files).slice(0, 100)) {
    findCycle(file, file, []);
  }
  
  if (cycles.length === 0) {
    console.log('   ✅ No se detectaron ciclos simples');
  } else {
    console.log(`   ⚠️  ${cycles.length} ciclos potenciales detectados`);
    for (const cycle of cycles.slice(0, 5)) {
      console.log(`   → ${cycle.join(' → ')}`);
    }
  }
  
  return cycles;
}

/**
 * get_risk_files - Archivos de riesgo
 */
async function tool_get_risk_files() {
  console.log('\n📊 RISK FILES');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  // Hotspots (muchos callers)
  const hotspots = Array.from(atoms.values())
    .filter(a => a.calledBy && a.calledBy.length >= 5)
    .sort((a, b) => b.calledBy.length - a.calledBy.length)
    .slice(0, 10);
  
  console.log('\n🔥 HOTSPOTS (≥5 callers):');
  for (const atom of hotspots) {
    console.log(`   ${atom.name}: ${atom.calledBy.length} callers`);
    console.log(`      ${atom.filePath}`);
  }
  
  // Archivos con mucho dead code
  const byFile = {};
  for (const atom of atoms.values()) {
    if (atom.purpose === 'DEAD_CODE') {
      if (!byFile[atom.filePath]) byFile[atom.filePath] = 0;
      byFile[atom.filePath]++;
    }
  }
  
  const deadHeavy = Object.entries(byFile)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (deadHeavy.length > 0) {
    console.log('\n💀 ARCHIVOS CON MÁS DEAD CODE:');
    for (const [file, count] of deadHeavy) {
      console.log(`   ${file}: ${count} funciones muertas`);
    }
  }
  
  return { hotspots: hotspots.length, deadHeavy: deadHeavy.length };
}

/**
 * search_functions - Buscar funciones
 */
async function tool_search_functions(term) {
  console.log(`\n📊 SEARCH: "${term}"`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const termLower = term.toLowerCase();
  
  const matches = Array.from(atoms.values())
    .filter(a => 
      a.name?.toLowerCase().includes(termLower) ||
      a.filePath?.toLowerCase().includes(termLower)
    )
    .slice(0, 20);
  
  console.log(`\n🔍 Encontrados: ${matches.length}`);
  
  for (const atom of matches) {
    const callers = atom.calledBy?.length || 0;
    console.log(`   ${atom.name} [${atom.purpose}]`);
    console.log(`      ${atom.filePath} (${callers} callers)`);
  }
  
  return matches;
}

// ============================================================================
// CLI
// ============================================================================

async function printHelp() {
  console.log(`
📖 OMNY-TOOLS - Herramientas MCP Offline

Uso:
  node scripts/omny-tools.js                    # Menú interactivo
  node scripts/omny-tools.js status             # Estado del sistema
  node scripts/omny-tools.js impact <file>      # Impacto de archivo
  node scripts/omny-tools.js function <id>      # Detalles de función
  node scripts/omny-tools.js dead               # Dead code real
  node scripts/omny-tools.js api                # API surface
  node scripts/omny-tools.js cycles             # Ciclos de dependencias
  node scripts/omny-tools.js risk               # Archivos de riesgo
  node scripts/omny-tools.js search <term>      # Buscar funciones

Ejemplos:
  node scripts/omny-tools.js impact src/layer-a-static/indexer.js
  node scripts/omny-tools.js function indexProject
  node scripts/omny-tools.js search cache
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('\n🔧 OMNY-TOOLS - Herramientas MCP Offline');
  console.log('   Lee datos de .omnysysdata/ sin iniciar el servidor');
  
  switch (command) {
    case 'status':
      await tool_get_server_status();
      break;
    case 'impact':
      if (!args[1]) {
        console.log('   ❌ Falta archivo. Uso: omny-tools impact <file>');
        break;
      }
      await tool_get_impact_map(args[1]);
      break;
    case 'function':
      if (!args[1]) {
        console.log('   ❌ Falta ID. Uso: omny-tools function <id>');
        break;
      }
      await tool_get_function_details(args[1]);
      break;
    case 'dead':
      await tool_get_dead_code();
      break;
    case 'api':
      await tool_get_api_surface();
      break;
    case 'cycles':
      await tool_get_cycles();
      break;
    case 'risk':
      await tool_get_risk_files();
      break;
    case 'search':
      if (!args[1]) {
        console.log('   ❌ Falta término. Uso: omny-tools search <term>');
        break;
      }
      await tool_search_functions(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
      await printHelp();
      break;
    default:
      // Default: show status
      if (command) {
        console.log(`   ❌ Comando desconocido: ${command}`);
      }
      await printHelp();
      console.log('\n📊 Mostrando estado por defecto...\n');
      await tool_get_server_status();
  }
  
  console.log('\n');
}

main().catch(console.error);