/**
 * @fileoverview MCP Get Schema Tool
 *
 * Herramienta unificada para consultar schemas del sistema.
 * Reemplaza a: get_atom_schema + get_schema_status
 *
 * OPCIONES:
 *   - type: 'atoms' | 'database' | 'registry'
 *   - atomType: Filtrar por tipo de átomo (solo para type='atoms')
 *   - sampleSize: Cantidad de muestras (solo para type='atoms')
 *   - focusField: Campo para análisis detallado (solo para type='atoms')
 *
 * @module mcp/tools/get-schema
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { getFieldToolCoverage, getAvailableFields } from '#layer-a/extractors/metadata/registry.js';
import { getDatabase } from '../../storage/database/connection.js';
import { getRegisteredTables, getTableDefinition, getTableColumns, generateSchemaReport, exportSchemaSQL } from '../../storage/database/schema-registry.js';

const TEST_CALLBACK_PATTERN = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*\(/;
const isTestAtom = a => a.isTestCallback === true || TEST_CALLBACK_PATTERN.test(a.name);

const ATOM_TYPE_FILTERS = {
  testCallback:  a => isTestAtom(a),
  function:      a => !isTestAtom(a) && a.type === 'atom' && a.functionType === 'declaration',
  arrow:         a => !isTestAtom(a) && a.type === 'atom' && a.functionType === 'arrow',
  expression:    a => !isTestAtom(a) && a.type === 'atom' && a.functionType === 'expression',
  method:        a => !isTestAtom(a) && a.type === 'atom' && a.functionType === 'method',
  variable:      a => a.type === 'variable',
  constant:      a => a.type === 'constant',
  config:        a => a.type === 'config',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PARA ATOM SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

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
    nonZero: values.filter(v => v > 0).length,
  };
}

function categoricalDist(values, topN = 8) {
  const freq = {};
  for (const v of values) {
    const key = String(v);
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
    const val = atom[field];
    if (typeof val !== 'number') continue;
    const arch = atom.archetype?.type || atom.archetype || 'unknown';
    const purp = typeof atom.purpose === 'object' ? atom.purpose?.type : (atom.purpose || 'unknown');
    if (!byArchetype[arch]) byArchetype[arch] = [];
    byArchetype[arch].push(val);
    if (!byPurpose[purp]) byPurpose[purp] = [];
    byPurpose[purp].push(val);
  }

  const archetypeEvolution = Object.entries(byArchetype)
    .map(([arch, vals]) => ({
      archetype: arch,
      count: vals.length,
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      max: Math.max(...vals),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  const purposeEvolution = Object.entries(byPurpose)
    .map(([purp, vals]) => ({
      purpose: purp,
      count: vals.length,
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      max: Math.max(...vals),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  return { byArchetype: archetypeEvolution, byPurpose: purposeEvolution };
}

function computeCorrelations(atoms) {
  const numericFields = ['complexity', 'linesOfCode', 'externalCallCount'];
  const arrayFields = ['calls', 'calledBy'];
  const vectors = {};
  
  for (const f of [...numericFields, ...arrayFields]) {
    vectors[f] = atoms.map(a => arrayFields.includes(f) ? (a[f]?.length || 0) : (a[f] || 0));
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
      const num = x.reduce((s, xi, k) => s + (xi - mx) * (y[k] - my), 0);
      const dx = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0));
      const dy = Math.sqrt(y.reduce((s, yi) => s + (yi - my) ** 2, 0));
      const r = (dx && dy) ? Math.round((num / (dx * dy)) * 100) / 100 : 0;
      if (Math.abs(r) > 0.1) {
        correlations.push({
          fields: `${allFields[i]} ↔ ${allFields[j]}`,
          r,
          strength: Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak',
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
      const s = fieldStats[key];
      s.count++;
      const isArr = Array.isArray(value);
      const t = isArr ? 'array' : typeof value;
      s.types.add(t);
      if (t === 'number') s.numericValues.push(value);
      else if (t === 'string' || t === 'boolean') s.categoricalValues.push(value);
      else if (isArr) s.numericValues.push(value.length);
      if (s.sampleValues.length < 2 && value !== null && value !== undefined) {
        const preview = isArr ? `array(${value.length})` : t === 'object' ? `object(${Object.keys(value).length} keys)` : String(value).slice(0, 60);
        s.sampleValues.push(preview);
      }
    }
  }

  return Object.entries(fieldStats)
    .map(([field, s]) => {
      const typeStr = [...s.types].join(' | ');
      const entry = {
        field,
        presentIn: `${Math.round((s.count / total) * 100)}%`,
        presentCount: s.count,
        type: typeStr,
        sampleValues: s.sampleValues,
        usedByTools: FIELD_TOOL_COVERAGE[field] || [],
      };
      if (s.numericValues.length > 0) entry.math = numericStats(s.numericValues);
      if (s.categoricalValues.length > 0 && s.categoricalValues.length <= total) entry.distribution = categoricalDist(s.categoricalValues);
      return entry;
    })
    .sort((a, b) => {
      const aP = parseInt(a.presentIn);
      const bP = parseInt(b.presentIn);
      return bP - aP || a.field.localeCompare(b.field);
    });
}

function buildInventory(allAtoms) {
  return Object.fromEntries(Object.entries(ATOM_TYPE_FILTERS).map(([k, fn]) => [k, allAtoms.filter(fn).length]));
}

function filterAtoms(allAtoms, atomType) {
  if (!atomType) return { filtered: allAtoms, filterUsed: 'all' };
  if (ATOM_TYPE_FILTERS[atomType]) return { filtered: allAtoms.filter(ATOM_TYPE_FILTERS[atomType]), filterUsed: atomType };
  return { filtered: allAtoms.filter(a => a.type === atomType || a.functionType === atomType || a.archetype?.type === atomType || a.testCallbackType === atomType), filterUsed: atomType };
}

function buildKeyMetrics(filtered) {
  return {
    total:             filtered.length,
    withCalls:         filtered.filter(a => a.calls?.length > 0).length,
    withCalledBy:      filtered.filter(a => a.calledBy?.length > 0).length,
    withComplexity:    filtered.filter(a => a.complexity > 0).length,
    withDNA:           filtered.filter(a => a.dna?.structuralHash).length,
    withDataFlow:      filtered.filter(a => a.dataFlow?.inputs?.length > 0).length,
    exported:          filtered.filter(a => a.isExported).length,
    async:             filtered.filter(a => a.isAsync).length,
    withErrorHandling: filtered.filter(a => a.hasErrorHandling).length,
  };
}

function buildSample(filtered, sampleSize) {
  const step = Math.max(1, Math.floor(filtered.length / sampleSize));
  return Array.from({ length: Math.min(sampleSize, filtered.length) }, (_, i) => {
    const a = filtered[i * step];
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      functionType: a.functionType,
      archetype: a.archetype,
      purpose: a.purpose,
      filePath: a.filePath,
      line: a.line,
      isTestCallback: a.isTestCallback || false,
      testCallbackType: a.testCallbackType || null,
      calls: (a.calls || []).slice(0, 8).map(c => typeof c === 'string' ? c : c.name),
      calledBy: (a.calledBy || []).slice(0, 5),
      isExported: a.isExported,
      isAsync: a.isAsync || false,
      complexity: a.complexity,
      linesOfCode: a.linesOfCode,
      derived: a.derived || null
    };
  });
}

function buildFieldCoverage() {
  const allFields = getAvailableFields();
  const orphaned = allFields.filter(f => !f.usedByTools?.length);
  const covered  = allFields.filter(f => f.usedByTools?.length > 0);
  return {
    total: allFields.length,
    covered: covered.length,
    orphaned: orphaned.length,
    pct: `${Math.round((covered.length / allFields.length) * 100)}%`,
    orphanedFields: orphaned.map(f => ({ name: f.name, level: f.level || f.source, description: f.description }))
  };
}

const FIELD_TOOL_COVERAGE = getFieldToolCoverage();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PARA DATABASE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

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
    const tablesInfo = existingTables.map(table => ({
      name: table.name,
      columns: db.prepare(`PRAGMA table_info(${table.name})`).all().map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        hasDefault: col.dflt_value !== null,
        isPk: col.pk > 0
      }))
    }));

    const report = generateSchemaReport(tablesInfo);
    const totalTables = getRegisteredTables().length;
    const missingTables = totalTables - existingTables.length;
    const tablesWithDrift = Object.values(report.tables).filter(t => t.status === 'mismatch' || t.status === 'missing').length;

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
      recommendations: generateRecommendations(report, missingTables)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function generateRecommendations(report, missingTables) {
  const recs = [];
  if (missingTables > 0) {
    recs.push({ severity: 'high', message: `Missing ${missingTables} table(s). Run restart_server({ clearCache: true }) to recreate.`, action: 'restart_server' });
  }
  if (report.missingColumns.length > 0) {
    recs.push({ severity: 'medium', message: `${report.missingColumns.reduce((sum, item) => sum + item.columns.length, 0)} column(s) missing. Auto-migration will run on next startup.`, action: 'auto_migrate' });
  }
  if (report.extraColumns.length > 0) {
    recs.push({ severity: 'low', message: `${report.extraColumns.reduce((sum, item) => sum + item.columns.length, 0)} extra column(s) detected (drift). Consider updating schema-registry.js`, action: 'update_registry' });
  }
  if (recs.length === 0) {
    recs.push({ severity: 'info', message: 'Schema is healthy and synchronized with registry.', action: 'none' });
  }
  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// HERRAMIENTA MCP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MCP Tool: get_schema
 * 
 * Herramienta unificada para consultar schemas del sistema.
 * 
 * @param {Object} args - Argumentos
 * @param {string} args.type - Tipo de schema: 'atoms' | 'database' | 'registry'
 * @param {string} args.atomType - Filtrar por tipo de átomo (solo type='atoms')
 * @param {number} args.sampleSize - Cantidad de muestras (solo type='atoms')
 * @param {string} args.focusField - Campo para análisis detallado (solo type='atoms')
 * @param {boolean} args.includeSQL - Incluir SQL exportado (solo type='database')
 */
