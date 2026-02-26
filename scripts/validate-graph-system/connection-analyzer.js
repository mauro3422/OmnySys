/**
 * @fileoverview connection-analyzer.js - Analysis of connections and weights
 */

export function analyzeConnections(atoms, withPurpose) {
  const links = [];
  const atomsArray = Array.from(atoms.values()).map(a => a.data || a);
  
  for (const atom of withPurpose) {
    const calls = atom.calls || [];
    for (const call of calls) {
      if (!call.name) continue;
      
      const targetAtom = atomsArray.find(a => a.name === call.name);
      const weight = calculateEdgeWeight(atom, targetAtom);
      
      links.push({
        from: atom.name,
        to: call.name,
        fromPurpose: atom.purpose,
        toPurpose: targetAtom?.purpose || 'UNKNOWN',
        weight,
        callType: targetAtom?.isAsync ? 'async' : 'sync'
      });
    }
  }
  return links;
}

function calculateEdgeWeight(source, target) {
  let weight = 0.5;
  if (target?.purpose === 'API_EXPORT') weight += 0.2;
  if (target?.calledBy?.length > 5) weight += 0.15;
  if (target?.isAsync) weight += 0.1;
  if (target?.purpose === 'TEST_HELPER') weight -= 0.2;
  return Math.max(0.1, Math.min(1.0, weight));
}

export function getApiSubgraph(apiAtoms, links) {
  return links.filter(l => 
    l.fromPurpose === 'API_EXPORT' || l.toPurpose === 'API_EXPORT'
  );
}
