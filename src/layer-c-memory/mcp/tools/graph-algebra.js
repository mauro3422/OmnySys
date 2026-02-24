/**
 * @fileoverview Graph Algebra Operations for Atoms
 * 
 * Operaciones algebraicas sobre el grafo de átomos usando las APIs existentes.
 * 
 * @module mcp/tools/graph-algebra
 */

import { queryAtoms, getAtomsInFile, enrichAtomsWithRelations, getAllAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';
import path from 'path';

const logger = createLogger('OmnySys:graph-algebra');

function getProjectPath(context) {
  // Ensure we have a valid projectPath
  return context?.projectPath || process.cwd();
}

/**
 * get_impact_propagation
 * 
 * Query algebraico: dado un átomo, encuentra todos los que se afectan
 * si este cambia. Usa enriquecimiento de relaciones.
 */
export async function get_impact_propagation(args, context) {
  const { atomId, maxDepth = 3 } = args;
  const projectPath = getProjectPath(context);
  
  logger.info(`[GraphAlgebra] get_impact_propagation("${atomId}", depth: ${maxDepth})`);
  
  try {
    // Parse atomId: "filePath::functionName"
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    logger.info(`[GraphAlgebra] Parsed - filePath: "${filePath}", functionName: "${functionName}"`);
    
    // Get atoms from file
    const atoms = await getAtomsInFile(projectPath, filePath);
    logger.info(`[GraphAlgebra] Got ${atoms.length} atoms from file`);
    
    // Find the specific atom by name
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) {
      logger.info(`[GraphAlgebra] Atom not found, trying first atom`);
      // Try first atom if not found
      const firstAtom = atoms[0];
      if (!firstAtom) {
        return { error: 'ATOM_NOT_FOUND', atomId };
      }
      
      const enriched = await enrichAtomsWithRelations([firstAtom], {
        scope: 'ids',
        ids: [firstAtom.id],
        withCallers: true,
        withCallees: true,
        withStats: true
      }, projectPath);
      
      const atomWithRelations = enriched[0] || {};
      const callees = atomWithRelations.callees || [];
      
      return {
        source: { id: firstAtom.id, name: firstAtom.name },
        directlyAffected: {
          count: callees.length,
          atoms: callees.slice(0, 20).map(id => ({ id }))
        },
        transitivelyAffected: { count: 0, atoms: [] },
        propagationDepth: maxDepth,
        totalImpactScore: callees.length,
        summary: callees.length > 10 ? 'HIGH' : callees.length > 5 ? 'MEDIUM' : 'LOW'
      };
    }
    
    logger.info(`[GraphAlgebra] Found atom: ${atom.name}, id: ${atom.id}`);
    
    // Enriquecer con relaciones - con withCallees para ver a quién llama
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atomId],
      withCallers: true,
      withCallees: true,
      withStats: true
    }, projectPath);
    
    const atomWithRelations = enriched[0] || {};
    
    // Directly affected = atoms que este llama (callees)
    const callees = atomWithRelations.callees || [];
    
    // Transitively affected = buscar en profundidad
    const transitiveAtoms = [];
    const visited = new Set([atomId]);
    
    async function findTransitive(currentAtomId, depth) {
      if (depth >= maxDepth) return;
      
      const currentAtoms = await queryAtoms(projectPath, { ids: [currentAtomId] }, 1);
      if (!currentAtoms[0]) return;
      
      const enrichedCurrent = await enrichAtomsWithRelations([currentAtoms[0]], {
        scope: 'ids',
        ids: [currentAtomId],
        withCallees: true
      }, projectPath);
      
      const currentCallees = enrichedCurrent[0]?.callees || [];
      
      for (const calleeId of currentCallees) {
        if (!visited.has(calleeId)) {
          visited.add(calleeId);
          
          // Obtener info del átomo
          const calleeAtoms = await queryAtoms(projectPath, { ids: [calleeId] }, 1);
          if (calleeAtoms[0]) {
            transitiveAtoms.push({ 
              id: calleeId, 
              name: calleeAtoms[0].name, 
              filePath: calleeAtoms[0].file_path,
              depth: depth + 1 
            });
          }
          
          await findTransitive(calleeId, depth + 1);
        }
      }
    }
    
    await findTransitive(atomId, 1);
    
    // Calcular score
    const totalImpact = callees.length + transitiveAtoms.length;
    
    return {
      source: { id: atom.id, name: atom.name },
      directlyAffected: {
        count: callees.length,
        atoms: callees.slice(0, 20).map(id => ({ id }))
      },
      transitivelyAffected: {
        count: transitiveAtoms.length,
        atoms: transitiveAtoms.slice(0, 20)
      },
      propagationDepth: maxDepth,
      totalImpactScore: totalImpact,
      summary: totalImpact > 10 ? 'HIGH' : totalImpact > 5 ? 'MEDIUM' : 'LOW',
      algebra: {
        type: 'enrichment_based_propagation',
        decay: 'depth_based'
      }
    };
    
  } catch (error) {
    logger.error(`[GraphAlgebra] Error: ${error.message}`);
    return { error: error.message, atomId };
  }
}

