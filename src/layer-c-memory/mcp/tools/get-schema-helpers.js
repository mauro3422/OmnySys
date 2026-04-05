import { getAllAtoms } from '#layer-c/storage/index.js';
import { getFieldToolCoverage, getAvailableFields } from '#layer-a/extractors/metadata/registry.js';
import {
  ensureLiveRowSync,
  summarizeAtomSemanticPurity,
  summarizeAtomTestability
} from '../../../shared/compiler/index.js';
import { buildCompilerHistoricalStorageSummary } from '../../../shared/compiler/compiler-persistence-paths.js';
import { getDatabase } from '../../storage/database/connection.js';
import {
  getRegisteredTables,
  getTableDefinition,
  getTableColumns,
  generateSchemaReport,
  exportSchemaSQL
} from '../../storage/database/schema-registry.js';

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

function numericStats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(avg * 100) / 100,
    median,
    p75,
    p95,
    nonZero: values.filter((value) => value > 0).length
  };
}

function categoricalDist(values, topN = 8) {
  const freq = {};
  for (const value of values) {
    const key = String(value);
    freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([value, count]) => ({ value, count, pct: `${Math.round((count / values.length) * 100)}%` }));
}

function fieldEvolution(atoms, field) {
  const byArchetype = {};
  const byPurpose = {};

  for (const atom of atoms) {
    const value = atom[field];
    if (typeof value !== 'number') continue;
    const archetype = atom.archetype?.type || atom.archetype || 'unknown';
    const purpose = typeof atom.purpose === 'object' ? atom.purpose?.type : (atom.purpose || 'unknown');
    if (!byArchetype[archetype]) byArchetype[archetype] = [];
    byArchetype[archetype].push(value);
    if (!byPurpose[purpose]) byPurpose[purpose] = [];
    byPurpose[purpose].push(value);
  }

  const archetypeEvolution = Object.entries(byArchetype)
    .map(([archetype, values]) => ({
      archetype,
      count: values.length,
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      max: Math.max(...values)
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  const purposeEvolution = Object.entries(byPurpose)
    .map(([purpose, values]) => ({
      purpose,
      count: values.length,
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      max: Math.max(...values)
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  return { byArchetype: archetypeEvolution, byPurpose: purposeEvolution };
}

function computeCorrelations(atoms) {
  const numericFields = ['complexity', 'linesOfCode', 'externalCallCount'];
  const arrayFields = ['calls', 'calledBy'];
  const vectors = {};

  for (const field of [...numericFields, ...arrayFields]) {
    vectors[field] = atoms.map((atom) => (arrayFields.includes(field) ? (atom[field]?.length || 0) : (atom[field] || 0)));
  }

  const allFields = [...numericFields, ...arrayFields];
  const correlations = [];

  for (let i = 0; i < allFields.length; i++) {
    for (let j = i + 1; j < allFields.length; j++) {
      const x = vectors[allFields[i]];
      const y = vectors[allFields[j]];
      const n = x.length;
      const mx = x.reduce((a, b) => a + b, 0) / n;
      const my = y.reduce((a, b) => a + b, 0) / n;
      const num = x.reduce((sum, xi, k) => sum + (xi - mx) * (y[k] - my), 0);
      const dx = Math.sqrt(x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0));
      const dy = Math.sqrt(y.reduce((sum, yi) => sum + (yi - my) ** 2, 0));
      const r = (dx && dy) ? Math.round((num / (dx * dy)) * 100) / 100 : 0;
      if (Math.abs(r) > 0.1) {
        correlations.push({
          fields: `${allFields[i]} ↔ ${allFields[j]}`,
          r,
          strength: Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak'
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

function deriveSchema(atoms) {
  const fieldStats = {};
  const total = atoms.length;

  for (const atom of atoms) {
    for (const [key, value] of Object.entries(atom)) {
      if (!fieldStats[key]) {
        fieldStats[key] = { count: 0, types: new Set(), numericValues: [], categoricalValues: [], sampleValues: [] };
      }
      const stats = fieldStats[key];
      stats.count++;
      const isArray = Array.isArray(value);
      const type = isArray ? 'array' : typeof value;
      stats.types.add(type);
      if (type === 'number') stats.numericValues.push(value);
      else if (type === 'string' || type === 'boolean') stats.categoricalValues.push(value);
      else if (isArray) stats.numericValues.push(value.length);
      if (stats.sampleValues.length < 2 && value !== null && value !== undefined) {
        const preview = isArray ? `array(${value.length})` : type === 'object' ? `object(${Object.keys(value).length} keys)` : String(value).slice(0, 60);
        stats.sampleValues.push(preview);
      }
    }
  }

  return Object.entries(fieldStats)
    .map(([field, stats]) => {
      const typeStr = [...stats.types].join(' | ');
      const entry = {
        field,
        presentIn: `${Math.round((stats.count / total) * 100)}%`,
        presentCount: stats.count,
        type: typeStr,
        sampleValues: stats.sampleValues,
        usedByTools: FIELD_TOOL_COVERAGE[field] || []
      };
      if (stats.numericValues.length > 0) entry.math = numericStats(stats.numericValues);
      if (stats.categoricalValues.length > 0 && stats.categoricalValues.length <= total) entry.distribution = categoricalDist(stats.categoricalValues);
      return entry;
    })
    .sort((a, b) => {
      const aPercent = parseInt(a.presentIn);
      const bPercent = parseInt(b.presentIn);
      return bPercent - aPercent || a.field.localeCompare(b.field);
    });
}

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
      id: atom.id,
      name: atom.name,
      type: atom.type,
      functionType: atom.functionType,
      archetype: atom.archetype,
      purpose: atom.purpose,
      filePath: atom.filePath,
      line: atom.line,
      isTestCallback: atom.isTestCallback || false,
      testCallbackType: atom.testCallbackType || null,
      calls: (atom.calls || []).slice(0, 8).map((call) => typeof call === 'string' ? call : call.name),
      calledBy: (atom.calledBy || []).slice(0, 5),
      isExported: atom.isExported,
      isAsync: atom.isAsync || false,
      complexity: atom.complexity,
      linesOfCode: atom.linesOfCode,
      derived: atom.derived || null
    };
  });
}

function buildFieldCoverage() {
  const allFields = getAvailableFields();
  const orphaned = allFields.filter((field) => !field.usedByTools?.length);
  const covered = allFields.filter((field) => field.usedByTools?.length > 0);
  return {
    total: allFields.length,
    covered: covered.length,
    orphaned: orphaned.length,
    pct: `${Math.round((covered.length / allFields.length) * 100)}%`,
    orphanedFields: orphaned.map((field) => ({ name: field.name, level: field.level || field.source, description: field.description }))
  };
}

const FIELD_TOOL_COVERAGE = getFieldToolCoverage();

function getDatabaseSchemaStatus() {
  try {
    const db = getDatabase();
    if (!db) {
      return {
        success: false,
        error: 'Database not initialized',
        timestamp: new Date().toISOString()
      };
    }

    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tablesInfo = existingTables.map((table) => ({
      name: table.name,
      columns: db.prepare(`PRAGMA table_info(${table.name})`).all().map((column) => ({
        name: column.name,
        type: column.type,
        nullable: !column.notnull,
        hasDefault: column.dflt_value !== null,
        isPk: column.pk > 0
      }))
    }));

    const report = generateSchemaReport(tablesInfo);
    const totalTables = getRegisteredTables().length;
    const missingTables = totalTables - existingTables.length;
    const tablesWithDrift = Object.values(report.tables).filter((table) => table.status === 'mismatch' || table.status === 'missing').length;

    let health = 'healthy';
    let healthScore = 100;
    if (missingTables > 0) { health = 'critical'; healthScore -= 40; }
    if (report.missingColumns.length > 0) { health = health === 'critical' ? 'critical' : 'warning'; healthScore -= Math.min(30, report.missingColumns.length * 5); }
    if (report.extraColumns.length > 0) { health = health === 'critical' ? 'critical' : 'warning'; healthScore -= Math.min(20, report.extraColumns.length * 3); }
    healthScore = Math.max(0, healthScore);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        status: health,
        score: healthScore,
        grade: healthScore >= 90 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 50 ? 'C' : 'D'
      },
      summary: {
        totalRegisteredTables: totalTables,
        existingTables: existingTables.length,
        missingTables,
        tablesWithDrift,
        totalMissingColumns: report.missingColumns.reduce((sum, item) => sum + item.columns.length, 0),
        totalExtraColumns: report.extraColumns.reduce((sum, item) => sum + item.columns.length, 0)
      },
      tables: report.tables,
      missingColumns: report.missingColumns,
      extraColumns: report.extraColumns,
      recommendations: buildSchemaRecommendations(report, missingTables, historicalStores)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function buildSchemaRecommendations(report, missingTables, historicalStores = null) {
  const recommendations = [];
  if (missingTables > 0) {
    recommendations.push({ severity: 'high', message: `Missing ${missingTables} table(s). Run restart_server({ clearCache: true }) to recreate.`, action: 'restart_server' });
  }
  if (report.missingColumns.length > 0) {
    recommendations.push({ severity: 'medium', message: `${report.missingColumns.reduce((sum, item) => sum + item.columns.length, 0)} column(s) missing. Auto-migration will run on next startup.`, action: 'auto_migrate' });
  }
  if (report.extraColumns.length > 0) {
    recommendations.push({ severity: 'low', message: `${report.extraColumns.reduce((sum, item) => sum + item.columns.length, 0)} extra column(s) detected (drift). Consider updating schema-registry.js`, action: 'update_registry' });
  }
  if (historicalStores?.missingStoreCount > 0) {
    recommendations.push({
      severity: historicalStores.readyStoreCount > 0 ? 'medium' : 'high',
      message: `${historicalStores.missingStoreCount} historical store(s) are missing. Preserve health-history.db and atom-history.db so lifecycle data survives reanalyze.`,
      action: 'preserve_history_stores'
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({ severity: 'info', message: 'Schema is healthy and synchronized with registry.', action: 'none' });
  }
  return recommendations;
}

export async function buildAtomsSchemaResult(projectPath, { atomType, sampleSize, focusField }) {
  const allAtoms = await getAllAtoms(projectPath);
  const inventory = buildInventory(allAtoms);
  const { filtered, filterUsed } = filterAtoms(allAtoms, atomType);

  if (filtered.length === 0) {
    return {
      error: `No atoms found for type "${atomType}"`,
      inventory,
      totalAtoms: allAtoms.length,
      schemaType: 'atoms'
    };
  }

  const analysisSet = filtered.slice(0, Math.min(500, filtered.length));

  return {
    schemaType: 'atoms',
    filter: filterUsed,
    totalAtoms: allAtoms.length,
    matchingAtoms: filtered.length,
    inventory,
    keyMetrics: buildKeyMetrics(filtered),
    fieldCoverage: buildFieldCoverage(),
    correlations: computeCorrelations(analysisSet),
    evolution: focusField ? { [focusField]: fieldEvolution(analysisSet, focusField) } : undefined,
    schema: deriveSchema(analysisSet),
    sampleAtoms: buildSample(filtered, sampleSize),
    timestamp: new Date().toISOString()
  };
}

export function buildDatabaseSchemaResult({ includeSQL, projectPath = process.cwd() } = {}) {
  const db = getDatabase();
  const liveRowSync = db ? ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 }) : null;
  const status = getDatabaseSchemaStatus();
  const historicalStores = buildCompilerHistoricalStorageSummary(projectPath);

  if (!status.success) {
    return { ...status, schemaType: 'database', historicalStores };
  }

  const result = {
    schemaType: 'database',
    ...status,
    liveRowSync,
    historicalStores
  };

  result.summary = {
    ...result.summary,
    historicalStoreCount: historicalStores.totalStores,
    historicalStoreReadyCount: historicalStores.readyStoreCount,
    historicalStoreMissingCount: historicalStores.missingStoreCount,
    historicalStoreState: historicalStores.state
  };

  if (includeSQL) {
    result.sql = exportSchemaSQL();
  }

  return result;
}

export function buildRegistrySchemaResult() {
  const tables = getRegisteredTables();
  const registry = {};

  for (const tableName of tables) {
    const tableDef = getTableDefinition(tableName);
    registry[tableName] = {
      description: tableDef.description,
      columnCount: tableDef.columns.length,
      columns: tableDef.columns.map((column) => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable !== false,
        default: column.default,
        pk: column.pk || false,
        description: column.description
      })),
      indexes: tableDef.indexes || []
    };
  }

  return {
    schemaType: 'registry',
    totalTables: tables.length,
    tables: registry,
    timestamp: new Date().toISOString()
  };
}
