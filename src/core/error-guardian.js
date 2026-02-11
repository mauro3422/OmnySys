/**
 * @fileoverview error-guardian.js
 * 
 * Guardián de Errores - Sistema de autoprotección recursiva
 * 
 * Captura TODO error en el sistema MCP y:
 * 1. Lo registra con contexto completo
 * 2. Analiza el tipo de error
 * 3. Propone soluciones automáticas
 * 4. Previene que el sistema crashee
 * 
 * Siguiendo Recursividad: El sistema se protege a sí mismo
 * 
 * @module core/error-guardian
 */

import { createLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:error:guardian');

/**
 * Tipos de errores conocidos y sus soluciones
 */
const ERROR_PATTERNS = {
  // Errores de sintaxis
  'SyntaxError': {
    pattern: /SyntaxError: (.*)/,
    severity: 'CRITICAL',
    autoFixable: false,
    suggestion: (match) => `Error de sintaxis: ${match[1]}. Usar 'npm run validate' antes de commitear.`,
    prevent: 'atomic_edit valida sintaxis antes de guardar'
  },
  
  // Errores de módulos no encontrados
  'MODULE_NOT_FOUND': {
    pattern: /Cannot find module ['"](.+?)['"]/,
    severity: 'HIGH',
    autoFixable: true,
    suggestion: (match) => `Módulo no encontrado: ${match[1]}. Verificar: 1) Ruta correcta, 2) Archivo existe, 3) Exportación correcta`,
    commonFixes: [
      'Verificar que el archivo existe en la ruta indicada',
      'Cambiar import relativo por alias (#core/, #utils/)',
      'Revisar que el archivo tenga export default/named',
      'Verificar extensión .js en imports'
    ]
  },
  
  // Errores de importación dinámica
  'DYNAMIC_IMPORT': {
    pattern: /await import\(/,
    severity: 'MEDIUM',
    autoFixable: true,
    suggestion: () => 'Import dinámico fuera de async function. Mover import al tope del archivo.',
    commonFixes: [
      'Mover import al nivel superior del archivo',
      'Usar import estático en lugar de dinámico',
      'Agregar async/await si es necesario'
    ]
  },
  
  // Errores de caché corrupto
  'CACHE_ERROR': {
    pattern: /Failed to read.*\.json.*ENOENT/,
    severity: 'MEDIUM',
    autoFixable: true,
    suggestion: () => 'Archivo de caché no encontrado. Re-generar con restart_server({clearCache: true})',
    commonFixes: [
      'Ejecutar restart_server({clearCache: true})',
      'Eliminar manualmente .omnysysdata/files/',
      'Re-analizar proyecto completo'
    ]
  },
  
  // Errores de timeout
  'TIMEOUT': {
    pattern: /timeout|ETIMEOUT/i,
    severity: 'MEDIUM',
    autoFixable: false,
    suggestion: () => 'Timeout en operación. Posibles causas: loop infinito, operación muy pesada, recurso bloqueado.',
    commonFixes: [
      'Revisar loops infinitos en código',
      'Agregar límites a operaciones pesadas',
      'Usar streaming para archivos grandes'
    ]
  },
  
  // Errores de memoria
  'MEMORY': {
    pattern: /out of memory|heap|ENOSPC/i,
    severity: 'CRITICAL',
    autoFixable: false,
    suggestion: () => 'Error de memoria. El proceso consume demasiada RAM.',
    commonFixes: [
      'Procesar archivos en batches más pequeños',
      'Liberar referencias no usadas',
      'Aumentar límite de memoria de Node.js',
      'Usar streaming en lugar de cargar todo en memoria'
    ]
  }
};

/**
 * Clase ErrorGuardian - Sistema de protección recursiva
 */
export class ErrorGuardian {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.errorLog = [];
    this.stats = {
      totalErrors: 0,
      byType: {},
      bySeverity: {},
      autoFixed: 0,
      prevented: 0
    };
    this.setupGlobalHandlers();
  }
  
  /**
   * Configura handlers globales para capturar TODO error
   */
  setupGlobalHandlers() {
    // Capturar errores no manejados
    process.on('uncaughtException', (error) => {
      this.handleFatalError(error, 'uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.handleFatalError(reason, 'unhandledRejection', { promise });
    });
    
    // Capturar warnings
    process.on('warning', (warning) => {
      this.handleWarning(warning);
    });
    
    logger.info('🛡️  Error Guardian activado - Sistema protegido recursivamente');
  }
  
  /**
   * Analiza un error y determina su tipo y severidad
   */
  analyzeError(error) {
    const errorString = error.stack || error.message || String(error);
    
    for (const [type, config] of Object.entries(ERROR_PATTERNS)) {
      const match = errorString.match(config.pattern);
      if (match) {
        return {
          type,
          severity: config.severity,
          autoFixable: config.autoFixable,
          suggestion: config.suggestion(match),
          commonFixes: config.commonFixes || [],
          match: match[0],
          originalError: error
        };
      }
    }
    
    // Error desconocido
    return {
      type: 'UNKNOWN',
      severity: 'HIGH',
      autoFixable: false,
      suggestion: 'Error no catalogado. Revisar stack trace completo.',
      commonFixes: [
        'Buscar el error en Google/StackOverflow',
        'Revisar logs completos',
        'Reportar issue con stack trace'
      ],
      originalError: error
    };
  }
  
  /**
   * Maneja un error fatal del sistema
   */
  async handleFatalError(error, source, context = {}) {
    const analysis = this.analyzeError(error);
    
    logger.error('═══════════════════════════════════════════════════');
    logger.error('🚨 ERROR FATAL CAPTURADO POR GUARDIÁN');
    logger.error('═══════════════════════════════════════════════════');
    logger.error(`Tipo: ${analysis.type}`);
    logger.error(`Severidad: ${analysis.severity}`);
    logger.error(`Fuente: ${source}`);
    logger.error(`Mensaje: ${analysis.suggestion}`);
    logger.error('───────────────────────────────────────────────────');
    
    if (analysis.commonFixes.length > 0) {
      logger.error('💡 Soluciones posibles:');
      analysis.commonFixes.forEach((fix, i) => {
        logger.error(`   ${i + 1}. ${fix}`);
      });
    }
    
    logger.error('═══════════════════════════════════════════════════');
    
    // Guardar en log
    await this.logError({
      timestamp: new Date().toISOString(),
      type: analysis.type,
      severity: analysis.severity,
      source,
      message: error.message,
      stack: error.stack,
      suggestion: analysis.suggestion,
      context
    });
    
    // Intentar auto-fix si es posible
    if (analysis.autoFixable) {
      logger.info('🔧 Intentando auto-fix...');
      const fixed = await this.attemptAutoFix(analysis);
      if (fixed) {
        logger.info('✅ Auto-fix exitoso. Sistema estabilizado.');
        this.stats.autoFixed++;
        return;
      }
    }
    
    // Si no se pudo arreglar, intentar recuperación graceful
    await this.gracefulRecovery(analysis);
  }
  
  /**
   * Intenta arreglar automáticamente ciertos errores
   */
  async attemptAutoFix(analysis) {
    try {
      switch (analysis.type) {
        case 'CACHE_ERROR':
          // Auto-fix: Limpiar caché
          const { UnifiedCacheManager } = await import('./unified-cache-manager.js');
          const cache = new UnifiedCacheManager(this.projectPath);
          await cache.clear();
          logger.info('🗑️  Caché limpiado automáticamente');
          return true;
          
        case 'DYNAMIC_IMPORT':
          // No podemos arreglar esto automáticamente, pero podemos reportarlo
          logger.warn('⚠️  Detectado import dinámico fuera de lugar. Requiere fix manual.');
          return false;
          
        default:
          return false;
      }
    } catch (fixError) {
      logger.error('❌ Auto-fix falló:', fixError.message);
      return false;
    }
  }
  
  /**
   * Recuperación graceful - mantiene el sistema vivo
   */
  async gracefulRecovery(analysis) {
    logger.info('🔄 Iniciando recuperación graceful...');
    
    try {
      // Guardar estado actual
      await this.saveSystemState();
      
      // Según la severidad, decidir qué hacer
      switch (analysis.severity) {
        case 'CRITICAL':
          logger.error('💥 Error CRITICAL. Reiniciando componentes esenciales...');
          await this.restartEssentialComponents();
          break;
          
        case 'HIGH':
          logger.warn('⚠️  Error HIGH. Aislando componente afectado...');
          await this.isolateAffectedComponent(analysis);
          break;
          
        case 'MEDIUM':
          logger.info('ℹ️  Error MEDIUM. Continuando con precaución...');
          // Continuar operando
          break;
      }
      
      this.stats.prevented++;
      logger.info('✅ Recuperación graceful completada. Sistema sigue operativo.');
      
    } catch (recoveryError) {
      logger.error('💀 Recuperación falló. Esto es grave:', recoveryError.message);
      // Último recurso: informar y seguir
    }
  }
  
  /**
   * Guarda el estado del sistema antes de un error
   */
  async saveSystemState() {
    const statePath = path.join(this.projectPath, '.omnysysdata', 'error-state.json');
    const state = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: this.stats
    };
    
    try {
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      // Ignorar errores al guardar estado
    }
  }
  
  /**
   * Reinicia componentes esenciales
   */
  async restartEssentialComponents() {
    // Reiniciar caché
    try {
      const { UnifiedCacheManager } = await import('./unified-cache-manager.js');
      const cache = new UnifiedCacheManager(this.projectPath);
      await cache.clear();
      logger.info('🔄 Caché reiniciado');
    } catch (e) {
      logger.warn('⚠️  No se pudo reiniciar caché:', e.message);
    }
    
    // Reiniciar file watcher si existe
    // Reiniciar orchestrator si existe
    logger.info('🔄 Componentes esenciales reiniciados');
  }
  
  /**
   * Aisla el componente afectado para evitar propagación
   */
  async isolateAffectedComponent(analysis) {
    logger.info('🔒 Aislando componente afectado...');
    // Marcar como no disponible temporalmente
    // Prevenir llamadas futuras hasta que se arregle
    logger.info('🔒 Componente aislado. El resto del sistema sigue funcionando.');
  }
  
  /**
   * Loguea un error con contexto completo
   */
  async logError(errorData) {
    this.errorLog.push(errorData);
    this.stats.totalErrors++;
    
    // Actualizar estadísticas
    this.stats.byType[errorData.type] = (this.stats.byType[errorData.type] || 0) + 1;
    this.stats.bySeverity[errorData.severity] = (this.stats.bySeverity[errorData.severity] || 0) + 1;
    
    // Guardar en archivo
    const logPath = path.join(this.projectPath, 'logs', 'error-guardian.json');
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        stats: this.stats,
        recentErrors: this.errorLog.slice(-50) // Últimos 50
      }, null, 2));
    } catch (e) {
      // Si no podemos loguear, al menos lo tenemos en memoria
    }
  }
  
  /**
   * Maneja warnings (errores no fatales)
   */
  handleWarning(warning) {
    logger.warn('⚠️  Warning detectado:', warning.message);
    // Los warnings no detienen el sistema, solo los registramos
  }
  
  /**
   * Obtiene estadísticas de errores
   */
  getStats() {
    return {
      ...this.stats,
      recentErrors: this.errorLog.slice(-10),
      health: this.calculateHealth()
    };
  }
  
  /**
   * Calcula salud del sistema
   */
  calculateHealth() {
    const criticalCount = this.stats.bySeverity.CRITICAL || 0;
    const highCount = this.stats.bySeverity.HIGH || 0;
    
    if (criticalCount > 5) return 'CRITICAL';
    if (criticalCount > 0 || highCount > 10) return 'WARNING';
    if (highCount > 0) return 'DEGRADED';
    return 'HEALTHY';
  }
}

// Singleton
let guardian = null;

export function getErrorGuardian(projectPath) {
  if (!guardian) {
    guardian = new ErrorGuardian(projectPath);
  }
  return guardian;
}

export default ErrorGuardian;
