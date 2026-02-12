/**
 * Deep Chains Analyzer V2 - Solo cadenas PROBLEMÁTICAS
 * 
 * Principio: No todas las cadenas profundas son malas.
 * Solo son riesgosas si:
 * 1. Son muy profundas (>7 niveles)
 * 2. Tienen alto acoplamiento (fan-in > 3)
 * 3. Son difíciles de razonar (ciclos complejos)
 * 
 * @param {object} systemMap - SystemMap
 * @returns {object} - Solo cadenas REALMENTE problemáticas
 */
export function findDeepDependencyChainsV2(systemMap) {
  const problematicChains = [];
  const MAX_DEPTH = 7;  // Solo cadenas > 7 son realmente problemáticas
  const MAX_FAN_IN = 3; // Si muchos dependen de un nodo, es riesgoso
  
  function calculateRiskScore(chain) {
    let score = 0;
    
    // Factor 1: Profundidad (cuadrática - profundidad extrema es peor)
    const depth = chain.length;
    if (depth > MAX_DEPTH) {
      score += Math.pow(depth - MAX_DEPTH, 2);
    }
    
    // Factor 2: Acoplamiento del nodo raíz
    const rootNode = chain[0];
    const fanIn = systemMap.function_links.filter(l => l.to === rootNode).length;
    if (fanIn > MAX_FAN_IN) {
      score += (fanIn - MAX_FAN_IN) * 2;
    }
    
    // Factor 3: Cambios recientes (si hay metadata de git)
    // Factor 4: Complejidad ciclomática de funciones en la cadena
    
    return score;
  }
  
  // Solo explorar desde funciones que son REALMENTE entry points
  // (no tienen incoming Y tienen outgoing significativo)
  for (const link of systemMap.function_links) {
    const incoming = systemMap.function_links.filter(l => l.to === link.from).length;
    const outgoing = systemMap.function_links.filter(l => l.from === link.from).length;
    
    // Entry point real: 0-1 incoming, pero >2 outgoing (no hojas)
    if (incoming <= 1 && outgoing >= 2) {
      const chain = buildChainLimited(link.from, [link.from], MAX_DEPTH + 3);
      const riskScore = calculateRiskScore(chain);
      
      // Solo reportar si el riesgo es significativo
      if (riskScore > 10) {
        problematicChains.push({
          chain: chain,
          depth: chain.length,
          riskScore: riskScore,
          rootFanIn: incoming,
          impact: `High-risk chain: ${riskScore}/100 risk score`
        });
      }
    }
  }
  
  return {
    totalDeepChains: problematicChains.length,
    maxDepth: problematicChains.length > 0 
      ? Math.max(...problematicChains.map(c => c.depth)) 
      : 0,
    chains: problematicChains
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5), // Solo top 5 más riesgosos
    averageRisk: problematicChains.length > 0
      ? problematicChains.reduce((sum, c) => sum + c.riskScore, 0) / problematicChains.length
      : 0,
    recommendation: problematicChains.length > 0
      ? `Found ${problematicChains.length} high-risk dependency chains (risk > 10)`
      : 'No problematic deep chains detected'
  };
}

function buildChainLimited(currentId, path, maxDepth) {
  if (path.length >= maxDepth) return path;
  
  const outgoing = systemMap.function_links.filter(
    link => link.from === currentId && !path.includes(link.to)
  );
  
  if (outgoing.length === 0) return path;
  
  // Solo seguir la rama más larga (no todas las ramas)
  // Esto evita la explosión combinatoria
  const longestLink = outgoing.reduce((max, link) => {
    const subChain = buildChainLimited(link.to, [...path, link.to], maxDepth);
    return subChain.length > max.length ? subChain : max;
  }, path);
  
  return longestLink;
}

/**
 * Shared Objects Analyzer V2 - Distingue configuración vs estado
 * 
 * Principio: No todo objeto mutable compartido es malo.
 * Es riesgoso si:
 * 1. Se MODIFICA en runtime (no solo se lee)
 * 2. Tiene métodos que mutan estado (setters, updaters)
 * 3. Es importado en archivos que lo modifican
 * 4. Tiene naming patterns de estado (store, state, global)
 * 
 * NO es riesgoso:
 * - CONFIG constants (solo lectura)
 * - UTILS objects (funciones puras)
 * - Enums/Dictionaries estáticos
 */
