/**
 * Tool: get_impact_map
 * Returns a complete impact map for a file
 */

import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:impact:map');

const ANALYZABLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.tsx',
  '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.swift', '.php'
]);

// Private helpers

function isAnalyzableCodeFile(filePath = '') {
  if (typeof filePath !== 'string' || filePath.length === 0) return false;
  const idx = filePath.lastIndexOf('.');
  if (idx < 0) return false;
  const ext = filePath.slice(idx).toLowerCase();
  return ANALYZABLE_EXTENSIONS.has(ext);
}

async function ensureFileData(filePath, fileData, server, orchestrator, projectPath, options = {}) {
  const {
    autoAnalyzeMissing = false,
    autoAnalyzeTimeoutMs = 60000
  } = options;

  if (fileData) return { fileData, earlyReturn: null };

  if (server?.initialized && !autoAnalyzeMissing) {
    return {
      fileData: null,
      earlyReturn: {
        status: 'not_analyzed',
        message: `File "${filePath}" is not in current analysis index.`,
        suggestion: 'Read-only mode by default. Pass autoAnalyzeMissing=true to force on-demand analysis.'
      }
    };
  }

  if (server?.initialized && orchestrator) {
    if (!isAnalyzableCodeFile(filePath)) {
      return {
        fileData: null,
        earlyReturn: {
          status: 'not_supported',
          message: `File "${filePath}" is not an analyzable source file.`,
          suggestion: 'Use source code files (js/ts/py/etc.) for on-demand analysis.'
        }
      };
    }

    logger.info('  -> File not analyzed, queueing as CRITICAL (autoAnalyzeMissing=true)');

    try {
      await orchestrator.analyzeAndWait(filePath, autoAnalyzeTimeoutMs);
      logger.info('  -> Analysis completed');
      return {
        fileData: await getFileAnalysis(projectPath, filePath),
        earlyReturn: null
      };
    } catch {
      return {
        fileData: null,
        earlyReturn: {
          status: 'analyzing',
          message: `File "${filePath}" is being analyzed as CRITICAL priority.`,
          estimatedTime: '30-60 seconds',
          suggestion: 'Please retry this query in a moment.'
        }
      };
    }
  }

  return {
    fileData: null,
    earlyReturn: {
      status: 'not_ready',
      message: `File "${filePath}" not found in index. Server may still be initializing.`,
      suggestion: 'Please retry in a few seconds.'
    }
  };
}

async function collectTransitiveAffects(directlyAffects, filePath, projectPath) {
  const transitiveAffects = [];
  const visited = new Set();
  const queue = [...directlyAffects];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current) || current === filePath) continue;

    visited.add(current);
    if (!directlyAffects.includes(current)) transitiveAffects.push(current);

    const dependents = await getFileDependents(projectPath, current);
    for (const dep of dependents) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }

  return transitiveAffects;
}

function classifyImports(imports) {
  const isInternal = (src) => src.startsWith('./') || src.startsWith('../') || src.startsWith('#');
  const internal = imports.filter((i) => isInternal(i.source || i.module || ''));
  const external = imports.filter((i) => !isInternal(i.source || i.module || ''));
  return { internal, external };
}

export async function get_impact_map(args, context) {
  const {
    filePath,
    autoAnalyzeMissing = false,
    autoAnalyzeTimeoutMs = 60000
  } = args || {};

  const { orchestrator, projectPath, server } = context;

  logger.info(`[Tool] get_impact_map("${filePath}")`);

  const raw = await getFileAnalysis(projectPath, filePath);
  const { fileData, earlyReturn } = await ensureFileData(
    filePath,
    raw,
    server,
    orchestrator,
    projectPath,
    { autoAnalyzeMissing, autoAnalyzeTimeoutMs }
  );

  if (earlyReturn) return earlyReturn;

  const directlyAffects = await getFileDependents(projectPath, filePath);
  const transitiveAffects = await collectTransitiveAffects(directlyAffects, filePath, projectPath);

  const allImports = fileData?.imports || [];
  const { internal, external } = classifyImports(allImports);

  return {
    file: filePath,
    imports: {
      total: allImports.length,
      internal: internal
        .map((i) => ({
          source: i.source || i.module,
          names: i.specifiers?.map((s) => s.local) || ['*']
        }))
        .slice(0, 20),
      external: external.map((i) => i.source || i.module).slice(0, 10)
    },
    exports: fileData?.exports?.map((e) => e.name) || [],
    definitions: fileData?.definitions?.map((d) => ({ name: d.name, type: d.type, line: d.line })) || [],
    directlyAffects: directlyAffects || [],
    transitiveAffects: transitiveAffects.slice(0, 20),
    totalAffected: directlyAffects.length + transitiveAffects.length,
    semanticConnections: (fileData?.semanticConnections || []).slice(0, 10),
    semanticAnalysis: {
      events: fileData?.semanticAnalysis?.events?.all?.slice(0, 10) || [],
      localStorage: fileData?.semanticAnalysis?.localStorage?.all || [],
      globals: fileData?.semanticAnalysis?.globals?.all || []
    },
    riskLevel: fileData?.riskScore?.severity || 'low',
    riskScore: fileData?.riskScore?.total || 0,
    subsystem: fileData?.subsystem || 'unknown',
    culture: fileData?.culture || 'unknown'
  };
}
