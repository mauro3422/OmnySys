/**
 * @fileoverview schema-stats.js
 *
 * Statistical analysis functions for atom schema derivation.
 * Extracted from get-schema-helpers.js to reduce complexity and file size.
 */

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

export function deriveSchema(atoms, total) {
  const fieldStats = {};

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
        usedByTools: globalThis.FIELD_TOOL_COVERAGE?.[field] || []
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

export { numericStats, categoricalDist, fieldEvolution, computeCorrelations };
