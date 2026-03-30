import {
    isGuardTraceEnabled,
    summarizeDebugValue
} from '#shared/runtime-debug-flags.js';

export function registerGuard(guardMap, metadataMap, validateGuard, logger, type, name, guardFn, metadata = {}) {
    if (guardMap.has(name)) {
        logger.debug(`${type === 'semantic' ? 'Semantic' : 'Impact'} guard already registered: ${name}`);
        return false;
    }

    if (isGuardTraceEnabled()) {
        logger.debug(`[GuardTrace] registering ${type} guard: ${name} metadata=${JSON.stringify(summarizeDebugValue(metadata))}`);
    }

    const validation = validateGuard({ name, detect: guardFn, ...metadata });
    if (!validation.valid) {
        logger.warn(`Guard '${name}' validation warnings:`, validation.errors);
    }

    guardMap.set(name, guardFn);
    metadataMap.set(name, {
        type,
        ...metadata,
        registeredAt: new Date().toISOString()
    });

    if (isGuardTraceEnabled()) {
        logger.debug(`[GuardTrace] registered ${type} guard: ${name} validation=${JSON.stringify(summarizeDebugValue(validation))}`);
    }
    logger.debug(`Registered ${type} guard: ${name} (${metadata.domain || 'unknown'})`);
    return true;
}
