/**
 * @fileoverview vector-calculator.js
 * 
 * Calcula vectores matematicos para atomos.
 * Estos vectores son usados en Semantic Algebra para operaciones
 * determinísticas sobre el grafo de código.
 * 
 * @module storage/repository/utils/vector-calculator
 */

/**
 * Calcula todos los vectores matematicos de un atomo
 * @param {Object} atom - Atomo base
 * @param {Object} context - Contexto adicional (callers, callees, git history)
 * @returns {Object} Vectores calculados
 */
export function calculateAtomVectors(atom, context = {}) {
  const {
    callers = [],
    callees = [],
    gitHistory = null
  } = context;

  return {
    // Vectores estructurales
    linesOfCode: calculateLinesOfCode(atom),
    parameterCount: atom.signature?.params?.length || 0,
    
    // Vectores relacionales
    callersCount: callers.length,
    calleesCount: callees.length,
    dependencyDepth: calculateDependencyDepth(atom, context),
    externalCallCount: atom.externalCalls?.length || 0,
    
    // Vectores semanticos
    archetypeWeight: calculateArchetypeWeight(atom),
    cohesionScore: calculateCohesion(atom),
    couplingScore: calculateCoupling(atom, context),
    
    // Vectores temporales
    changeFrequency: gitHistory?.changeFrequency || 0,
    ageDays: gitHistory?.ageDays || 0,
    
    // Vectores calculados para Semantic Algebra
    importance: calculateImportance(atom, context),
    stability: calculateStability(atom, gitHistory),
    propagationScore: calculatePropagation(atom, context),
    fragilityScore: calculateFragility(atom, context),
    testabilityScore: calculateTestability(atom, context)
  };
}

/**
 * Calcula lineas de código
 */
export function calculateLinesOfCode(atom) {
  if (atom.linesOfCode) return atom.linesOfCode;
  if (atom.endLine && atom.line) return atom.endLine - atom.line + 1;
  if (atom.lines?.end && atom.lines?.start) return atom.lines.end - atom.lines.start + 1;
  return 0;
}

/**
 * Calcula peso del arquetipo (0-1)
 * Basado en severidad y confianza
 */
export function calculateArchetypeWeight(atom) {
  const severity = atom.archetype?.severity || 0;
  const confidence = atom.archetype?.confidence || 0;
  
  // Normalizar: severity 1-10 -> 0.1-1.0
  const normalizedSeverity = severity / 10;
  
  // Peso = severidad * confianza
  return normalizedSeverity * confidence;
}

/**
 * Calcula cohesión interna del atomo (0-1)
 * Alta cohesion = baja complejidad relativa a LOC
 */
export function calculateCohesion(atom) {
  const loc = calculateLinesOfCode(atom);
  const complexity = atom.complexity || 1;
  
  if (loc === 0) return 1; // Default: cohesion perfecta
  
  // Cohesion inversamente proporcional a complejidad/loc
  const ratio = complexity / loc;
  
  // Normalizar: ratio 0.1 = cohesion 1.0, ratio 0.5 = cohesion 0.5
  const cohesion = Math.max(0, Math.min(1, 1 - (ratio * 2)));
  
  return Math.round(cohesion * 100) / 100;
}

/**
 * Calcula acoplamiento externo (0-1)
 * Alto acoplamiento = muchas dependencias
 */
export function calculateCoupling(atom, context = {}) {
  const { callers = [], callees = [] } = context;
  
  const externalCalls = atom.externalCalls?.length || 0;
  const totalCalls = (atom.calls?.length || 0);
  const totalConnections = callers.length + callees.length + totalCalls;
  
  if (totalConnections === 0) return 0;
  
  // Acoplamiento basado en:
  // - Ratio de llamadas externas
  // - Cantidad de conexiones totales (con umbral en 20)
  const externalRatio = totalCalls > 0 ? externalCalls / totalCalls : 0;
  const connectionFactor = Math.min(totalConnections / 20, 1);
  
  // Peso: 60% conexiones, 40% externas
  const coupling = (connectionFactor * 0.6) + (externalRatio * 0.4);
  
  return Math.round(coupling * 100) / 100;
}

/**
 * Calcula profundidad en el grafo de dependencias
 */
function calculateDependencyDepth(atom, context = {}) {
  // Simplificacion: depth basado en cuantas capas de imports
  // En implementacion real seria BFS desde entry points
  const filePath = atom.file || atom.filePath || '';
  const depth = filePath.split('/').length - 1;
  
  return Math.min(depth, 10); // Cap en 10
}

/**
 * Calcula importancia del atomo (PageRank-like) (0-1)
 * Atomo importante = muchos callers + es exportado + complejidad alta
 */
export function calculateImportance(atom, context = {}) {
  const { callers = [] } = context;
  
  // Factores
  const callerCount = callers.length;
  const isExported = atom.isExported || atom.exported ? 1 : 0;
  const complexity = Math.min(atom.complexity || 1, 50) / 50; // Normalizado 0-1
  
  // Peso de callers con decaimiento logaritmico
  const callerWeight = callerCount > 0 ? Math.log2(callerCount + 1) / 5 : 0;
  const cappedCallerWeight = Math.min(callerWeight, 0.5); // Max 50% por callers
  
  // Formula: 40% callers + 30% export + 30% complexity
  const importance = (cappedCallerWeight * 0.4) + 
                     (isExported * 0.3) + 
                     (complexity * 0.3);
  
  return Math.round(importance * 100) / 100;
}

