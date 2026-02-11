/**
 * Cycle Metadata - Extracción y derivación de metadatos
 * 
 * Responsabilidad única: Extraer información de átomos y derivar propiedades
 * 
 * @module cycle-metadata
 */

export function extractCycleMetadata(cycle, atomsIndex) {
  return cycle.map(filePath => {
    const fileData = atomsIndex[filePath] || {};
    const atoms = fileData.atoms || [];
    
    return {
      filePath,
      atomCount: atoms.length,
      atoms: atoms.map(atom => ({
        name: atom.name,
        isAsync: atom.isAsync,
        hasSideEffects: atom.hasSideEffects,
        hasNetworkCalls: atom.hasNetworkCalls,
        hasStorageAccess: atom.hasStorageAccess,
        hasLifecycleHooks: atom.hasLifecycleHooks,
        archetypes: atom.archetypes || [],
        temporal: atom.temporal || {},
        calls: atom.calls || []
      }))
    };
  });
}

export function deriveCycleProperties(cycleMetadata) {
  const allAtoms = cycleMetadata.flatMap(f => f.atoms);
  const totalAtoms = allAtoms.length;
  
  if (totalAtoms === 0) {
    return { cycleLength: cycleMetadata.length, totalAtoms: 0 };
  }
  
  const atomsWithEventEmitters = allAtoms.filter(a => 
    a.temporal?.patterns?.eventEmitter
  );
  
  const atomsWithEventListeners = allAtoms.filter(a =>
    a.temporal?.patterns?.eventListener
  );
  
  const atomsWithLifecycle = allAtoms.filter(a =>
    a.hasLifecycleHooks ||
    a.temporal?.patterns?.lifecycleHooks?.length > 0
  );
  
  const atomsWithInit = allAtoms.filter(a =>
    a.temporal?.patterns?.initialization
  );
  
  const atomsWithWebSocket = allAtoms.filter(a =>
    a.hasNetworkCalls
  );
  
  const allArchetypes = [...new Set(allAtoms.flatMap(a => a.archetypes || []))];
  
  return {
    cycleLength: cycleMetadata.length,
    totalAtoms,
    hasEventEmitters: atomsWithEventEmitters.length > 0,
    hasEventListeners: atomsWithEventListeners.length > 0,
    hasLifecycleHooks: atomsWithLifecycle.length > 0,
    hasInitialization: atomsWithInit.length > 0,
    hasWebSocket: atomsWithWebSocket.length > 0,
    hasSideEffects: allAtoms.some(a => a.hasSideEffects),
    hasAsync: allAtoms.some(a => a.isAsync),
    hasStateManagement: allArchetypes.includes('store'),
    hasHandlers: allArchetypes.includes('handler'),
    eventDrivenRatio: (atomsWithEventEmitters.length + atomsWithEventListeners.length) / totalAtoms,
    staticImportRatio: cycleMetadata.filter(f => 
      f.atoms.every(a => !a.hasSideEffects && !a.hasNetworkCalls)
    ).length / cycleMetadata.length,
    archetypes: allArchetypes
  };
}

export default { extractCycleMetadata, deriveCycleProperties };
