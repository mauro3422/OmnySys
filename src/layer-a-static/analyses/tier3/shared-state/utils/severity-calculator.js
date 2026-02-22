/**
 * @fileoverview Severity Calculator - Calcula severidad de acceso a estado compartido
 */

/**
 * Calcula severidad basada en patrón de acceso
 *
 * @param {string} writerFile - Archivo que escribe
 * @param {string} readerFile - Archivo que lee
 * @param {Array} accesses - Todos los accesos a esta propiedad
 * @param {string} propName - Nombre de la propiedad
 * @returns {string} - 'low' | 'medium' | 'high' | 'critical'
 */
export function calculateSeverity(writerFile, readerFile, accesses, propName) {
  // Si hay múltiples writers y readers -> CRITICAL (race condition)
  const uniqueWriters = new Set(accesses.filter(a => a.type === 'write').map(a => a.file)).size;
  const uniqueReaders = new Set(accesses.filter(a => a.type === 'read').map(a => a.file)).size;

  if (uniqueWriters > 1 && uniqueReaders > 1) {
    return 'critical';
  }

  if (uniqueWriters > 1 || uniqueReaders > 1) {
    return 'high';
  }

  // Propiedades comunes son medium risk
  const commonStateNames = ['state', 'config', 'cache', 'store'];
  if (commonStateNames.some(name => propName.toLowerCase().includes(name))) {
    return 'high';
  }

  return 'medium';
}