/**
 * get_atom_family
 * 
 * Encuentra la "familia" de un átomo usando las APIs existentes
 */
export async function get_atom_family(args, context) {
  const { atomId } = args;
  const projectPath = getProjectPath(context);
  
  logger.info(`[GraphAlgebra] get_atom_family("${atomId}")`);
  
  try {
    // Parse atomId
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    // Try queryAtoms with filePath filter first
    let atoms = [];
    try {
      atoms = await queryAtoms(projectPath, { filePath }, 100) || [];
    } catch (e) {
      logger.error(`[GraphAlgebra] queryAtoms error: ${e.message}`);
    }
    
    // If empty, try with getAtomsInFile
    if (!Array.isArray(atoms) || atoms.length === 0) {
      try {
        atoms = await getAtomsInFile(projectPath, filePath) || [];
      } catch (e) {
        logger.error(`[GraphAlgebra] getAtomsInFile error: ${e.message}`);
        atoms = [];
      }
    }
    
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return { error: 'FILE_NOT_FOUND', atomId, filePath };
    }
    
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) {
      return { error: 'ATOM_NOT_FOUND', atomId };
    }
    
    // Enriquecer con relaciones
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atom.id],
      withCallers: true,
      withCallees: true,
      withStats: true
    }, projectPath);
    
    const atomWithRelations = enriched[0] || {};
    
    // Hermanos: mismos archivo (excluyendo el átomo actual)
    const siblings = atoms.filter(a => a.id !== atom.id);
    
    // Obtener info de callers (quienes llaman a este)
    const callerIds = (atomWithRelations.callers || []).filter(id => id !== atom.id);
    const callers = await queryAtoms(projectPath, { ids: callerIds }, 20);
    
    // Obtener info de callees (a quienes llama este)
    const calleeIds = (atomWithRelations.callees || []).filter(id => id !== atom.id);
    const callees = await queryAtoms(projectPath, { ids: calleeIds }, 20);
    
    // Cluster: unique atoms from callers + callees
    const clusterIds = new Set([...callerIds, ...calleeIds]);
    const clusterAtoms = await queryAtoms(projectPath, { ids: Array.from(clusterIds) }, 20);
    
    return {
      atom: {
        id: atom.id,
        name: atom.name,
        archetype: atom.archetype_type,
        purpose: atom.purpose_type
      },
      siblings: {
        count: siblings.length,
        atoms: siblings.slice(0, 20).map(s => ({ id: s.id, name: s.name }))
      },
      cluster: {
        count: clusterAtoms.length,
        atoms: clusterAtoms.slice(0, 20).map(a => ({ id: a.id, name: a.name, filePath: a.file_path }))
      },
      callers: {
        count: callerIds.length,
        atoms: callers.slice(0, 20).map(a => ({ id: a.id, name: a.name, filePath: a.file_path }))
      },
      callees: {
        count: calleeIds.length,
        atoms: callees.slice(0, 20).map(a => ({ id: a.id, name: a.name, filePath: a.file_path }))
      }
    };
    
  } catch (error) {
    logger.error(`[GraphAlgebra] Error: ${error.message}`);
    return { error: error.message, atomId };
  }
}

