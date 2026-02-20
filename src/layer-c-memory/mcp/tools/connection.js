/**
 * Tool: explain_connection
 * Explains why two files are connected
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:connection');



export async function explain_connection(args, context) {
  const { fileA, fileB } = args;
  const { orchestrator, projectPath, server } = context;
  
  logger.error(`[Tool] explain_connection("${fileA}", "${fileB}")`);

  // Obtener datos de ambos archivos
  let fileDataA = await getFileAnalysis(projectPath, fileA);
  let fileDataB = await getFileAnalysis(projectPath, fileB);
  
  if (!fileDataA || !fileDataB) {
    return {
      fileA,
      fileB,
      connected: false,
      reason: 'One or both files not found in index',
      suggestion: 'Files may not be analyzed yet'
    };
  }

  const connections = [];
  
  // 1. Verificar dependencia directa (A importa B o B importa A)
  const aImportsB = fileDataA.imports?.some(imp => imp.source === fileB);
  const bImportsA = fileDataB.imports?.some(imp => imp.source === fileA);
  
  if (aImportsB) {
    connections.push({
      type: 'import',
      direction: `${fileA} → imports → ${fileB}`,
      reason: `${fileA} imports ${fileB}`
    });
  }
  
  if (bImportsA) {
    connections.push({
      type: 'import',
      direction: `${fileB} → imports → ${fileA}`,
      reason: `${fileB} imports ${fileA}`
    });
  }
  
  // 2. Verificar si A es usado por B
  const dependentsA = await getFileDependents(projectPath, fileA);
  if (dependentsA.includes(fileB)) {
    connections.push({
      type: 'usage',
      direction: `${fileB} → uses → ${fileA}`,
      reason: `${fileB} uses exports from ${fileA}`
    });
  }
  
  // 3. Verificar si B es usado por A
  const dependentsB = await getFileDependents(projectPath, fileB);
  if (dependentsB.includes(fileA)) {
    connections.push({
      type: 'usage',
      direction: `${fileA} → uses → ${fileB}`,
      reason: `${fileA} uses exports from ${fileB}`
    });
  }
  
  // 4. Buscar conexiones semánticas
  const semanticA = fileDataA.semanticConnections || [];
  const semanticB = fileDataB.semanticConnections || [];
  
  // Buscar conexiones donde ambos archivos participan
  for (const conn of semanticA) {
    if (conn.targetFile === fileB || conn.sourceFile === fileB) {
      connections.push({
        type: conn.type || 'semantic',
        direction: `${conn.sourceFile} → ${conn.type} → ${conn.targetFile}`,
        reason: conn.reason || conn.via || 'Semantic connection detected',
        confidence: conn.confidence
      });
    }
  }
  
  // 5. Buscar eventos compartidos
  const eventsA = fileDataA.semanticAnalysis?.eventPatterns?.eventListeners || [];
  const eventsB = fileDataB.semanticAnalysis?.eventPatterns?.eventListeners || [];
  
  for (const eventA of eventsA) {
    for (const eventB of eventsB) {
      if (eventA.event === eventB.event) {
        connections.push({
          type: 'shared-event',
          event: eventA.event,
          reason: `Both files use event '${eventA.event}'`,
          direction: 'bidirectional'
        });
      }
    }
  }

  // 6. Buscar puente indirecto: archivo C que importe A y llame métodos de B (o viceversa)
  // Caso típico: mixin pattern — index.js hace `import * as A` + `Object.assign(X, A)`,
  // y B llama `this.fn()` donde fn viene de A.
  if (connections.length === 0) {
    try {
      const { getAllAtoms } = await import('#layer-c/storage/atoms/atom.js');
      const allAtoms = await getAllAtoms(projectPath);

      // Átomos de A y B para buscar calledBy cruzado
      const atomsA = allAtoms.filter(a => a.filePath === fileA || a.filePath?.endsWith('/' + fileA));
      const atomsB = allAtoms.filter(a => a.filePath === fileB || a.filePath?.endsWith('/' + fileB));

      // Callers de funciones de A que vengan de B (o viceversa)
      const callersOfA = new Set(atomsA.flatMap(a => a.calledBy || []));
      const callersOfB = new Set(atomsB.flatMap(a => a.calledBy || []));

      // Buscar IDs de atoms de B que llaman a A
      const bCallsA = atomsB.some(a => {
        const id = a.id || `${a.filePath}::${a.name}`;
        return callersOfA.has(id);
      });
      const aCallsB = atomsA.some(a => {
        const id = a.id || `${a.filePath}::${a.name}`;
        return callersOfB.has(id);
      });

      if (bCallsA) {
        connections.push({
          type: 'mixin-call',
          direction: `${fileB} → calls (via this.*) → ${fileA}`,
          reason: `${fileB} calls functions defined in ${fileA} via mixin/prototype delegation`,
          confidence: 0.9
        });
      }
      if (aCallsB) {
        connections.push({
          type: 'mixin-call',
          direction: `${fileA} → calls (via this.*) → ${fileB}`,
          reason: `${fileA} calls functions defined in ${fileB} via mixin/prototype delegation`,
          confidence: 0.9
        });
      }

      // Buscar archivo puente: C que importe A y también importe B
      if (connections.length === 0) {
        const importsA = fileDataA.imports?.map(i => i.source || i.resolvedPath) || [];
        const importsB = fileDataB.imports?.map(i => i.source || i.resolvedPath) || [];
        const sharedImports = importsA.filter(i => importsB.includes(i));
        if (sharedImports.length > 0) {
          connections.push({
            type: 'shared-dependency',
            direction: `${fileA} ← ${sharedImports[0]} → ${fileB}`,
            reason: `Both files import from '${sharedImports[0]}'`,
            sharedModules: sharedImports.slice(0, 3),
            confidence: 0.7
          });
        }
      }
    } catch {
      // silencioso si falla
    }
  }

  if (connections.length === 0) {
    return {
      fileA,
      fileB,
      connected: false,
      reason: 'No direct connections found',
      fileAExports: fileDataA.exports?.map(e => e.name) || [],
      fileBExports: fileDataB.exports?.map(e => e.name) || []
    };
  }

  return {
    fileA,
    fileB,
    connected: true,
    connectionCount: connections.length,
    connections: connections.slice(0, 10),
    summary: `Found ${connections.length} connection(s) between the files`
  };
}
