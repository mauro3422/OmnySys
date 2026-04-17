import { getAllAtoms } from '../../../storage/index.js';
import { getFieldToolCoverage, getAvailableFields } from '#layer-a/extractors/metadata/registry.js';
import { getDatabase } from '../../../storage/database/connection.js';
import { getRepository, RepositoryFactory } from '../../../storage/repository/repository-factory.js';
import {
  getRegisteredTables,
  getTableDefinition,
  getTableColumns,
  generateSchemaReport,
  exportSchemaSQL
} from '../../../storage/database/schema-registry/index.js';
import {
  buildCompilerHistoricalStorageSummary,
  buildCompilerControlPlaneFoundations,
  compactDatabaseHealth,
  getDatabaseHealthSummary,
  summarizeDataGatewayContract,
  summarizeAtomSemanticPurity,
  summarizeAtomTestability
} from '../../../../shared/compiler/index.js';
import { getDatabaseSchemaStatus } from './database-schema-status.js';
import { deriveSchema, fieldEvolution, computeCorrelations } from './index.js';

const TEST_CALLBACK_PATTERN = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*\(/;
const isTestAtom = (atom) => atom.isTestCallback === true || TEST_CALLBACK_PATTERN.test(atom.name);

function normalizeAtomKind(atom = {}) {
  const explicitType = String(atom.type || atom.atomType || atom.atom_type || '').trim();
  const explicitFunctionType = String(atom.functionType || atom.function_type || '').trim();
  if (isTestAtom(atom)) return 'testCallback';
  if (explicitType && explicitType !== 'atom') return explicitType;
  const normalizedFunctionType = explicitFunctionType === 'declaration' ? 'function' : explicitFunctionType;
  return normalizedFunctionType || explicitType || 'unknown';
}

const ATOM_TYPE_FILTERS = {
  testCallback: (atom) => normalizeAtomKind(atom) === 'testCallback',
  function: (atom) => normalizeAtomKind(atom) === 'function',
  arrow: (atom) => normalizeAtomKind(atom) === 'arrow',
  expression: (atom) => normalizeAtomKind(atom) === 'expression',
  method: (atom) => normalizeAtomKind(atom) === 'method',
  variable: (atom) => normalizeAtomKind(atom) === 'variable',
  constant: (atom) => normalizeAtomKind(atom) === 'constant',
  config: (atom) => normalizeAtomKind(atom) === 'config'
};

const FIELD_TOOL_COVERAGE = getFieldToolCoverage();

function buildInventory(allAtoms) {
  return Object.fromEntries(Object.entries(ATOM_TYPE_FILTERS).map(([key, predicate]) => [key, allAtoms.filter(predicate).length]));
}

function filterAtoms(allAtoms, atomType) {
  if (!atomType) return { filtered: allAtoms, filterUsed: 'all' };
  if (ATOM_TYPE_FILTERS[atomType]) return { filtered: allAtoms.filter(ATOM_TYPE_FILTERS[atomType]), filterUsed: atomType };
  return {
    filtered: allAtoms.filter((atom) =>
      normalizeAtomKind(atom) === atomType ||
      atom.archetype?.type === atomType ||
      atom.testCallbackType === atomType
    ),
    filterUsed: atomType
  };
}

function buildKeyMetrics(filtered) {
  return {
    total: filtered.length,
    withCalls: filtered.filter((atom) => atom.calls?.length > 0).length,
    withCalledBy: filtered.filter((atom) => atom.calledBy?.length > 0).length,
    withComplexity: filtered.filter((atom) => atom.complexity > 0).length,
    withDNA: filtered.filter((atom) => atom.dna?.structuralHash).length,
    withDataFlow: filtered.filter((atom) => atom.dataFlow?.inputs?.length > 0).length,
    exported: filtered.filter((atom) => atom.isExported).length,
    async: filtered.filter((atom) => atom.isAsync).length,
    withErrorHandling: filtered.filter((atom) => atom.hasErrorHandling).length
  };
}

function buildSample(filtered, sampleSize) {
  const step = Math.max(1, Math.floor(filtered.length / sampleSize));
  return Array.from({ length: Math.min(sampleSize, filtered.length) }, (_, index) => {
    const atom = filtered[index * step];
    return {
      id: atom.id, name: atom.name, type: atom.type, functionType: atom.functionType,
      archetype: atom.archetype, purpose: atom.purpose, filePath: atom.filePath, line: atom.line,
      isTestCallback: atom.isTestCallback || false, testCallbackType: atom.testCallbackType || null,
      calls: (atom.calls || []).slice(0, 8).map((call) => typeof call === 'string' ? call : call.name),
      calledBy: (atom.calledBy || []).slice(0, 5), isExported: atom.isExported,
      isAsync: atom.isAsync || false, complexity: atom.complexity, linesOfCode: atom.linesOfCode,
      derived: atom.derived || null
    };
  });
}

function buildFieldCoverage() {
  const allFields = getAvailableFields();
  const orphaned = allFields.filter((field) => !field.usedByTools?.length);
  const covered = allFields.filter((field) => field.usedByTools?.length > 0);
  return {
    total: allFields.length, covered: covered.length, orphaned: orphaned.length,
    pct: `${Math.round((covered.length / allFields.length) * 100)}%`,
    orphanedFields: orphaned.map((field) => ({ name: field.name, level: field.level || field.source, description: field.description }))
  };
}

export async function buildAtomsSchemaResult(projectPath, { atomType, sampleSize, focusField }) {
  const allAtoms = await getAllAtoms(projectPath);
  const inventory = buildInventory(allAtoms);
  const { filtered, filterUsed } = filterAtoms(allAtoms, atomType);
  if (filtered.length === 0) {
    return { error: `No atoms found for type "${atomType}"`, inventory, totalAtoms: allAtoms.length, schemaType: 'atoms' };
  }
  const analysisSet = filtered.slice(0, Math.min(500, filtered.length));
  return {
    schemaType: 'atoms', filter: filterUsed, totalAtoms: allAtoms.length, matchingAtoms: filtered.length,
    inventory, keyMetrics: buildKeyMetrics(filtered), fieldCoverage: buildFieldCoverage(),
    correlations: computeCorrelations(analysisSet),
    evolution: focusField ? { [focusField]: fieldEvolution(analysisSet, focusField) } : undefined,
    schema: deriveSchema(analysisSet), sampleAtoms: buildSample(filtered, sampleSize),
    timestamp: new Date().toISOString()
  };
}

export function buildDatabaseSchemaResult({ includeSQL, includeDetails = false, projectPath = process.cwd() } = {}) {
  const stageErrors = [];
  const safeStage = (stage, producer, fallback = null) => {
    try {
      return producer();
    } catch (error) {
      stageErrors.push({ stage, message: error?.message || String(error) });
      return fallback;
    }
  };

  try {
    RepositoryFactory.close();
  } catch {
    // Best effort: refresh stale singleton before running schema diagnostics.
  }

  const repo = safeStage('repository', () => {
    try {
      return { db: getDatabase() };
    } catch {
      try {
        RepositoryFactory.close();
      } catch {
        // Best effort only.
      }
      return getRepository(projectPath);
    }
  }, null);
  const db = repo?.db || null;
  const databaseHealth = includeDetails && db
    ? safeStage('databaseHealth', () => getDatabaseHealthSummary(db, { liveRowSyncSampleLimit: 5 }), null)
    : null;
  const controlPlaneFoundations = includeDetails && db
    ? safeStage('controlPlaneFoundations', () => buildCompilerControlPlaneFoundations({ dbSurfaces: { databaseHealth } }), null)
    : null;
  const liveRowSync = includeDetails
    ? (controlPlaneFoundations?.liveRowSync || databaseHealth?.metrics?.liveRowSync || null)
    : null;
  const databaseHealthSummary = includeDetails && databaseHealth ? compactDatabaseHealth(databaseHealth) : null;
  const controlPlaneSummary = includeDetails && controlPlaneFoundations ? {
    analysisGeneration: controlPlaneFoundations.analysisGeneration || null,
    databaseHealth: databaseHealthSummary,
    fileUniverseGranularity: controlPlaneFoundations.fileUniverseGranularity || null,
    dataGatewayContract: summarizeDataGatewayContract(controlPlaneFoundations.dataGatewayContract || null),
    liveRowSync: liveRowSync ? {
      state: liveRowSync.state || null,
      summary: liveRowSync.summary || null,
      reason: liveRowSync.reason || null,
      recommendation: liveRowSync.recommendation || null
    } : null
  } : null;
  const historicalStores = safeStage('historicalStores', () => buildCompilerHistoricalStorageSummary(projectPath), {
    projectPath,
    archiveDir: null,
    totalStores: 0,
    readyStoreCount: 0,
    missingStoreCount: 0,
    state: 'missing',
    latestSnapshotAt: null,
    freshestSnapshotState: 'missing',
    lineageReconciliation: null,
    summaryText: 'historical storage unavailable',
    stores: []
  });
  const registryTables = getRegisteredTables().map((name) => {
    const def = getTableDefinition(name);
    return {
      name,
      status: 'unknown',
      registeredColumns: Array.isArray(def?.columns) ? def.columns : [],
      actualColumns: [],
      missingColumns: [],
      extraColumns: []
    };
  });
  const status = safeStage('schemaStatus', () => getDatabaseSchemaStatus(db), {
    success: false,
    error: 'Schema status unavailable',
    timestamp: new Date().toISOString()
  });
  if (!status.success) {
    const fallbackHealth = databaseHealthSummary?.healthy
      ? {
          status: 'warning',
          score: Math.max(60, databaseHealthSummary.healthScore || 0),
          grade: 'B'
        }
      : {
          status: 'critical',
          score: 35,
          grade: 'D'
        };

    return {
      success: true,
      schemaType: 'database',
      timestamp: new Date().toISOString(),
      warning: status.error || 'Schema status unavailable',
      health: fallbackHealth,
      summary: {
        totalRegisteredTables: registryTables.length,
        existingTables: db ? registryTables.length : 0,
        untrackedTables: 0,
        missingTables: db ? 0 : registryTables.length,
        tablesWithDrift: 0,
        totalMissingColumns: 0,
        totalExtraColumns: 0,
        historicalStoreCount: historicalStores.totalStores,
        historicalStoreReadyCount: historicalStores.readyStoreCount,
        historicalStoreMissingCount: historicalStores.missingStoreCount,
        historicalStoreState: historicalStores.state
      },
      tables: registryTables,
      untrackedTables: [],
      databaseHealth: databaseHealthSummary,
      controlPlaneFoundations: controlPlaneSummary,
      liveRowSync: controlPlaneSummary?.liveRowSync || null,
      historicalStores: {
        projectPath: historicalStores.projectPath,
        archiveDir: historicalStores.archiveDir,
        totalStores: historicalStores.totalStores,
        readyStoreCount: historicalStores.readyStoreCount,
        missingStoreCount: historicalStores.missingStoreCount,
        state: historicalStores.state,
        latestSnapshotAt: historicalStores.latestSnapshotAt,
        freshestSnapshotState: historicalStores.freshestSnapshotState,
        lineageReconciliation: historicalStores.lineageReconciliation,
        summaryText: historicalStores.summaryText
      },
      stageErrors: [...stageErrors, { stage: 'schemaStatus', message: status.error || 'Schema status unavailable' }],
      recommendations: [
        {
          severity: 'medium',
          message: `Database schema scan degraded: ${status.error || 'unavailable'}.`,
          action: 'refresh_cache'
        }
      ]
    };
  }

  const result = {
    schemaType: 'database',
    ...status,
    liveRowSync: controlPlaneSummary?.liveRowSync || null,
    databaseHealth: databaseHealthSummary,
    controlPlaneFoundations: controlPlaneSummary,
    historicalStores: {
      projectPath: historicalStores.projectPath,
      archiveDir: historicalStores.archiveDir,
      totalStores: historicalStores.totalStores,
      readyStoreCount: historicalStores.readyStoreCount,
      missingStoreCount: historicalStores.missingStoreCount,
      state: historicalStores.state,
      latestSnapshotAt: historicalStores.latestSnapshotAt,
      freshestSnapshotState: historicalStores.freshestSnapshotState,
      lineageReconciliation: historicalStores.lineageReconciliation,
      summaryText: historicalStores.summaryText
    },
    stageErrors
  };
  result.summary = {
    ...result.summary, historicalStoreCount: historicalStores.totalStores,
    historicalStoreReadyCount: historicalStores.readyStoreCount,
    historicalStoreMissingCount: historicalStores.missingStoreCount,
    historicalStoreState: historicalStores.state
  };
  if (Array.isArray(result.recommendations) && historicalStores.missingStoreCount > 0) {
    result.recommendations.push({
      severity: historicalStores.readyStoreCount > 0 ? 'medium' : 'high',
      message: `${historicalStores.missingStoreCount} historical store(s) missing.`,
      action: 'preserve_history_stores'
    });
  }
  if (includeSQL) result.sql = exportSchemaSQL();
  return result;
}

export function buildRegistrySchemaResult() {
  const tables = getRegisteredTables();
  const registry = {};
  for (const tableName of tables) {
    const tableDef = getTableDefinition(tableName);
    registry[tableName] = {
      description: tableDef?.description || '',
      columnCount: Array.isArray(tableDef?.columns) ? tableDef.columns.length : 0,
      columns: (Array.isArray(tableDef?.columns) ? tableDef.columns : []).map((col) => ({
        name: col.name, type: col.type, nullable: col.nullable !== false,
        default: col.default, pk: col.pk || false, description: col.description
      })),
      indexes: tableDef.indexes || []
    };
  }
  return { schemaType: 'registry', totalTables: tables.length, tables: registry, timestamp: new Date().toISOString() };
}
