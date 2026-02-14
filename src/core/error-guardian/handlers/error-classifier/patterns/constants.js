/**
 * @fileoverview Error Pattern Constants
 * 
 * Defines error severity levels and known error patterns.
 * 
 * @module core/error-guardian/handlers/error-classifier/patterns/constants
 */

/**
 * Error severity levels
 */
export const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Known error patterns and their configurations
 */
export const ERROR_PATTERNS = {
  // Errores de sintaxis
  'SyntaxError': {
    pattern: /SyntaxError: (.*)/,
    severity: SEVERITY.CRITICAL,
    autoFixable: false,
    suggestion: (match) => `Error de sintaxis: ${match[1]}. Usar 'npm run validate' antes de commitear.`,
    prevent: 'atomic_edit valida sintaxis antes de guardar',
    category: 'SYNTAX'
  },

  // Errores de módulos no encontrados
  'MODULE_NOT_FOUND': {
    pattern: /Cannot find module ['"](.+?)['"]/,
    severity: SEVERITY.HIGH,
    autoFixable: true,
    suggestion: (match) => `Módulo no encontrado: ${match[1]}. Verificar: 1) Ruta correcta, 2) Archivo existe, 3) Exportación correcta`,
    commonFixes: [
      'Verificar que el archivo existe en la ruta indicada',
      'Cambiar import relativo por alias (#core/, #utils/)',
      'Revisar que el archivo tenga export default/named',
      'Verificar extensión .js en imports'
    ],
    category: 'MODULE'
  },

  // Errores de importación dinámica
  'DYNAMIC_IMPORT': {
    pattern: /await import\(/,
    severity: SEVERITY.MEDIUM,
    autoFixable: true,
    suggestion: () => 'Import dinámico fuera de async function. Mover import al tope del archivo.',
    commonFixes: [
      'Mover import al nivel superior del archivo',
      'Usar import estático en lugar de dinámico',
      'Agregar async/await si es necesario'
    ],
    category: 'IMPORT'
  },

  // Errores de caché corrupto
  'CACHE_ERROR': {
    pattern: /Failed to read.*\.json.*ENOENT/,
    severity: SEVERITY.MEDIUM,
    autoFixable: true,
    suggestion: () => 'Archivo de caché no encontrado. Re-generar con restart_server({clearCache: true})',
    commonFixes: [
      'Ejecutar restart_server({clearCache: true})',
      'Eliminar manualmente .omnysysdata/files/',
      'Re-analizar proyecto completo'
    ],
    category: 'CACHE'
  },

  // Errores de timeout
  'TIMEOUT': {
    pattern: /timeout|ETIMEOUT/i,
    severity: SEVERITY.MEDIUM,
    autoFixable: false,
    suggestion: () => 'Timeout en operación. Posibles causas: loop infinito, operación muy pesada, recurso bloqueado.',
    commonFixes: [
      'Revisar loops infinitos en código',
      'Agregar límites a operaciones pesadas',
      'Usar streaming para archivos grandes'
    ],
    category: 'PERFORMANCE'
  },

  // Errores de memoria
  'MEMORY': {
    pattern: /out of memory|heap|ENOSPC/i,
    severity: SEVERITY.CRITICAL,
    autoFixable: false,
    suggestion: () => 'Error de memoria. El proceso consume demasiada RAM.',
    commonFixes: [
      'Procesar archivos en batches más pequeños',
      'Liberar referencias no usadas',
      'Aumentar límite de memoria de Node.js',
      'Usar streaming en lugar de cargar todo en memoria'
    ],
    category: 'RESOURCE'
  },

  // Errores de EPIPE (pipe rota - cliente MCP se desconectó)
  'EPIPE': {
    pattern: /EPIPE|broken pipe/i,
    severity: SEVERITY.LOW,
    autoFixable: false,
    suggestion: () => 'EPIPE: Cliente MCP desconectado. Normal durante transiciones de IDE.',
    commonFixes: [
      'Ignorar - es comportamiento normal cuando un IDE se cierra',
      'El sistema se recupera automáticamente'
    ],
    category: 'NETWORK'
  },

  // Errores de red
  'NETWORK_ERROR': {
    pattern: /ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT/,
    severity: SEVERITY.HIGH,
    autoFixable: true,
    suggestion: () => 'Error de conexión de red. Verificar conectividad.',
    commonFixes: [
      'Verificar conexión a internet',
      'Revisar configuración de proxy',
      'Verificar que el servicio destino esté disponible',
      'Reintentar la operación'
    ],
    category: 'NETWORK'
  },

  // Errores de permisos
  'PERMISSION_ERROR': {
    pattern: /EACCES|EPERM|permission denied/i,
    severity: SEVERITY.HIGH,
    autoFixable: false,
    suggestion: () => 'Error de permisos. No se tiene acceso al recurso.',
    commonFixes: [
      'Verificar permisos de archivo/directorio',
      'Ejecutar con privilegios adecuados',
      'Cambiar propietario del archivo'
    ],
    category: 'PERMISSION'
  }
};
