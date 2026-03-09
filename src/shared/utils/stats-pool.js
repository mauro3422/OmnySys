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

    getStats(moduleName) {
        logger.info(`[StatsPool] Requested stats for module: ${moduleName || 'ALL'}`);
        if (moduleName && !this.providers.has(moduleName)) {

            logger.warn(`[StatsPool] No provider registered for module: ${moduleName}`);
            return { total: 0, byType: { semantic: 0, impact: 0 }, byDomain: {} };
        }

        if (moduleName && this.providers.has(moduleName)) {
            try {
                return this.providers.get(moduleName)();
            } catch (err) {
                logger.warn(`[StatsPool] Failed to get stats from ${moduleName}: ${err.message}`);
                return { error: 'PROVIDER_FAILED', total: 0, byType: { semantic: 0, impact: 0 }, byDomain: {} };
            }
        }

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

        const result = stats;
        logger.info(`[StatsPool] Returning stats: ${JSON.stringify(result).substring(0, 100)}...`);
        return result;
    }
}

// Singleton export
export const statsPool = new StatsPool();
export default statsPool;
