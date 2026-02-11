/**
 * @fileoverview Tunnel Vision Detector - REFACTORIZADO para Arquitectura Molecular
 *
 * Detecta cuando modificas una función (átomo) pero hay funciones dependientes
 * que NO fueron modificadas (tunnel vision).
 *
 * CORE IDEA (Molecular): Si cambias átomo A que es llamado por B, C, D
 *                        y NO modificas B, C, D → ALERTA de tunnel vision
 *
 * V3.0: Ahora usa átomos (funciones) como unidad primaria, siguiendo SSOT.
 *
 * @module core/tunnel-vision-detector
 * @version 3.0.0
 */

import {
  getAtomDetails,
  getFileAnalysisWithAtoms
} from '../layer-a-static/query/apis/file-api.js';

/**
 * Historial de átomos modificados recientemente
 * Key: atomId (filePath::functionName), Value: timestamp
 */
const recentlyModifiedAtoms = new Map();
const RECENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Threshold: mínimo de átomos dependientes no modificados para alertar
 */
const MIN_UNMODIFIED_DEPENDENTS = 2;

/**
 * Verifica si un átomo fue modificado recientemente
 * @param {string} atomId - ID del átomo (filePath::functionName)
 * @returns {boolean}
 */
function wasRecentlyModified(atomId) {
  const timestamp = recentlyModifiedAtoms.get(atomId);
  if (!timestamp) return false;

  const now = Date.now();
  const age = now - timestamp;

  if (age > RECENT_WINDOW_MS) {
    recentlyModifiedAtoms.delete(atomId);
    return false;
  }

  return true;
}

/**
 * Registra que un átomo fue modificado
 * @param {string} atomId - ID del átomo
 */
function markAtomAsModified(atomId) {
  recentlyModifiedAtoms.set(atomId, Date.now());
}

/**
 * Obtiene información completa de un átomo y sus callers
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object|null>} - Info del átomo o null
 */
async function getAtomWithCallers(projectPath, filePath, functionName) {
  const atom = await getAtomDetails(projectPath, filePath, functionName);
  if (!atom) return null;
  
  return {
    ...atom,
    callers: atom.calledBy || []
  };
}

/**
 * Detecta tunnel vision cuando una función es modificada
 * V3.0: Usa átomos (funciones) como unidad primaria
 *
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo modificado
 * @param {string} [functionName] - Función específica modificada (opcional)
 * @returns {Promise<Object|null>} - Alerta de tunnel vision o null
 */
export async function detectTunnelVision(projectPath, filePath, functionName = null) {
  // Si no se especifica función, analizar todas las funciones del archivo
  if (!functionName) {
    return detectTunnelVisionForFile(projectPath, filePath);
  }
  
  // Modo atómico: detectar para función específica
  const atomId = `${filePath}::${functionName}`;
  markAtomAsModified(atomId);
  
  const atom = await getAtomWithCallers(projectPath, filePath, functionName);
  if (!atom) return null;
  
  // Obtener callers no modificados
  const unmodifiedCallers = atom.callers.filter(callerId => !wasRecentlyModified(callerId));
  
  if (unmodifiedCallers.length < MIN_UNMODIFIED_DEPENDENTS) {
    return null;
  }
  
  return createTunnelVisionAlert({
    type: 'ATOMIC',
    modifiedAtom: atomId,
    filePath,
    functionName,
    atom,
    unmodifiedCallers,
    totalCallers: atom.callers.length
  });
}

/**
 * Detecta tunnel vision para todas las funciones de un archivo
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo modificado
 * @returns {Promise<Object|null>} - Alerta agregada o null
 */
async function detectTunnelVisionForFile(projectPath, filePath) {
  const fileData = await getFileAnalysisWithAtoms(projectPath, filePath);
  if (!fileData || !fileData.atoms || fileData.atoms.length === 0) {
    return null;
  }
  
  const allAlerts = [];
  
  for (const atom of fileData.atoms) {
    if (atom.isExported && atom.calledBy && atom.calledBy.length > 0) {
      markAtomAsModified(atom.id);
      
      const unmodifiedCallers = atom.calledBy.filter(callerId => !wasRecentlyModified(callerId));
      
      if (unmodifiedCallers.length >= MIN_UNMODIFIED_DEPENDENTS) {
        allAlerts.push({
          atom: atom.name,
          atomId: atom.id,
          unmodifiedCallers,
          severity: calculateAtomicSeverity(atom, unmodifiedCallers.length)
        });
      }
    }
  }
  
  if (allAlerts.length === 0) return null;
  
  // Agregar todos los callers no modificados
  const allUnmodifiedCallers = [...new Set(allAlerts.flatMap(a => a.unmodifiedCallers))];
  
  return createAggregatedTunnelVisionAlert({
    filePath,
    atomsModified: allAlerts.map(a => a.atom),
    totalAtomsModified: allAlerts.length,
    unmodifiedCallers: allUnmodifiedCallers,
    details: allAlerts
  });
}

