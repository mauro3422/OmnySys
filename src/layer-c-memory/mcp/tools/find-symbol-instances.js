/**
 * MCP Tool: find_symbol_instances
 * 
 * Encuentra todas las instancias de un símbolo (función/variable) en el proyecto,
 * detecta cuáles son duplicados, cuál se usa realmente, y advierte sobre conflictos.
 * 
 * También incluye modo auto-detección que escanea TODO el proyecto buscando duplicados
 * sin necesidad de especificar un nombre. Ideal para encontrar deuda técnica oculta.
 * 
 * Útil para:
 * - Evitar editar el archivo equivocado (como me pasó con purpose.js)
 * - Detectar código duplicado entre archivos
 * - Encontrar la implementación "real" vs copias sin usar
 * - Priorizar refactorización de duplicados críticos
 * 
 * Modos de uso:
 * 1. Búsqueda específica: { symbolName: "detectAtomPurpose" }
 * 2. Auto-detección: { autoDetect: true } - escanea todos los duplicados
 */

import { handleAutoDetect, handleSymbolSearch } from './find-symbol-instances/handlers.js';

/**
 * Tool principal
 */
export async function find_symbol_instances(args, context) {
  const { symbolName, autoDetect = false, projectPath } = args;
  const resolvedPath = projectPath || context.projectPath;
  try {
    if (autoDetect || !symbolName) return await handleAutoDetect(resolvedPath);
    return await handleSymbolSearch(symbolName, resolvedPath);
  } catch (error) {
    return { error: error.message, stack: error.stack };
  }
}