/**
 * predict_breaking_changes
 * 
 * Predice cambios que podrían romper otros átomos
 */
export async function predict_breaking_changes(args, context) {
  const { atomId } = args;
  const projectPath = getProjectPath(context);
  
  logger.info(`[GraphAlgebra] predict_breaking_changes("${atomId}")`);
  
  try {
    // Parse atomId
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    // Get atoms from file
    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) {
      return { error: 'ATOM_NOT_FOUND', atomId };
    }
    
    // Enriquecer con relaciones - con callers para ver quién depende de este
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atomId],
      withCallers: true,
      withStats: true
    }, projectPath);
    
    const atomWithRelations = enriched[0] || {};
    
    // Átomos que dependen de este (callers)
    const callerIds = atomWithRelations.callers || [];
    const dependents = await queryAtoms(projectPath, { ids: callerIds }, 50);
    
    // Calcular riesgo
    const predictions = dependents.map(d => {
      const fragility = d.fragility_score || 0.3;
      const testability = d.testability_score || 0.5;
      const breakProb = fragility * (1 - testability);
      
      return {
        id: d.id,
        name: d.name,
        filePath: d.file_path,
        fragility,
        testability,
        breakProbability: breakProb.toFixed(3),
        risk: breakProb > 0.5 ? 'HIGH' : breakProb > 0.25 ? 'MEDIUM' : 'LOW',
        reason: testability < 0.5 ? 'Low testability' : fragility > 0.5 ? 'High fragility' : 'Normal'
      };
    }).sort((a, b) => b.breakProbability - a.breakProbability);
    
    const highRisk = predictions.filter(p => p.risk === 'HIGH');
    const mediumRisk = predictions.filter(p => p.risk === 'MEDIUM');
    
    return {
      source: { id: atom.id, name: atom.name },
      dependentsCount: dependents.length,
      predictions: {
        high: { count: highRisk.length, atoms: highRisk.slice(0, 10) },
        medium: { count: mediumRisk.length, atoms: mediumRisk.slice(0, 10) },
        low: { count: predictions.length - highRisk.length - mediumRisk.length }
      },
      recommendation: highRisk.length > 0 
        ? 'HIGH RISK: Changing this atom may break multiple dependents'
        : mediumRisk.length > 0
          ? 'MEDIUM RISK: Some dependents may be affected'
          : 'LOW RISK: Changes are likely safe'
    };
    
  } catch (error) {
    logger.error(`[GraphAlgebra] Error: ${error.message}`);
    return { error: error.message, atomId };
  }
}

/**
 * calculate_atom_centrality
 * 
 * Calcula centralidad usando relaciones existentes
 */
export async function calculate_atom_centrality(args, context) {
  const { atomId } = args;
  const projectPath = getProjectPath(context);
  
  try {
    // Parse atomId
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    // Get atoms from file
    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) {
      return { error: 'ATOM_NOT_FOUND', atomId };
    }
    
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atom.id],
      withCallers: true,
      withCallees: true,
      withStats: true
    }, projectPath);
    
    const atomWithRelations = enriched[0] || {};
    
    const inDegree = atomWithRelations.callers?.length || 0;
    const outDegree = atomWithRelations.callees?.length || 0;
    const centrality = inDegree / (outDegree + 1);
    
    return {
      atomId,
      inDegree,
      outDegree,
      centrality: centrality.toFixed(3),
      classification: centrality > 10 ? 'HUB' : centrality > 2 ? 'BRIDGE' : 'LEAF'
    };
    
  } catch (error) {
    return { error: error.message, atomId };
  }
}

export default {
  get_impact_propagation,
  get_atom_family,
  predict_breaking_changes,
  calculate_atom_centrality
};
