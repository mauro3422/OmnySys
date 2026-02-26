/**
 * @fileoverview purpose-analyzer.js - Purpose analysis
 */

export function analyzePurposeCoverage(atoms) {
  const withPurpose = [];
  const withoutPurpose = [];
  
  for (const atom of atoms.values()) {
    if (atom.data?.purpose || atom.purpose) {
      withPurpose.push(atom.data || atom);
    } else {
      withoutPurpose.push(atom.data || atom);
    }
  }
  
  return { withPurpose, withoutPurpose, coverage: (withPurpose.length / atoms.size * 100) };
}

export function getPurposeDistribution(withPurpose) {
  const byPurpose = {};
  for (const atom of withPurpose) {
    const p = atom.purpose;
    if (!byPurpose[p]) byPurpose[p] = [];
    byPurpose[p].push(atom);
  }
  return byPurpose;
}