export async function get_schema(args, context) {
  const { type = 'atoms', atomType, sampleSize = 3, focusField, includeSQL = false } = args;
  const { projectPath } = context;

  try {
    switch (type) {
      case 'atoms': {
        // ── ATOM SCHEMA (metadata de átomos) ─────────────────────────────────
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

      case 'database': {
        // ── DATABASE SCHEMA (estado de la DB SQLite) ────────────────────────
        const status = getDatabaseSchemaStatus();
        
        if (!status.success) {
          return { ...status, schemaType: 'database' };
        }

        const result = {
          schemaType: 'database',
          ...status
        };

        if (includeSQL) {
          result.sql = exportSchemaSQL();
        }

        return result;
      }

      case 'registry': {
        // ── SCHEMA REGISTRY (definición registrada) ─────────────────────────
        const tables = getRegisteredTables();
        const registry = {};

        for (const tableName of tables) {
          const tableDef = getTableDefinition(tableName);
          registry[tableName] = {
            description: tableDef.description,
            columnCount: tableDef.columns.length,
            columns: tableDef.columns.map(col => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable !== false,
              default: col.default,
              pk: col.pk || false,
              description: col.description
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

      default:
        return {
          error: `Unknown schema type: ${type}`,
          validTypes: ['atoms', 'database', 'registry']
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      schemaType: type,
      timestamp: new Date().toISOString()
    };
  }
}

export default { get_schema };
