/**
 * Tool: get_impact_map
 * Returns a complete impact map for a file
 */

import { getFileAnalysis, getFileDependents, getProjectMetadata } from '#layer-a/query/index.js';

export async function get_impact_map(args, context) {
  const { filePath } = args;
  const { orchestrator, projectPath, server } = context;
  
  console.error(`[Tool] get_impact_map("${filePath}")`);

  // Check if analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData) {
    // Si el servidor está inicializado, auto-analizar
    if (server?.initialized && orchestrator) {
      console.error(`  → File not analyzed, queueing as CRITICAL`);
      
      try {
        await orchestrator.analyzeAndWait(filePath, 60000);
        console.error(`  → Analysis completed`);
        fileData = await getFileAnalysis(projectPath, filePath);
      } catch (error) {
        return {
          status: 'analyzing',
          message: `File "${filePath}" is being analyzed as CRITICAL priority.`,
          estimatedTime: '30-60 seconds',
          suggestion: 'Please retry this query in a moment.'
        };
      }
    } else {
      return {
        status: 'not_ready',
        message: `File "${filePath}" not found in index. Server may still be initializing.`,
        suggestion: 'Please retry in a few seconds.'
      };
    }
  }

  // Obtener archivos que dependen de este (impacto directo)
  const directlyAffects = await getFileDependents(projectPath, filePath);
  
  // Obtener metadata para calcular impacto transitivo
  const metadata = await getProjectMetadata(projectPath);
  const allFiles = metadata?.fileIndex || {};
  
  // Calcular impacto transitivo (simplificado)
  const transitiveAffects = [];
  const visited = new Set();
  const queue = [...directlyAffects];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current) || current === filePath) continue;
    
    visited.add(current);
    if (!directlyAffects.includes(current)) {
      transitiveAffects.push(current);
    }
    
    // Obtener dependientes del dependiente
    const dependents = await getFileDependents(projectPath, current);
    for (const dep of dependents) {
      if (!visited.has(dep)) {
        queue.push(dep);
      }
    }
  }

  return {
    file: filePath,
    directlyAffects: directlyAffects || [],
    transitiveAffects: transitiveAffects.slice(0, 20), // Limitar para no sobrecargar
    semanticConnections: fileData?.semanticConnections || [],
    totalAffected: directlyAffects.length + transitiveAffects.length,
    riskLevel: fileData?.riskScore?.severity || 'low',
    subsystem: fileData?.subsystem || 'unknown',
    exports: fileData?.exports?.map(e => e.name) || []
  };
}
