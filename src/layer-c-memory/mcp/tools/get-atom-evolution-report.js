import path from 'path';

import { BaseMCPTool } from '../core/shared/base-tools/base-tool.js';
import { loadAtomVersionArchiveHistory } from '#shared/compiler/index.js';
import {
  collectAtomHistory,
  summarizeAtomDNA,
  summarizeAtomDataFlow,
  summarizeAtomHistory
} from './atom-history-helpers.js';

function compactNames(items = [], limit = 10) {
  return items
    .filter(Boolean)
    .map((item) => (typeof item === 'string' ? item : item.name || item.filePath || item.file || item.id || 'unknown'))
    .slice(0, limit);
}

function buildCurrentAtomSnapshot(atom = {}) {
  const dna = summarizeAtomDNA(atom.dna || atom.metadata?.dna || {});
  const dataFlow = summarizeAtomDataFlow(atom.dataFlow || {});

  return {
    id: atom.id || null,
    name: atom.name || null,
    filePath: atom.filePath || atom.file_path || null,
    line: atom.line || atom.lineStart || null,
    type: atom.type || atom.atomType || null,
    functionType: atom.functionType || atom.function_type || null,
    archetype: atom.archetype || null,
    purpose: atom.purpose || null,
    params: Array.isArray(atom.params) ? atom.params : [],
    exports: !!(atom.isExported || atom.exports),
    isAsync: !!(atom.isAsync || atom.is_async),
    complexity: atom.complexity ?? atom.derived?.complexity ?? null,
    linesOfCode: atom.linesOfCode ?? atom.derived?.linesOfCode ?? null,
    dna,
    dataFlow,
    coverage: {
      hasDNA: !!dna?.structuralHash,
      hasDataFlow: !!(dataFlow?.inputCount || dataFlow?.outputCount || dataFlow?.transformationCount),
      hasImports: Array.isArray(atom.imports) && atom.imports.length > 0,
      hasCalledBy: Array.isArray(atom.calledBy) && atom.calledBy.length > 0,
      hasCalls: Array.isArray(atom.calls) && atom.calls.length > 0
    }
  };
}

function buildSignals({ currentAtom, impact, historySummary, databaseSchema }) {
  const signals = [];

  if (currentAtom.coverage.hasDNA) signals.push('dna-covered');
  else signals.push('dna-missing');

  if (currentAtom.coverage.hasDataFlow) signals.push('data-flow-covered');
  else signals.push('data-flow-missing');

  if (historySummary.gitVersionCount > 0 || historySummary.archiveVersionCount > 0) {
    signals.push('evolution-history-present');
  } else {
    signals.push('evolution-history-missing');
  }

  if (impact?.severity) signals.push(`impact-${impact.severity}`);
  if (databaseSchema?.health?.status) signals.push(`db-${databaseSchema.health.status}`);

  return signals;
}

function buildSchemaContext(databaseSchema, currentAtom) {
  if (!databaseSchema) return null;

  return {
    database: {
      health: databaseSchema.health,
      summary: databaseSchema.summary,
      historicalStores: databaseSchema.historicalStores || null,
      recommendations: databaseSchema.recommendations
    },
    currentAtom: {
      coverage: currentAtom.coverage,
      dnaCoverage: currentAtom.coverage.hasDNA ? 'present' : 'missing',
      dataFlowCoverage: currentAtom.coverage.hasDataFlow ? 'present' : 'missing'
    }
  };
}

function computeCoherenceScore({ currentAtom, historySummary, impact, databaseSchema }) {
  const checks = [
    !!currentAtom,
    !!currentAtom?.dna,
    !!currentAtom?.dataFlow,
    historySummary.gitVersionCount > 0 || historySummary.archiveVersionCount > 0,
    !!impact,
    !!databaseSchema
  ];

  const positive = checks.filter(Boolean).length;
  return Math.round((positive / checks.length) * 100) / 100;
}

async function runAtomEvolutionReportBoundary(context, work) {
  try {
    return await work();
  } catch (error) {
    return {
      error: error?.message || 'Unexpected atom evolution report failure',
      boundary: 'atom_evolution_report',
      source: context?.source || 'unknown',
      details: {
        filePath: context?.filePath || null,
        symbolName: context?.symbolName || null
      }
    };
  }
}