/**
 * Calcula severidad basada en riesgo atómico
 * @param {Object} atom - Átomo modificado
 * @param {number} unmodifiedCallerCount - Número de callers no modificados
 * @returns {string} - CRITICAL, HIGH, MEDIUM, LOW
 */
function calculateAtomicSeverity(atom, unmodifiedCallerCount) {
  let score = unmodifiedCallerCount * 2;
  
  // Factor: arquetipo del átomo
  if (atom.archetype) {
    switch (atom.archetype.type) {
      case 'god-function':
      case 'hot-path':
        score += 10;
        break;
      case 'fragile-network':
        score += 5;
        break;
      default:
        score += atom.archetype.severity || 0;
    }
  }
  
  // Factor: complejidad
  if (atom.complexity > 20) score += 3;
  else if (atom.complexity > 10) score += 1;
  
  // Factor: tiene side effects
  if (atom.hasSideEffects) score += 2;
  
  // Factor: es async
  if (atom.isAsync) score += 1;
  
  // Clasificar
  if (score >= 15) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

/**
 * Crea alerta de tunnel vision atómica
 */
function createTunnelVisionAlert({
  type,
  modifiedAtom,
  filePath,
  functionName,
  atom,
  unmodifiedCallers,
  totalCallers
}) {
  const severity = calculateAtomicSeverity(atom, unmodifiedCallers.length);
  
  return {
    type: 'TUNNEL_VISION_ATOMIC',
    version: '3.0',
    severity,
    modifiedAtom,
    filePath,
    functionName,
    atom: {
      name: atom.name,
      complexity: atom.complexity,
      archetype: atom.archetype,
      isExported: atom.isExported,
      isAsync: atom.isAsync,
      hasSideEffects: atom.hasSideEffects
    },
    callers: {
      total: totalCallers,
      unmodified: unmodifiedCallers.length,
      list: unmodifiedCallers.slice(0, 10)
    },
    recommendations: generateAtomicRecommendations(severity, atom, unmodifiedCallers),
    timestamp: new Date().toISOString()
  };
}

/**
 * Crea alerta agregada para archivo completo
 */
function createAggregatedTunnelVisionAlert({
  filePath,
  atomsModified,
  totalAtomsModified,
  unmodifiedCallers,
  details
}) {
  const maxSeverity = details.reduce((max, d) => {
    const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return order[d.severity] > order[max] ? d.severity : max;
  }, 'LOW');
  
  return {
    type: 'TUNNEL_VISION_FILE',
    version: '3.0',
    severity: maxSeverity,
    filePath,
    atomsModified: {
      count: totalAtomsModified,
      list: atomsModified
    },
    callers: {
      totalAffected: unmodifiedCallers.length,
      list: unmodifiedCallers.slice(0, 15)
    },
    details: details.slice(0, 5), // Top 5 funciones más críticas
    recommendations: generateFileRecommendations(maxSeverity, totalAtomsModified, unmodifiedCallers.length),
    timestamp: new Date().toISOString()
  };
}

/**
 * Genera recomendaciones para alerta atómica
 */
function generateAtomicRecommendations(severity, atom, unmodifiedCallers) {
  const recommendations = [];
  
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    recommendations.push(`⚠️  La función '${atom.name}' tiene ${unmodifiedCallers.length} callers no modificados`);
    
    if (atom.archetype?.type === 'hot-path') {
      recommendations.push('🔥 Esta es una función hot-path - cambios afectan a muchos lugares');
    }
    if (atom.archetype?.type === 'god-function') {
      recommendations.push('⚡ Función compleja - considera dividirla antes de modificar');
    }
    
    recommendations.push('💡 Ejecuta tests en los archivos afectados antes de commitear');
  } else {
    recommendations.push(`💡 Verifica si los ${unmodifiedCallers.length} callers necesitan actualización`);
  }
  
  if (atom.hasSideEffects) {
    recommendations.push('🔄 Esta función tiene side effects - revisa efectos secundarios');
  }
  
  if (!atom.hasErrorHandling && atom.hasNetworkCalls) {
    recommendations.push('🌐 Función con network calls - asegúrate de manejar errores');
  }
  
  return recommendations;
}

