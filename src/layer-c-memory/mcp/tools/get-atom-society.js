/**
 * MCP Tool: get_atom_society
 * Detecta sociedades de átomos: cadenas, clusters y hubs
 * 
 * Usa el módulo estándar de enrichment para cargar relaciones eficientemente.
 */

import { getAllAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';

function findChains(atoms, maxDepth = 5) {
  // Índice primario: id completo → atom
  const atomById = new Map();
  // Índice secundario: nombre simple → atoms exportados de diferentes archivos
  // (los calls solo guardan {name, type, line} sin file ni targetId)
  const atomsByName = new Map();

  for (const atom of atoms) {
    atomById.set(atom.id, atom);
    if (atom.isExported) {
      if (!atomsByName.has(atom.name)) atomsByName.set(atom.name, []);
      atomsByName.get(atom.name).push(atom);
    }
  }

  const exportedAtoms = atoms.filter(a => a.isExported && a.calls?.length > 0);
  const chains = [];
  const visited = new Set();

  function findCrossFileTarget(callName, callerFilePath) {
    // Primero intentar por targetId/file si existen (futuro)
    if (!callName) return null;
    const candidates = atomsByName.get(callName) || [];
    // Preferir atoms exportados de otro archivo
    return candidates.find(a => a.filePath !== callerFilePath) || null;
  }

  function traceChain(atom, chain = [], depth = 0) {
    if (depth >= maxDepth || visited.has(atom.id)) return chain;

    visited.add(atom.id);
    chain.push({
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      purpose: atom.purpose,
      archetype: atom.archetype?.type
    });

    const calls = atom.calls || [];
    for (const call of calls) {
      // Intentar lookup por targetId completo primero, luego por nombre cross-file
      const targetAtom =
        atomById.get(call.targetId) ||
        atomById.get(`${call.file}::${call.name}`) ||
        findCrossFileTarget(call.name, atom.filePath);

      if (targetAtom && targetAtom.filePath !== atom.filePath) {
        traceChain(targetAtom, chain, depth + 1);
        break;
      }
    }

    return chain;
  }
  
  for (const atom of exportedAtoms) {
    visited.clear();
    const chain = traceChain(atom);
    if (chain.length >= 2) {
      chains.push({
        entry: chain[0].name,
        depth: chain.length,
        steps: chain
      });
    }
  }
  
  return chains.sort((a, b) => b.depth - a.depth).slice(0, 15);
}

function findClusters(atoms) {
  const clusters = [];
  const processed = new Set();
  
  for (const atom of atoms) {
    if (processed.has(atom.id)) continue;
    
    const cluster = {
      members: [atom],
      connections: 0
    };
    
    const calledBy = atom.calledBy || [];
    for (const callerId of calledBy) {
      const caller = atoms.find(a => a.id === callerId);
      if (caller && !processed.has(callerId)) {
        cluster.members.push(caller);
        cluster.connections++;
      }
    }
    
    if (cluster.members.length >= 3) {
      clusters.push({
        size: cluster.members.length,
        connections: cluster.connections,
        cohesion: (cluster.connections / (cluster.members.length * (cluster.members.length - 1) / 2)).toFixed(2),
        members: cluster.members.map(m => ({
          id: m.id,
          name: m.name,
          file: m.filePath,
          purpose: m.purpose,
          archetype: m.archetype?.type
        }))
      });
      
      for (const m of cluster.members) {
        processed.add(m.id);
      }
    }
  }
  
  return clusters.sort((a, b) => b.size - a.size).slice(0, 10);
}

function findHubs(atoms, minCallers = 5) {
  return atoms
    .filter(a => (a.callerCount || 0) >= minCallers)
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      callers: a.callerCount || 0,
      purpose: a.purpose,
      archetype: a.archetype?.type,
      complexity: a.complexity
    }))
    .sort((a, b) => b.callers - a.callers);
  
  return hubs.slice(0, 20);
}

function findOrphans(atoms) {
  return atoms
    .filter(a => 
      (!a.callerCount || a.callerCount === 0) && 
      a.isExported && 
      a.callerPattern?.id !== 'entry_point' &&
      a.callerPattern?.id !== 'test_framework' &&
      a.callerPattern?.id !== 'class_instance'
    )
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      purpose: a.purpose,
      callerPattern: a.callerPattern?.id
    }))
    .slice(0, 20);
}

export async function get_atom_society(args, context) {
  const { filePath, minCallers = 5, maxChains = 10 } = args;
  const { projectPath } = context;
  
  try {
    // Cargar átomos y enriquecerlos con relaciones (ESTÁNDAR)
    const allAtoms = await getAllAtoms(projectPath);
    const enrichedAtoms = await enrichAtomsWithRelations(allAtoms, {
      withStats: true,
      withCallers: false,
      withCallees: false
    }, projectPath);
    
    let targetAtoms = enrichedAtoms;
    if (filePath) {
      targetAtoms = enrichedAtoms.filter(a => a.filePath === filePath);
    }
    
    const chains = findChains(targetAtoms);
    const clusters = findClusters(targetAtoms);
    const hubs = findHubs(targetAtoms, minCallers);
    const orphans = findOrphans(targetAtoms);
    
    const totalAtoms = enrichedAtoms.length;
    const withCallers = enrichedAtoms.filter(a => a.callerCount > 0).length;
    const exported = enrichedAtoms.filter(a => a.isExported).length;
    
    // Arrays exposed at top-level so the pagination middleware can reach them.
    // counts/insights are objects → middleware skips them (correct).
    return {
      summary: {
        totalAtoms,
        withCallers,
        exported,
        coverage: ((withCallers / totalAtoms) * 100).toFixed(1) + '%',
        chainCount: chains.length,
        clusterCount: clusters.length,
        hubCount: hubs.length,
        orphanCount: orphans.length
      },
      insights: {
        mostConnected: hubs[0] ? { name: hubs[0].name, file: hubs[0].file, callers: hubs[0].callers } : null,
        longestChain: chains[0] ? { entry: chains[0].entry, depth: chains[0].depth } : null,
        biggestCluster: clusters[0] ? { size: clusters[0].size, cohesion: clusters[0].cohesion, firstMember: clusters[0].members[0]?.name } : null
      },
      chains: chains.slice(0, maxChains),
      clusters,
      hubs,
      orphans
    };
  } catch (error) {
    return { error: error.message };
  }
}
