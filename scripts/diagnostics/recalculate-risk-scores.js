#!/usr/bin/env node
/**
 * Recalcula risk_level, propagation_score y centrality para todos los átomos
 * usando la fórmula corregida (normalizada a 0-1).
 *
 * Uso: node scripts/recalculate-risk-scores.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '.omnysysdata', 'omnysys.db');

const NORMALIZE_THRESHOLD = 10; // inDegree/outDegree > 10 se capan a 1.0

function calculateCentrality(inDegree, outDegree) {
  return inDegree / (outDegree + 1);
}

function calculatePropagationScore(inDegree, outDegree) {
  const normalizedIn = Math.min(inDegree / NORMALIZE_THRESHOLD, 1);
  const normalizedOut = Math.min(outDegree / NORMALIZE_THRESHOLD, 1);
  return (normalizedIn * 0.6) + (normalizedOut * 0.4);
}

function predictBreakingRisk(inDegree, outDegree, fragilityScore = 0.3) {
  const normalizedIn = Math.min(inDegree / NORMALIZE_THRESHOLD, 1);
  const normalizedOut = Math.min(outDegree / NORMALIZE_THRESHOLD, 1);
  return (normalizedIn * 0.5) + (normalizedOut * 0.3) + (fragilityScore * 0.2);
}

function classifyCentrality(centrality) {
  if (centrality > 10) return 'HUB';
  if (centrality > 2) return 'BRIDGE';
  return 'LEAF';
}

function main() {
  console.log('Opening database:', DB_PATH);
  const db = new Database(DB_PATH);

  const atoms = db.prepare(`
    SELECT id, in_degree, out_degree, fragility_score
    FROM atoms
    WHERE is_removed = 0
  `).all();

  console.log(`Recalculating scores for ${atoms.length} atoms...`);

  const updateStmt = db.prepare(`
    UPDATE atoms SET
      centrality_score = ?,
      centrality_classification = ?,
      propagation_score = ?,
      risk_level = ?,
      risk_prediction = ?
    WHERE id = ?
  `);

  const updateTx = db.transaction((rows) => {
    for (const row of rows) {
      const inDegree = row.in_degree || 0;
      const outDegree = row.out_degree || 0;
      const fragility = row.fragility_score ?? 0.3;

      const centrality = calculateCentrality(inDegree, outDegree);
      const classification = classifyCentrality(centrality);
      const propScore = calculatePropagationScore(inDegree, outDegree);
      const riskScore = predictBreakingRisk(inDegree, outDegree, fragility);

      let riskLevel = 'LOW';
      let prediction = 'Cambios seguros';
      if (riskScore > 0.7) {
        riskLevel = 'HIGH';
        prediction = 'Alto riesgo: muchos dependientes + fragilidad';
      } else if (riskScore > 0.4) {
        riskLevel = 'MEDIUM';
        prediction = 'Riesgo moderado: verificar dependientes';
      }

      updateStmt.run(
        parseFloat(centrality.toFixed(3)),
        classification,
        parseFloat(propScore.toFixed(3)),
        riskLevel,
        prediction,
        row.id
      );
    }
  });

  updateTx(atoms);

  // Report new distribution
  const distribution = db.prepare(`
    SELECT risk_level, COUNT(*) as cnt
    FROM atoms
    WHERE is_removed = 0
    GROUP BY risk_level
    ORDER BY cnt DESC
  `).all();

  console.log('\nNew risk distribution:');
  for (const row of distribution) {
    const pct = ((row.cnt / atoms.length) * 100).toFixed(1);
    console.log(`  ${row.risk_level}: ${row.cnt} (${pct}%)`);
  }

  const propDistribution = db.prepare(`
    SELECT
      CASE
        WHEN propagation_score > 0.7 THEN 'HIGH'
        WHEN propagation_score > 0.4 THEN 'MEDIUM'
        ELSE 'LOW'
      END as prop_level,
      COUNT(*) as cnt
    FROM atoms
    WHERE is_removed = 0
    GROUP BY prop_level
    ORDER BY cnt DESC
  `).all();

  console.log('\nNew propagation distribution:');
  for (const row of propDistribution) {
    const pct = ((row.cnt / atoms.length) * 100).toFixed(1);
    console.log(`  ${row.prop_level}: ${row.cnt} (${pct}%)`);
  }

  db.close();
  console.log('\nDone.');
}

main();
