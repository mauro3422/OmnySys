/**
 * Tool: explain_connection
 * Explains why two files are connected
 */

import { getFileAnalysis, getFileDependents } from '#layer-a/query/index.js';
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
