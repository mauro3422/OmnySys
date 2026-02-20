/**
 * Tool: get_impact_map
 * Returns a complete impact map for a file
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';
import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:impact:map');



export async function get_impact_map(args, context) {
  const { filePath } = args;
  const { orchestrator, projectPath, server } = context;
  
  logger.info(`[Tool] get_impact_map("${filePath}")`);

  // Check if analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData) {
    // Si el servidor está inicializado, auto-analizar
    if (server?.initialized && orchestrator) {
      logger.error(`  → File not analyzed, queueing as CRITICAL`);
      
      try {
        await orchestrator.analyzeAndWait(filePath, 60000);
        logger.error(`  → Analysis completed`);
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

  // Procesar imports
  const imports = fileData?.imports || [];
  const internalImports = imports.filter(i => {
    const src = i.source || i.module || '';
    return src.startsWith('./') || src.startsWith('../') || src.startsWith('#');
  });
  const externalImports = imports.filter(i => {
    const src = i.source || i.module || '';
    return !src.startsWith('./') && !src.startsWith('../') && !src.startsWith('#');
  });

  return {
    file: filePath,
    // IMPORTS (qué necesita este archivo)
    imports: {
      total: imports.length,
      internal: internalImports.map(i => ({
        source: i.source || i.module,
        names: i.specifiers?.map(s => s.local) || ['*']
      })).slice(0, 20),
      external: externalImports.map(i => i.source || i.module).slice(0, 10)
    },
    // EXPORTS (qué provee)
    exports: fileData?.exports?.map(e => e.name) || [],
    definitions: fileData?.definitions?.map(d => ({
      name: d.name,
      type: d.type,
      line: d.line
    })) || [],
    // IMPACTO (quién depende de este)
    directlyAffects: directlyAffects || [],
    transitiveAffects: transitiveAffects.slice(0, 20),
    totalAffected: directlyAffects.length + transitiveAffects.length,
    // ANÁLISIS SEMÁNTICO
    semanticConnections: (fileData?.semanticConnections || []).slice(0, 10),
    semanticAnalysis: {
      events: fileData?.semanticAnalysis?.events?.all?.slice(0, 10) || [],
      localStorage: fileData?.semanticAnalysis?.localStorage?.all || [],
      globals: fileData?.semanticAnalysis?.globals?.all || []
    },
    // RIESGO
    riskLevel: fileData?.riskScore?.severity || 'low',
    riskScore: fileData?.riskScore?.total || 0,
    subsystem: fileData?.subsystem || 'unknown',
    culture: fileData?.culture || 'unknown'
  };
}