/**
 * Genera recomendaciones para alerta de archivo
 */
function generateFileRecommendations(severity, atomsModified, totalCallers) {
  const recommendations = [];
  
  recommendations.push(`📦 ${atomsModified} funciones exportadas modificadas en este archivo`);
  recommendations.push(`🔗 ${totalCallers} funciones callers potencialmente afectadas`);
  
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    recommendations.push('⚠️  ALTO RIESGO - Considera hacer cambios más pequeños y graduales');
    recommendations.push('🧪 Ejecuta el test suite completo antes de commitear');
  }
  
  recommendations.push('💡 Usa "getFunctionDetails" para ver el impacto de cada función modificada');
  
  return recommendations;
}

/**
 * Formatea alerta para mostrar en consola (versión 3.0 molecular)
 */
export function formatAlert(alert) {
  if (!alert) return '';

  const severityEmoji = {
    'CRITICAL': '🔴',
    'HIGH': '🟠',
    'MEDIUM': '🟡',
    'LOW': '🟢'
  };

  const lines = [];
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push(`║  ${severityEmoji[alert.severity]} TUNNEL VISION MOLECULAR v3.0 - ${alert.severity.padEnd(14)}║`);
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  
  if (alert.type === 'TUNNEL_VISION_ATOMIC') {
    lines.push(`║  🧬 Átomo modificado: ${alert.functionName.padEnd(37)}║`);
    lines.push(`║  📁 Archivo: ${alert.filePath.padEnd(45)}║`);
    lines.push('║                                                              ║');
    lines.push(`║  📊 Metadata del átomo:                                      ║`);
    lines.push(`║    • Complejidad: ${String(alert.atom.complexity).padEnd(38)}║`);
    lines.push(`║    • Arquetipo: ${(alert.atom.archetype?.type || 'standard').padEnd(40)}║`);
    lines.push(`║    • Exportada: ${(alert.atom.isExported ? 'Sí' : 'No').padEnd(42)}║`);
    lines.push('║                                                              ║');
  } else {
    lines.push(`║  📁 Archivo modificado: ${alert.filePath.padEnd(33)}║`);
    lines.push(`║  🧬 Funciones exportadas modificadas: ${String(alert.atomsModified.count).padEnd(17)}║`);
    lines.push('║                                                              ║');
  }
  
  lines.push(`║  📞 Callers no modificados: ${String(alert.callers.unmodified || alert.callers.totalAffected).padEnd(27)}║`);
  lines.push('║                                                              ║');

  if (alert.recommendations.length > 0) {
    lines.push('║  💡 Recomendaciones:                                         ║');
    alert.recommendations.forEach(rec => {
      if (rec.length <= 56) {
        lines.push(`║  ${rec.padEnd(62)}║`);
      } else {
        lines.push(`║  ${rec.substring(0, 56).padEnd(62)}║`);
        lines.push(`║     ${rec.substring(56, 112).padEnd(59)}║`);
      }
    });
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}

/**
 * Limpia el historial de modificaciones antiguas
 */
export function cleanupHistory() {
  const now = Date.now();
  for (const [atomId, timestamp] of recentlyModifiedAtoms.entries()) {
    if (now - timestamp > RECENT_WINDOW_MS) {
      recentlyModifiedAtoms.delete(atomId);
    }
  }
}

/**
 * Obtiene estadísticas del detector (versión molecular)
 */
export function getStats() {
  return {
    recentlyModifiedCount: recentlyModifiedAtoms.size,
    windowMs: RECENT_WINDOW_MS,
    minThreshold: MIN_UNMODIFIED_DEPENDENTS,
    version: '3.0',
    architecture: 'molecular'
  };
}

/**
 * Obtiene historial de modificaciones
 */
export function getModificationHistory() {
  return Array.from(recentlyModifiedAtoms.entries()).map(([atomId, timestamp]) => ({
    atomId,
    timestamp,
    age: Date.now() - timestamp
  }));
}

// Limpieza periódica cada minuto
setInterval(cleanupHistory, 60 * 1000);
