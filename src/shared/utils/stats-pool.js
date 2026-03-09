/**
 * @fileoverview StatsPool.js
 * 
 * Fuente de Verdad (SSOT) centralizada para estadísticas del sistema.
 * Permite a los módulos registrar proveedores de métricas dinámicas
 * en lugar de implementar sus propios métodos getStats() ad-hoc.
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:Shared:StatsPool');

class StatsPool {
    constructor() {
        this.providers = new Map();
        this.staticStats = new Map();
    }

    /**
     * Registra un proveedor dinámico de estadísticas
     * @param {string} moduleName - Nombre del módulo/dominio
     * @param {Function} providerFn - Función que retorna un objeto de estadísticas
     */
    registerProvider(moduleName, providerFn) {
        if (typeof providerFn !== 'function') {
            logger.error(`[StatsPool] Provider for ${moduleName} must be a function.`);
            return;
        }
        this.providers.set(moduleName, providerFn);
        logger.debug(`[StatsPool] Registered provider for: ${moduleName}`);
    }

    /**
     * Actualiza estadísticas estáticas (manual)
     * @param {string} key - Clave de la métrica
     * @param {any} value - Valor
     */
    set(key, value) {
        this.staticStats.set(key, value);
    }

    /**
     * Recolecta todas las estadísticas registradas
     * @returns {Object} Unificado de estadísticas
     */
    getAllStats() {
        const stats = {
            timestamp: new Date().toISOString(),
            modules: {},
            system: Object.fromEntries(this.staticStats)
        };

        for (const [name, provider] of this.providers.entries()) {
            try {
                stats.modules[name] = provider();
            } catch (err) {
                logger.warn(`[StatsPool] Failed to get stats from ${name}: ${err.message}`);
                stats.modules[name] = { error: 'PROVIDER_FAILED' };
            }
        }

        return stats;
    }
}

// Singleton export
export const statsPool = new StatsPool();
export default statsPool;
