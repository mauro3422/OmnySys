/**
 * MCP Tool: get_atom_schema
 *
 * Inspects the live atom index and returns a dynamic schema of available
 * metadata fields for a given atom type. Useful for debugging extractors,
 * understanding what data is available, and checking tool coverage.
 *
 * @module mcp/tools/get-atom-schema
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { getFieldToolCoverage, getAvailableFields } from '#layer-a/extractors/metadata/registry.js';

const TEST_CALLBACK_PATTERN = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*\(/;
// isTestCallback: usa el campo persistido si existe (post v0.9.47), regex como fallback
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

/**
 * Extrae campos derivados de async de un átomo
 * Esto permite que el schema muestre estadísticas de async patterns
 */
function extractAsyncDerivedFields(atom) {
  const temporal = atom.temporal?.patterns || atom.temporal || {};
  const asyncPatterns = temporal.asyncPatterns || {};
  const flowAnalysis = temporal.asyncFlowAnalysis || {};
  
  return {
    sequentialAwaitsCount: asyncPatterns.sequentialOperations?.[0]?.count || 0,
    asyncRiskLevel: flowAnalysis.overallRisk || 'none',
    hasPromiseAll: asyncPatterns.hasPromiseAll || false,
    hasPromiseChain: asyncPatterns.hasPromiseChain || false,
    asyncEventCount: (temporal.events || []).length,
    parallelOpCount: (asyncPatterns.parallelOperations || []).length,
  };
}

// Calculado en module-level: el registry es estático, se refresca con restart_server
const FIELD_TOOL_COVERAGE = getFieldToolCoverage();

/**
 * Estadísticas matemáticas para valores numéricos
 */
function numericStats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
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

/**
 * Distribución de valores categóricos (top N más frecuentes)
 */
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

/**
 * Evolución de un campo numérico por archetype y purpose
 * Responde: "¿cómo varía este campo según la naturaleza del átomo?"
 */
function fieldEvolution(atoms, field) {
  // Por archetype
  const byArchetype = {};
  const byPurpose = {};

  for (const atom of atoms) {
    const val = atom[field];
    if (typeof val !== 'number') continue;

    const arch = atom.archetype?.type || atom.archetype || 'unknown';
    // purpose puede ser string o objeto { type, reason, confidence }
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

/**
 * Correlaciones entre campos numéricos clave
 * Responde: "¿complexity alta implica más calledBy?"
 */
function computeCorrelations(atoms) {
  const numericFields = ['complexity', 'linesOfCode', 'externalCallCount'];
  const arrayFields = ['calls', 'calledBy'];

  const vectors = {};
  for (const f of [...numericFields, ...arrayFields]) {
    vectors[f] = atoms.map(a =>
      arrayFields.includes(f) ? (a[f]?.length || 0) : (a[f] || 0)
    );
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

/**
 * Analiza los campos presentes en una muestra de átomos y devuelve un schema dinámico
 * con estadísticas matemáticas y evolución por archetype/purpose
 */
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

      if (t === 'number') {
        s.numericValues.push(value);
      } else if (t === 'string' || t === 'boolean') {
        s.categoricalValues.push(value);
      } else if (isArr) {
        // Para arrays, trackear longitud como métrica numérica
        s.numericValues.push(value.length);
      }

      if (s.sampleValues.length < 2 && value !== null && value !== undefined) {
        const preview = isArr
          ? `array(${value.length})`
          : t === 'object'
            ? `object(${Object.keys(value).length} keys)`
            : String(value).slice(0, 60);
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

      if (s.numericValues.length > 0) {
        entry.math = numericStats(s.numericValues);
      }
      if (s.categoricalValues.length > 0 && s.categoricalValues.length <= total) {
        entry.distribution = categoricalDist(s.categoricalValues);
      }

      return entry;
    })
    .sort((a, b) => {
      const aP = parseInt(a.presentIn);
      const bP = parseInt(b.presentIn);
      return bP - aP || a.field.localeCompare(b.field);
    });
}

// ── Helpers for get_atom_schema ───────────────────────────────────────────────

function buildInventory(allAtoms) {
  return Object.fromEntries(Object.entries(ATOM_TYPE_FILTERS).map(([k, fn]) => [k, allAtoms.filter(fn).length]));
}

function filterAtoms(allAtoms, atomType) {
  if (!atomType) return { filtered: allAtoms, filterUsed: 'all' };
  if (ATOM_TYPE_FILTERS[atomType]) return { filtered: allAtoms.filter(ATOM_TYPE_FILTERS[atomType]), filterUsed: atomType };
  return { filtered: allAtoms.filter(a => a.type === atomType || a.functionType === atomType || a.archetype?.type === atomType || a.testCallbackType === atomType), filterUsed: atomType };
}

function computeEvolution(analysisSet, focusField) {
  const KEY_FIELDS = ['complexity', 'linesOfCode', 'externalCallCount', 'sequentialAwaitsCount', 'asyncEventCount'];
  const evolution = {};
  for (const field of KEY_FIELDS) {
    if (analysisSet.some(a => typeof a[field] === 'number' && a[field] > 0))
      evolution[field] = fieldEvolution(analysisSet, field);
  }
  if (focusField && !KEY_FIELDS.includes(focusField))
    evolution[focusField] = fieldEvolution(analysisSet, focusField);
  return evolution;
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
    return { id: a.id, name: a.name, type: a.type, functionType: a.functionType, archetype: a.archetype, purpose: a.purpose, filePath: a.filePath, line: a.line, isTestCallback: a.isTestCallback || false, testCallbackType: a.testCallbackType || null, calls: (a.calls || []).slice(0, 8).map(c => typeof c === 'string' ? c : c.name), calledBy: (a.calledBy || []).slice(0, 5), isExported: a.isExported, isAsync: a.isAsync || false, complexity: a.complexity, linesOfCode: a.linesOfCode, derived: a.derived || null };
  });
}

function buildFieldCoverage() {
  const allFields = getAvailableFields();
  const orphaned = allFields.filter(f => !f.usedByTools?.length);
  const covered  = allFields.filter(f => f.usedByTools?.length > 0);
  return { total: allFields.length, covered: covered.length, orphaned: orphaned.length, pct: `${Math.round((covered.length / allFields.length) * 100)}%`, orphanedFields: orphaned.map(f => ({ name: f.name, level: f.level || f.source, description: f.description })) };
}

export async function get_atom_schema(args, context) {
  const { atomType, sampleSize = 3, focusField } = args;
  const { projectPath } = context;

  const allAtoms = await getAllAtoms(projectPath);
  const inventory = buildInventory(allAtoms);
  const { filtered, filterUsed } = filterAtoms(allAtoms, atomType);

  if (filtered.length === 0) {
    return { error: `No atoms found for type "${atomType}"`, inventory, totalAtoms: allAtoms.length };
  }

  // Enriquecer átomos con campos derivados de async para que aparezcan en schema
  const enrichedAtoms = filtered.map(atom => ({
    ...atom,
    ...extractAsyncDerivedFields(atom)
  }));

  const analysisSet = enrichedAtoms.slice(0, Math.min(500, enrichedAtoms.length));

  return {
    filter: filterUsed,
    totalAtoms: allAtoms.length,
    matchingAtoms: filtered.length,
    inventory,
    keyMetrics:    buildKeyMetrics(filtered),
    fieldCoverage: buildFieldCoverage(),
    correlations:  computeCorrelations(analysisSet),
    evolution:     computeEvolution(analysisSet, focusField),
    schema:        deriveSchema(analysisSet),
    sampleAtoms:   buildSample(filtered, sampleSize),
  };
}

export default { get_atom_schema };