/**
 * Calcula estabilidad (0-1)
 * Estable = pocos cambios en el tiempo
 */
export function calculateStability(atom, gitHistory = null) {
  if (!gitHistory) return 1.0; // Default: estable
  
  const changeFreq = gitHistory.changeFrequency || 0;
  
  // Estabilidad inversamente proporcional a frecuencia de cambios
  // 0 cambios/dia = 1.0, 1 cambio/dia = 0.0
  const stability = Math.max(0, 1 - changeFreq);
  
  return Math.round(stability * 100) / 100;
}

/**
 * Calcula score de propagación de cambios (0-1)
 * Alto score = cambiar este atomo afecta mucho
 */
export function calculatePropagation(atom, context = {}) {
  const { callers = [], callees = [] } = context;
  
  // Factores
  const complexity = atom.complexity || 1;
  const callerCount = callers.length;
  const calleeCount = callees.length;
  const coupling = calculateCoupling(atom, context);
  
  // Normalizar
  const normComplexity = Math.min(complexity / 30, 1); // Max en complejidad 30
  const normCallers = Math.min(callerCount / 10, 1);   // Max en 10 callers
  const normCallees = Math.min(calleeCount / 10, 1);   // Max en 10 callees
  
  // Formula ponderada
  // 30% complejidad + 30% callers + 20% callees + 20% coupling
  const propagation = (normComplexity * 0.30) +
                      (normCallers * 0.30) +
                      (normCallees * 0.20) +
                      (coupling * 0.20);
  
  return Math.round(propagation * 100) / 100;
}

/**
 * Calcula fragilidad (0-1)
 * Fragil = alta complejidad + sin error handling + network calls
 */
function calculateFragility(atom, context = {}) {
  const complexity = Math.min((atom.complexity || 1) / 20, 1);
  const noErrorHandling = atom.hasErrorHandling ? 0 : 1;
  const hasNetwork = atom.hasNetworkCalls ? 0.5 : 0;
  const highCoupling = calculateCoupling(atom, context);
  
  // Formula: complejidad + falta error handling + network + coupling
  const fragility = (complexity * 0.3) +
                    (noErrorHandling * 0.3) +
                    (hasNetwork * 0.2) +
                    (highCoupling * 0.2);
  
  return Math.round(fragility * 100) / 100;
}

/**
 * Calcula testabilidad (0-1)
 * Testable = baja complejidad + pocos side effects + cohesion alta
 */
function calculateTestability(atom, context = {}) {
  const lowComplexity = 1 - Math.min((atom.complexity || 1) / 20, 1);
  const noSideEffects = atom.hasSideEffects ? 0 : 1;
  const highCohesion = calculateCohesion(atom);
  const fewParams = atom.signature?.params?.length < 4 ? 1 : 0.5;
  
  // Formula: complejidad + side effects + cohesion + params
  const testability = (lowComplexity * 0.3) +
                      (noSideEffects * 0.3) +
                      (highCohesion * 0.2) +
                      (fewParams * 0.2);
  
  return Math.round(testability * 100) / 100;
}

/**
 * Calcula compatibilidad entre dos atomos para merge (0-1)
 * Usado en operacion merge_nodes de Semantic Algebra
 */
export function calculateCompatibility(atomA, atomB) {
  // Similaridad de vectores (cosine similarity simplificada)
  const vectorA = [
    atomA.complexity || 1,
    atomA.linesOfCode || 0,
    atomA.parameterCount || 0,
    atomA.callersCount || 0,
    atomA.calleesCount || 0
  ];
  
  const vectorB = [
    atomB.complexity || 1,
    atomB.linesOfCode || 0,
    atomB.parameterCount || 0,
    atomB.callersCount || 0,
    atomB.calleesCount || 0
  ];
  
  // Cosine similarity
  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
  
  if (normA === 0 || normB === 0) return 0;
  
  const similarity = dotProduct / (normA * normB);
  
  // Shared callers ratio
  const callersA = new Set(atomA.calledBy || []);
  const callersB = new Set(atomB.calledBy || []);
  const intersection = [...callersA].filter(x => callersB.has(x));
  const sharedRatio = intersection.length / Math.max(callersA.size, callersB.size, 1);
  
  // Compatibilidad: 60% similarity + 40% shared callers
  const compatibility = (similarity * 0.6) + (sharedRatio * 0.4);
  
  return Math.round(compatibility * 100) / 100;
}

/**
 * Calcula impacto de una operacion rename
 * Usado en Semantic Algebra
 */
export function calculateRenameImpact(atom, context = {}) {
  const { callers = [] } = context;
  
  // Impacto = suma de importancia de cada caller
  let totalImpact = 0;
  
  for (const caller of callers) {
    const callerImportance = caller.importance || 0.5;
    const propagation = caller.propagationScore || 0.5;
    
    totalImpact += callerImportance * propagation;
  }
  
  // Normalizar
  return Math.min(totalImpact, 1.0);
}

/**
 * Calcula impacto de una operacion move
 */
export function calculateMoveImpact(atom, context = {}) {
  const { affectedFiles = [] } = context;
  
  // Impacto proporcional a archivos afectados
  const fileImpact = Math.min(affectedFiles.length / 10, 1);
  
  // Multiplicado por propagation score promedio
  const avgPropagation = context.avgPropagation || 0.5;
  
  return Math.round(fileImpact * avgPropagation * 100) / 100;
}