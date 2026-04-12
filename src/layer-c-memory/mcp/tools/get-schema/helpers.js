import { getAllAtoms } from '../../../storage/index.js';
import { getFieldToolCoverage, getAvailableFields } from '#layer-a/extractors/metadata/registry.js';
import { getDatabase } from '../../../storage/database/connection.js';
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
  getDatabaseHealthSummary,
  summarizePropagationPlan,
  summarizeAtomSemanticPurity,
  summarizeAtomTestability
} from '../../../../shared/compiler/index.js';
import { deriveSchema, fieldEvolution, computeCorrelations } from './index.js';

void summarizePropagationPlan;

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

function buildSchemaRecommendations(report, missingTables, historicalStores = null) {
  const recommendations = [];
  if (missingTables > 0) {
    recommendations.push({ severity: 'high', message: `Missing ${missingTables} table(s). Run restart_server({ clearCache: true }) to recreate.`, action: 'restart_server' });
  }
  if (report.missingColumns.length > 0) {
    recommendations.push({ severity: 'medium', message: `${report.missingColumns.reduce((sum, item) => sum + item.columns.length, 0)} column(s) missing.`, action: 'auto_migrate' });
  }
  if (report.extraColumns.length > 0) {
    recommendations.push({ severity: 'low', message: `${report.extraColumns.reduce((sum, item) => sum + item.columns.length, 0)} extra column(s) detected.`, action: 'update_registry' });
  }
  if (historicalStores?.missingStoreCount > 0) {
    recommendations.push({
      severity: historicalStores.readyStoreCount > 0 ? 'medium' : 'high',
      message: `${historicalStores.missingStoreCount} historical store(s) missing.`,
      action: 'preserve_history_stores'
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({ severity: 'info', message: 'Schema is healthy and synchronized with registry.', action: 'none' });
  }
  return recommendations;
}

function getDatabaseSchemaStatus() {
  try {
    const db = getDatabase();
    if (!db) return { success: false, error: 'Database not initialized', timestamp: new Date().toISOString() };

    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tablesInfo = existingTables.map((table) => ({
      name: table.name,
      columns: db.prepare(`PRAGMA table_info(${table.name})`).all().map((column) => ({
        name: column.name, type: column.type, nullable: !column.notnull,
        hasDefault: column.dflt_value !== null, isPk: column.pk > 0
      }))
    }));

    const report = generateSchemaReport(tablesInfo);
    const totalTables = getRegisteredTables().length;
    const missingTables = totalTables - existingTables.length;
    const tablesWithDrift = Object.values(report.tables).filter((t) => t.status === 'mismatch' || t.status === 'missing').length;

    let health = 'healthy';
    let healthScore = 100;
    if (missingTables > 0) { health = 'critical'; healthScore -= 40; }
    if (report.missingColumns.length > 0) { health = health === 'critical' ? 'critical' : 'warning'; healthScore -= Math.min(30, report.missingColumns.length * 5); }
    if (report.extraColumns.length > 0) { health = health === 'critical' ? 'critical' : 'warning'; healthScore -= Math.min(20, report.extraColumns.length * 3); }
    healthScore = Math.max(0, healthScore);

    return {
      success: true, timestamp: new Date().toISOString(),
      health: { status: health, score: healthScore, grade: healthScore >= 90 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 50 ? 'C' : 'D' },
      summary: {
        totalRegisteredTables: totalTables, existingTables: existingTables.length, missingTables, tablesWithDrift,
        totalMissingColumns: report.missingColumns.reduce((s, i) => s + i.columns.length, 0),
        totalExtraColumns: report.extraColumns.reduce((s, i) => s + i.columns.length, 0)
      },
      tables: report.tables, missingColumns: report.missingColumns, extraColumns: report.extraColumns,
      recommendations: buildSchemaRecommendations(report, missingTables)
    };
  } catch (error) {
    return { success: false, error: error.message, timestamp: new Date().toISOString() };
  }
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

export function buildDatabaseSchemaResult({ includeSQL, projectPath = process.cwd() } = {}) {
  const db = getDatabase();
  const databaseHealth = db ? getDatabaseHealthSummary(db, { liveRowSyncSampleLimit: 5 }) : null;
  const controlPlaneFoundations = db
    ? buildCompilerControlPlaneFoundations({ dbSurfaces: { databaseHealth } })
    : null;
  const liveRowSync = controlPlaneFoundations?.liveRowSync || null;
  const historicalStores = buildCompilerHistoricalStorageSummary(projectPath);
  const status = getDatabaseSchemaStatus();
  if (!status.success) return { ...status, schemaType: 'database', historicalStores };

  const result = {
    schemaType: 'database',
    ...status,
    liveRowSync,
    controlPlaneFoundations,
    historicalStores
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
      description: tableDef.description, columnCount: tableDef.columns.length,
      columns: tableDef.columns.map((col) => ({
        name: col.name, type: col.type, nullable: col.nullable !== false,
        default: col.default, pk: col.pk || false, description: col.description
      })),
      indexes: tableDef.indexes || []
    };
  }
  return { schemaType: 'registry', totalTables: tables.length, tables: registry, timestamp: new Date().toISOString() };
}
