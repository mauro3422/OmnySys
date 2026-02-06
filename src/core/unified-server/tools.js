import {
  getFileDependencies,
  getFileAnalysis,
  getAllConnections,
  getRiskAssessment,
  getProjectMetadata,
  findFiles
} from '../../layer-a-static/query/index.js';

// ============================================================
// MCP Tools (for Claude Code)
// ============================================================

export async function getImpactMap(filePath) {
  const cached = this.cache.ramCacheGet(`impact:${filePath}`);
  if (cached) return cached;

  try {
    const deps = await getFileDependencies(this.projectPath, filePath);
    const fileData = await getFileAnalysis(this.projectPath, filePath);

    const result = {
      file: filePath,
      directlyAffects: deps.usedBy || [],
      transitiveAffects: deps.transitiveDependents || [],
      semanticConnections: fileData.semanticConnections || [],
      totalAffected:
        (deps.usedBy?.length || 0) +
        (deps.transitiveDependents?.length || 0) +
        (fileData.semanticConnections?.length || 0),
      riskLevel: fileData.riskScore?.severity || 'unknown',
      subsystem: fileData.subsystem
    };

    this.cache.ramCacheSet(`impact:${filePath}`, result);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

export async function analyzeChange(filePath, symbolName) {
  try {
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    const symbol = fileData.exports?.find((e) => e.name === symbolName);

    if (!symbol) {
      return { error: `Symbol '${symbolName}' not found in ${filePath}` };
    }

    const impactMap = await this.getImpactMap(filePath);

    return {
      symbol: symbolName,
      file: filePath,
      symbolType: symbol.kind,
      directDependents: impactMap.directlyAffects,
      transitiveDependents: impactMap.transitiveAffects,
      riskLevel: fileData.riskScore?.severity,
      recommendation: fileData.riskScore?.severity === 'critical'
        ? 'âš ï¸ HIGH RISK - This change affects many files'
        : 'âœ“ Safe - Limited scope'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function explainConnection(fileA, fileB) {
  try {
    const connections = this.cache.ramCacheGet('connections') ||
      await getAllConnections(this.projectPath);

    const relevant = connections.sharedState
      ?.filter(
        (c) =>
          (c.sourceFile === fileA && c.targetFile === fileB) ||
          (c.sourceFile === fileB && c.targetFile === fileA)
      )
      .slice(0, 5);

    if (!relevant || relevant.length === 0) {
      return { fileA, fileB, connected: false, reason: 'No direct connections found' };
    }

    return {
      fileA,
      fileB,
      connected: true,
      connections: relevant.map((c) => ({
        type: c.type,
        property: c.globalProperty,
        reason: c.reason,
        severity: c.severity
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getRisk(minSeverity = 'medium') {
  try {
    const assessment = this.cache.ramCacheGet('assessment') ||
      await getRiskAssessment(this.projectPath);

    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity];

    const filtered = assessment.report.mediumRiskFiles
      ?.concat(assessment.report.highRiskFiles || [])
      .filter((f) => severityOrder[f.severity] >= minLevel)
      .slice(0, 10);

    return {
      summary: assessment.report.summary,
      topRiskFiles: filtered,
      recommendation: assessment.report.summary.criticalCount > 0
        ? 'ðŸš¨ Critical issues detected - Review high-risk files'
        : 'âœ“ Risk levels acceptable'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function searchFiles(pattern) {
  try {
    const results = await findFiles(this.projectPath, pattern);
    return { pattern, found: results.length, files: results.slice(0, 20) };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================
// Status & Reporting
// ============================================================

export async function getFullStatus() {
  return {
    server: {
      version: '2.0.0',
      initialized: this.initialized,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      ports: this.ports
    },
    orchestrator: {
      status: this.isRunning ? 'running' : 'paused',
      currentJob: this.currentJob,
      queue: this.queue.getAll(),
      stats: this.stats
    },
    project: {
      path: this.projectPath,
      totalFiles: this.metadata?.metadata?.totalFiles || 0,
      totalFunctions: this.metadata?.metadata?.totalFunctions || 0
    },
    cache: this.cache.getCacheStats()
  };
}

export async function getFilesStatus() {
  try {
    const metadata = await getProjectMetadata(this.projectPath);
    const files = Object.keys(metadata.files || {}).map(filePath => ({
      path: filePath,
      analyzed: true,
      riskScore: metadata.files[filePath].riskScore?.total || 0,
      riskSeverity: metadata.files[filePath].riskScore?.severity || 'low',
      exports: metadata.files[filePath].exports?.length || 0,
      imports: metadata.files[filePath].imports?.length || 0,
      subsystem: metadata.files[filePath].subsystem
    }));

    return { files, total: files.length };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getFileTool(filePath) {
  try {
    const fileData = await getFileAnalysis(this.projectPath, filePath);
    return {
      path: filePath,
      exists: !!fileData,
      analysis: fileData
    };
  } catch (error) {
    return { error: error.message };
  }
}