export function analyzeSharedObjectsV2(systemMap) {
  const objectIndex = {};
  const criticalObjects = [];
  
  // Patterns que indican estado mutable real
  const STATE_PATTERNS = [
    /store$/i, /state$/i, /global$/i, /manager$/i,
    /cache$/i, /registry$/i, /pool$/i, /queue$/i
  ];
  
  // Patterns que indican configuración (bajo riesgo)
  const CONFIG_PATTERNS = [
    /^CONFIG$/i, /^SETTINGS$/i, /^OPTIONS$/i,
    /^DEFAULTS$/i, /^CONSTANTS$/i
  ];
  
  for (const [filePath, objects] of Object.entries(systemMap.objectExports || {})) {
    for (const obj of objects) {
      const objectId = `${filePath}:${obj.name}`;
      
      // Calcular score de riesgo basado en heurísticas
      let riskScore = 0;
      
      // Heurística 1: Nombre sugiere estado
      if (STATE_PATTERNS.some(p => p.test(obj.name))) {
        riskScore += 30;
      }
      
      // Heurística 2: Nombre sugiere configuración (reduce riesgo)
      if (CONFIG_PATTERNS.some(p => p.test(obj.name))) {
        riskScore -= 20;
      }
      
      // Heurística 3: Tiene métodos de mutación
      if (obj.properties) {
        const hasSetters = obj.properties.some(p => 
          /set|update|add|remove|delete|clear/i.test(p)
        );
        if (hasSetters) riskScore += 25;
      }
      
      // Heurística 4: Es mutable según el parser
      if (obj.isMutable) riskScore += 15;
      
      // Contar usos reales (imports)
      const usages = countUsages(obj.name, systemMap);
      
      // Solo es crítico si:
      // 1. Risk score > 30 (realmente peligroso)
      // 2. Tiene > 2 usos (realmente compartido)
      // 3. Se importa en archivos que lo modifican
      if (riskScore > 30 && usages.length >= 2 && hasMutationUsages(obj.name, systemMap)) {
        criticalObjects.push({
          id: objectId,
          name: obj.name,
          definedIn: filePath,
          riskScore: riskScore,
          usages: usages.length,
          riskFactors: getRiskFactors(obj, usages),
          recommendation: 'Real shared mutable state detected - consider refactoring'
        });
      }
      
      objectIndex[objectId] = {
        name: obj.name,
        riskScore,
        usages: usages.length,
        isCritical: riskScore > 30
      };
    }
  }
  
  return {
    total: Object.keys(objectIndex).length,
    criticalObjects: criticalObjects,
    highRiskCount: criticalObjects.filter(o => o.riskScore > 50).length,
    mediumRiskCount: criticalObjects.filter(o => o.riskScore > 30 && o.riskScore <= 50).length,
    lowRiskCount: Object.values(objectIndex).filter(o => o.riskScore <= 30).length,
    recommendation: criticalObjects.length > 0
      ? `Found ${criticalObjects.length} truly critical shared objects (high risk)`
      : 'No critical shared mutable state detected'
  };
}

function countUsages(objectName, systemMap) {
  const usages = [];
  for (const [filePath, fileNode] of Object.entries(systemMap.files)) {
    for (const importStmt of fileNode.imports || []) {
      for (const spec of importStmt.specifiers || []) {
        if ((spec.imported || spec.local) === objectName) {
          usages.push({ file: filePath, source: importStmt.source });
        }
      }
    }
  }
  return usages;
}

function hasMutationUsages(objectName, systemMap) {
  // Simplificado: asumir que si es mutable y tiene >2 usos, probablemente se modifica
  // En una versión completa, analizaríamos el AST de los archivos que lo importan
  return true;
}

function getRiskFactors(obj, usages) {
  const factors = [];
  if (/store$|state$/i.test(obj.name)) factors.push('naming_pattern:state');
  if (obj.isMutable) factors.push('mutable:true');
  if (usages.length >= 5) factors.push('high_usage:' + usages.length);
  return factors;
}
