/**
 * MCP Tool: get_atom_society
 * Detecta sociedades de átomos: cadenas, clusters y hubs
 */

import { loadAtoms } from '#layer-c/storage/index.js';
import fs from 'fs/promises';
import path from 'path';

async function loadAllAtoms(projectPath) {
  const atomsDir = path.join(projectPath, '.omnysysdata', 'atoms');
  const atoms = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            atoms.push(JSON.parse(content));
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(atomsDir);
  return atoms;
}

function findChains(atoms, maxDepth = 5) {
  const atomMap = new Map();
  const exportedAtoms = atoms.filter(a => a.isExported && a.calls?.length > 0);
  
  for (const atom of atoms) {
    atomMap.set(atom.id, atom);
  }
  
  const chains = [];
  const visited = new Set();
  
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
      const targetAtom = atomMap.get(call.targetId || `${call.file}::${call.name}`);
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
  
  return chains.sort((a, b) => b.depth - a.depth).slice(0, 20);
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
          purpose: m.purpose
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
  const hubs = atoms
    .filter(a => (a.calledBy?.length || 0) >= minCallers)
    .map(a => ({
      id: a.id,
      name: a.name,
      file: a.filePath,
      callers: a.calledBy?.length || 0,
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
      (!a.calledBy || a.calledBy.length === 0) && 
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
    const allAtoms = await loadAllAtoms(projectPath);
    
    let targetAtoms = allAtoms;
    if (filePath) {
      targetAtoms = allAtoms.filter(a => a.filePath === filePath);
    }
    
    const chains = findChains(targetAtoms);
    const clusters = findClusters(targetAtoms);
    const hubs = findHubs(targetAtoms, minCallers);
    const orphans = findOrphans(targetAtoms);
    
    const totalAtoms = allAtoms.length;
    const withCallers = allAtoms.filter(a => a.calledBy?.length > 0).length;
    const exported = allAtoms.filter(a => a.isExported).length;
    
    return {
      summary: {
        totalAtoms,
        withCallers,
        exported,
        coverage: ((withCallers / totalAtoms) * 100).toFixed(1) + '%'
      },
      chains: {
        count: chains.length,
        top: chains.slice(0, maxChains)
      },
      clusters: {
        count: clusters.length,
        top: clusters
      },
      hubs: {
        count: hubs.length,
        top: hubs
      },
      orphans: {
        count: orphans.length,
        top: orphans
      },
      insights: {
        mostConnected: hubs[0] || null,
        longestChain: chains[0] || null,
        biggestCluster: clusters[0] || null
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