export async function buildAtomEvolutionReport(args, deps = {}) {
  const {
    projectPath,
    filePath,
    symbolName,
    limit = 10,
    includeImpact = true,
    includeHistory = true,
    includeSystemContext = true
  } = args;

  if (!symbolName || !filePath) {
    return {
      error: 'symbolName and filePath are required'
    };
  }

  const rootPath = projectPath || process.cwd();
  const getAtomDetailsImpl = deps.getAtomDetails ?? (await import('../../query/queries/file-query/atoms/atom-query.js')).getAtomDetails;
  const getFileImpactSummaryImpl = deps.getFileImpactSummary ?? (await import('../../query/queries/dependency-query.js')).getFileImpactSummary;
  const collectAtomHistoryImpl = deps.collectAtomHistory ?? collectAtomHistory;
  const buildDatabaseSchemaResultImpl = deps.buildDatabaseSchemaResult
    ?? (await import('./get-schema-helpers.js')).buildDatabaseSchemaResult;

  return runAtomEvolutionReportBoundary({
    source: 'buildAtomEvolutionReport',
    filePath,
    symbolName
  }, async () => {
    const atom = await getAtomDetailsImpl(rootPath, filePath, symbolName, deps.cache ?? null);
    if (!atom) {
      return {
        error: `Symbol ${symbolName} not found in ${filePath}`
      };
    }

    const currentAtom = buildCurrentAtomSnapshot(atom);
    const [impactResult, historyBundleResult, databaseSchemaResult] = await Promise.allSettled([
      includeImpact ? getFileImpactSummaryImpl(rootPath, filePath, { includeSemantic: true }) : Promise.resolve(null),
      includeHistory ? collectAtomHistoryImpl({
        projectPath: rootPath,
        filePath,
        symbolName,
        limit
      }, {
        logger: deps.logger,
        GitTerminalBridgeClass: deps.GitTerminalBridgeClass,
        loadArchiveHistory: deps.loadArchiveHistory || loadAtomVersionArchiveHistory
      }) : Promise.resolve(null),
      includeSystemContext ? buildDatabaseSchemaResultImpl({ includeSQL: false, projectPath }) : Promise.resolve(null)
    ]);

    const impact = impactResult.status === 'fulfilled' ? impactResult.value : null;
    const historyBundle = historyBundleResult.status === 'fulfilled' ? historyBundleResult.value : null;
    const databaseSchema = databaseSchemaResult.status === 'fulfilled' ? databaseSchemaResult.value : null;
    const historySummary = includeHistory
      ? summarizeAtomHistory(historyBundle?.history || [], historyBundle?.archiveHistory || [])
      : summarizeAtomHistory([], []);

    const report = {
      correlationId: `${path.isAbsolute(filePath) ? filePath : path.resolve(rootPath, filePath)}#${symbolName}`,
      input: {
        symbolName,
        filePath,
        limit,
        includeImpact,
        includeHistory,
        includeSystemContext
      },
      results: {
        atom: currentAtom,
        impact: impact || null,
        history: includeHistory
          ? {
              ...historySummary,
              versions: historyBundle?.history?.map((v) => ({
                commit: v.hash?.substring?.(0, 7) || null,
                author: v.author || null,
                date: v.date || null,
                summary: v.subject || v.summary || null,
                snippet: v.codeSnippet || null
              })) || [],
              archiveVersions: historyBundle?.archiveHistory?.map((row) => ({
                versionHash: row.version_hash,
                atomId: row.atom_id,
                atomName: row.atom_name,
                filePath: row.file_path,
                capturedAt: row.captured_at,
                source: row.source,
                fieldHashes: JSON.parse(row.field_hashes_json || '{}')
              })) || []
            }
          : {
              ...historySummary,
              versions: [],
              archiveVersions: []
            },
        systemContext: includeSystemContext ? buildSchemaContext(databaseSchema, currentAtom) : null,
        signals: buildSignals({
          currentAtom,
          impact,
          historySummary,
          databaseSchema
        }),
        ramifications: {
          directDependents: impact?.directDependents || [],
          transitiveDependents: impact?.transitiveDependents || [],
          highFragilityAtoms: compactNames(impact?.highFragilityAtoms || [], 12)
        }
      },
      metadata: {
        engine: 'atom-evolution-report-v1',
        coherenceScore: computeCoherenceScore({
          currentAtom,
          historySummary,
          impact,
          databaseSchema
        }),
        timestamp: new Date().toISOString()
      }
    };

    return report;
  });
}

export class AtomEvolutionReportTool extends BaseMCPTool {
  constructor() {
    super('query:atom-evolution-report');
  }

  async performAction(args) {
    const report = await buildAtomEvolutionReport({
      ...args,
      projectPath: this.projectPath || process.cwd()
    }, {
      logger: this.logger
    });

    if (report.error) {
      return this.formatError('ATOM_EVO_FAILED', report.error);
    }

    return this.formatSuccess(report);
  }
}

export const get_atom_evolution_report = async (args, context) => {
  const tool = new AtomEvolutionReportTool();
  return tool.execute(args, context);
};

export default { get_atom_evolution_report, buildAtomEvolutionReport };
