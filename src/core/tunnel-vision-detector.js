/**
 * @fileoverview Tunnel Vision Detector
 *
 * Detecta cuando modificas un archivo pero hay archivos dependientes
 * que NO fueron modificados (tunnel vision).
 *
 * CORE IDEA: Si cambias función A que es llamada por B, C, D
 *            y NO modificas B, C, D → ALERTA de tunnel vision
 *
 * @module core/tunnel-vision-detector
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Historial de archivos modificados recientemente (últimos 5 minutos)
 * Key: filePath, Value: timestamp
 */
const recentlyModifiedFiles = new Map();
const RECENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Threshold: mínimo de archivos dependientes no modificados para alertar
 */
const MIN_UNMODIFIED_DEPENDENTS = 2;

/**
 * Lee el index.json para obtener metadata rápida
 */
async function loadIndex() {
  try {
    const indexPath = path.join(PROJECT_ROOT, '.omnysysdata', 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('[TunnelVision] No se pudo cargar index.json:', error.message);
    return null;
  }
}

/**
 * Lee la metadata completa de un archivo
 */
async function loadFileMetadata(filePath) {
  try {
    // Normalizar path (sin src/ prefix)
    const normalizedPath = filePath.replace(/^src[\\/]/, '');
    const metadataPath = path.join(
      PROJECT_ROOT,
      '.omnysysdata',
      'files',
      `${normalizedPath}.json`
    );

    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[TunnelVision] No se pudo cargar metadata de ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Lee system-map para obtener dependencias completas
 * (esto es más pesado, solo si es necesario)
 */
async function loadSystemMap() {
  try {
    const mapPath = path.join(PROJECT_ROOT, '.omnysysdata', 'system-map.json');
    const content = await fs.readFile(mapPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('[TunnelVision] No se pudo cargar system-map.json:', error.message);
    return null;
  }
}

/**
 * Verifica si un archivo fue modificado recientemente
 */
function wasRecentlyModified(filePath) {
  const timestamp = recentlyModifiedFiles.get(filePath);
  if (!timestamp) return false;

  const now = Date.now();
  const age = now - timestamp;

  // Si es muy viejo, limpiar del cache
  if (age > RECENT_WINDOW_MS) {
    recentlyModifiedFiles.delete(filePath);
    return false;
  }

  return true;
}

/**
 * Registra que un archivo fue modificado
 */
function markAsModified(filePath) {
  recentlyModifiedFiles.set(filePath, Date.now());
}

/**
 * Obtiene archivos que dependen del archivo modificado
 * usando los datos ya analizados en .omnysysdata
 */
async function getAffectedFiles(filePath) {
  const systemMap = await loadSystemMap();
  if (!systemMap || !systemMap.files) {
    return { direct: [], transitive: [], all: [] };
  }

  // Normalizar path: asegurar que use / y buscar con y sin src/
  const normalizedPath = filePath.replace(/\\/g, '/');
  let fileData = systemMap.files[normalizedPath];

  // Si no se encuentra, intentar sin src/ prefix
  if (!fileData && normalizedPath.startsWith('src/')) {
    fileData = systemMap.files[normalizedPath.replace(/^src\//, '')];
  }

  // Si no se encuentra, intentar CON src/ prefix
  if (!fileData && !normalizedPath.startsWith('src/')) {
    fileData = systemMap.files['src/' + normalizedPath];
  }

  if (!fileData) {
    return { direct: [], transitive: [], all: [] };
  }

  // usedBy contiene los archivos que importan/usan este archivo
  const directDependents = fileData.usedBy || [];

  // También buscar dependientes transitivos si es crítico
  const transitiveDependents = fileData.transitiveDependents || [];

  return {
    direct: directDependents,
    transitive: transitiveDependents,
    all: [...new Set([...directDependents, ...transitiveDependents])]
  };
}

/**
 * Calcula la severidad del riesgo
 */
function calculateSeverity(modifiedFile, affectedFiles, fileMetadata) {
  const unmodifiedCount = affectedFiles.unmodified.length;

  // Factores de riesgo:
  // 1. Número de dependientes no modificados
  let score = unmodifiedCount * 2;

  // 2. Si el archivo tiene exports públicos (mayor riesgo)
  if (fileMetadata && fileMetadata.exports && fileMetadata.exports.length > 0) {
    score += 3;
  }

  // 3. Si el archivo tiene alto riesgo según análisis previo
  if (fileMetadata && fileMetadata.riskScore) {
    const riskLevel = fileMetadata.riskScore.severity;
    if (riskLevel === 'high' || riskLevel === 'critical') {
      score += 5;
    } else if (riskLevel === 'medium') {
      score += 2;
    }
  }

  // 4. Si hay muchos dependientes directos vs transitivos
  const directCount = affectedFiles.direct.filter(f =>
    !wasRecentlyModified(f)
  ).length;
  if (directCount >= 3) {
    score += 3;
  }

  // Clasificar severidad
  if (score >= 15) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

/**
 * Genera recomendaciones basadas en el contexto
 */
function generateRecommendations(severity, affectedFiles, fileMetadata) {
  const recommendations = [];

  if (severity === 'CRITICAL' || severity === 'HIGH') {
    recommendations.push('⚠️  REVISA estos archivos ANTES de commitear');
    recommendations.push('💡 Considera crear tests para validar los cambios');
  } else if (severity === 'MEDIUM') {
    recommendations.push('💡 Revisa si estos archivos necesitan actualizarse');
  }

  if (fileMetadata && fileMetadata.exports && fileMetadata.exports.length > 0) {
    recommendations.push('📦 Este archivo exporta funciones públicas - cambios pueden ser breaking');
  }

  if (affectedFiles.unmodified.length > 5) {
    recommendations.push(`🔍 ${affectedFiles.unmodified.length} archivos afectados - considera revisar en orden de importancia`);
  }

  return recommendations;
}

/**
 * Detecta tunnel vision cuando un archivo es modificado
 *
 * @param {string} filePath - Archivo que fue modificado
 * @returns {Object|null} - Alerta de tunnel vision o null si no hay riesgo
 */
export async function detectTunnelVision(filePath) {
  // Marcar archivo como modificado
  markAsModified(filePath);

  // Obtener archivos afectados
  const affected = await getAffectedFiles(filePath);

  if (!affected || affected.all.length === 0) {
    // No hay dependientes, no hay riesgo de tunnel vision
    return null;
  }

  // Filtrar cuáles NO fueron modificados recientemente
  const unmodifiedDirect = affected.direct.filter(f => !wasRecentlyModified(f));
  const unmodifiedTransitive = affected.transitive.filter(f => !wasRecentlyModified(f));
  const unmodified = [...new Set([...unmodifiedDirect, ...unmodifiedTransitive])];

  // Si hay pocos dependientes no modificados, no es tunnel vision significativo
  if (unmodified.length < MIN_UNMODIFIED_DEPENDENTS) {
    return null;
  }

  // Cargar metadata del archivo para evaluar severidad
  const fileMetadata = await loadFileMetadata(filePath);

  const affectedData = {
    direct: unmodifiedDirect,
    transitive: unmodifiedTransitive,
    unmodified,
    total: affected.all.length
  };

  const severity = calculateSeverity(filePath, affectedData, fileMetadata);
  const recommendations = generateRecommendations(severity, affectedData, fileMetadata);

  // Retornar alerta
  return {
    type: 'TUNNEL_VISION',
    severity,
    modifiedFile: filePath,
    affectedFiles: {
      total: affected.all.length,
      unmodified: unmodified.length,
      direct: unmodifiedDirect.length,
      transitive: unmodifiedTransitive.length
    },
    files: {
      direct: unmodifiedDirect.slice(0, 10), // Limitar a 10 para no abrumar
      transitive: unmodifiedTransitive.slice(0, 5),
      all: unmodified.slice(0, 15)
    },
    recommendations,
    metadata: {
      hasExports: fileMetadata?.exports?.length > 0,
      exportCount: fileMetadata?.exports?.length || 0,
      riskLevel: fileMetadata?.riskScore?.severity || 'unknown'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formatea alerta para mostrar en consola
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
  lines.push('┌─────────────────────────────────────────────────────────────┐');
  lines.push(`│  ${severityEmoji[alert.severity]} TUNNEL VISION DETECTED - ${alert.severity}                       │`);
  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push(`│  Modificaste: ${alert.modifiedFile.padEnd(42)}│`);
  lines.push('│                                                             │');
  lines.push(`│  Archivos afectados que NO modificaste:                     │`);
  lines.push(`│    • Directos: ${String(alert.affectedFiles.direct).padEnd(46)}│`);
  lines.push(`│    • Transitivos: ${String(alert.affectedFiles.transitive).padEnd(43)}│`);
  lines.push(`│    • Total sin modificar: ${String(alert.affectedFiles.unmodified).padEnd(34)}│`);
  lines.push('│                                                             │');

  // Mostrar hasta 5 archivos directos
  if (alert.files.direct.length > 0) {
    lines.push('│  📄 Archivos directos:                                      │');
    alert.files.direct.slice(0, 5).forEach(file => {
      const truncated = file.length > 50 ? '...' + file.slice(-47) : file;
      lines.push(`│     ⚠️  ${truncated.padEnd(52)}│`);
    });

    if (alert.files.direct.length > 5) {
      lines.push(`│     ... y ${alert.files.direct.length - 5} más                                          │`);
    }
    lines.push('│                                                             │');
  }

  // Recomendaciones
  if (alert.recommendations.length > 0) {
    lines.push('│  💡 Recomendaciones:                                        │');
    alert.recommendations.forEach(rec => {
      // Dividir en líneas si es muy largo
      if (rec.length <= 54) {
        lines.push(`│  ${rec.padEnd(60)}│`);
      } else {
        const words = rec.split(' ');
        let currentLine = '';
        words.forEach(word => {
          if ((currentLine + word).length > 54) {
            lines.push(`│  ${currentLine.padEnd(60)}│`);
            currentLine = '     ' + word + ' ';
          } else {
            currentLine += word + ' ';
          }
        });
        if (currentLine.trim()) {
          lines.push(`│  ${currentLine.padEnd(60)}│`);
        }
      }
    });
  }

  lines.push('└─────────────────────────────────────────────────────────────┘');
  lines.push('');

  return lines.join('\n');
}

/**
 * Limpia el historial de modificaciones antiguas
 */
export function cleanupHistory() {
  const now = Date.now();
  for (const [filePath, timestamp] of recentlyModifiedFiles.entries()) {
    if (now - timestamp > RECENT_WINDOW_MS) {
      recentlyModifiedFiles.delete(filePath);
    }
  }
}

/**
 * Obtiene estadísticas del detector
 */
export function getStats() {
  return {
    recentlyModifiedCount: recentlyModifiedFiles.size,
    windowMs: RECENT_WINDOW_MS,
    minThreshold: MIN_UNMODIFIED_DEPENDENTS
  };
}

// Limpieza periódica cada minuto
setInterval(cleanupHistory, 60 * 1000);
