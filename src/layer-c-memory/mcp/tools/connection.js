/**
 * Tool: explain_connection
 * Explains why two files are connected
 * 
 * USA el módulo estándar de enrichment para relaciones.
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';
import { enrichAtomsWithRelations, enrichAtomsForFile } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:connection');

// ── Private helpers ───────────────────────────────────────────────────────────

function checkDirectImports(fileDataA, fileDataB, fileA, fileB) {
  const results = [];
  if (fileDataA.imports?.some(imp => imp.source === fileB))
    results.push({ type: 'import', direction: `${fileA} → imports → ${fileB}`, reason: `${fileA} imports ${fileB}` });
  if (fileDataB.imports?.some(imp => imp.source === fileA))
    results.push({ type: 'import', direction: `${fileB} → imports → ${fileA}`, reason: `${fileB} imports ${fileA}` });
  return results;
}

async function checkDependencyUsage(projectPath, fileA, fileB) {
  const results = [];
  const dependentsA = await getFileDependents(projectPath, fileA);
  const dependentsB = await getFileDependents(projectPath, fileB);
  if (dependentsA.includes(fileB))
    results.push({ type: 'usage', direction: `${fileB} → uses → ${fileA}`, reason: `${fileB} uses exports from ${fileA}` });
  if (dependentsB.includes(fileA))
    results.push({ type: 'usage', direction: `${fileA} → uses → ${fileB}`, reason: `${fileA} uses exports from ${fileB}` });
  return results;
}

function checkSemanticConnections(fileDataA, fileA, fileB) {
  return (fileDataA.semanticConnections || [])
    .filter(conn => conn.targetFile === fileB || conn.sourceFile === fileB)
    .map(conn => ({
      type: conn.type || 'semantic',
      direction: `${conn.sourceFile} → ${conn.type} → ${conn.targetFile}`,
      reason: conn.reason || conn.via || 'Semantic connection detected',
      confidence: conn.confidence
    }));
}

function checkSharedEvents(fileDataA, fileDataB) {
  const eventsA = fileDataA.semanticAnalysis?.eventPatterns?.eventListeners || [];
  const eventsB = fileDataB.semanticAnalysis?.eventPatterns?.eventListeners || [];
  const results = [];
  for (const eA of eventsA) {
    for (const eB of eventsB) {
      if (eA.event === eB.event)
        results.push({ type: 'shared-event', event: eA.event, reason: `Both files use event '${eA.event}'`, direction: 'bidirectional' });
    }
  }
  return results;
}

async function checkAtomCallGraph(projectPath, fileDataA, fileDataB, fileA, fileB) {
  const results = [];
  try {
    // Usar enrichment para obtener relaciones eficientemente
    const atomsA = await enrichAtomsForFile([], projectPath);
    const atomsB = await enrichAtomsForFile([], projectPath);
    
    // Obtener átomos de cada archivo usando repo directamente
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    
    let allAtomsA = [];
    let allAtomsB = [];
    
    if (repo && repo.db) {
      const atoms = repo.db.prepare(`
        SELECT id, name, file_path FROM atoms 
        WHERE file_path = ? OR file_path LIKE ?
      `).all(fileA, `%/${fileA}`);
      
      allAtomsA = atoms.filter(a => a.file_path === fileA || a.file_path?.endsWith('/' + fileA));
      allAtomsB = atoms.filter(a => a.file_path === fileB || a.file_path?.endsWith('/' + fileB));
    }
    
    const atomsAData = await enrichAtomsWithRelations(allAtomsA, {
      scope: 'ids',
      ids: allAtomsA.map(a => a.id),
      withStats: true,
      withCallers: true
    }, projectPath);
    
    const atomsBData = await enrichAtomsWithRelations(allAtomsB, {
      scope: 'ids', 
      ids: allAtomsB.map(a => a.id),
      withStats: true,
      withCallers: true
    }, projectPath);
    
    const callersOfA = new Set(atomsAData.flatMap(a => a.callers || []));
    const callersOfB = new Set(atomsBData.flatMap(a => a.callers || []));

    if (atomsB.some(a => callersOfA.has(a.id || `${a.filePath}::${a.name}`)))
      results.push({ type: 'mixin-call', direction: `${fileB} → calls (via this.*) → ${fileA}`, reason: `${fileB} calls functions defined in ${fileA} via mixin/prototype delegation`, confidence: 0.9 });
    if (atomsA.some(a => callersOfB.has(a.id || `${a.filePath}::${a.name}`)))
      results.push({ type: 'mixin-call', direction: `${fileA} → calls (via this.*) → ${fileB}`, reason: `${fileA} calls functions defined in ${fileB} via mixin/prototype delegation`, confidence: 0.9 });

    if (results.length === 0) {
      const importsA = fileDataA.imports?.map(i => i.source || i.resolvedPath) || [];
      const importsB = fileDataB.imports?.map(i => i.source || i.resolvedPath) || [];
      const sharedImports = importsA.filter(i => importsB.includes(i));
      if (sharedImports.length > 0)
        results.push({ type: 'shared-dependency', direction: `${fileA} ← ${sharedImports[0]} → ${fileB}`, reason: `Both files import from '${sharedImports[0]}'`, sharedModules: sharedImports.slice(0, 3), confidence: 0.7 });
    }
  } catch { /* silencioso si falla */ }
  return results;
}

export async function explain_connection(args, context) {
  const { fileA, fileB } = args;
  const { projectPath } = context;
  logger.error(`[Tool] explain_connection("${fileA}", "${fileB}")`);

  const fileDataA = await getFileAnalysis(projectPath, fileA);
  const fileDataB = await getFileAnalysis(projectPath, fileB);

  if (!fileDataA || !fileDataB) {
    return { fileA, fileB, connected: false, reason: 'One or both files not found in index', suggestion: 'Files may not be analyzed yet' };
  }

  const connections = [
    ...checkDirectImports(fileDataA, fileDataB, fileA, fileB),
    ...await checkDependencyUsage(projectPath, fileA, fileB),
    ...checkSemanticConnections(fileDataA, fileA, fileB),
    ...checkSharedEvents(fileDataA, fileDataB)
  ];

  // Fallback: búsqueda profunda por atom call graph solo si no hay conexiones simples
  if (connections.length === 0) {
    connections.push(...await checkAtomCallGraph(projectPath, fileDataA, fileDataB, fileA, fileB));
  }

  if (connections.length === 0) {
    return { fileA, fileB, connected: false, reason: 'No direct connections found', fileAExports: fileDataA.exports?.map(e => e.name) || [], fileBExports: fileDataB.exports?.map(e => e.name) || [] };
  }

  return { fileA, fileB, connected: true, connectionCount: connections.length, connections: connections.slice(0, 10), summary: `Found ${connections.length} connection(s) between the files` };
}
