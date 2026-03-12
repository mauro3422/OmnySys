export function registerGuard(guardMap, metadataMap, validateGuard, logger, type, name, guardFn, metadata = {}) {
    if (guardMap.has(name)) {
        logger.debug(`${type === 'semantic' ? 'Semantic' : 'Impact'} guard already registered: ${name}`);
        return false;
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

    logger.debug(`Registered ${type} guard: ${name} (${metadata.domain || 'unknown'})`);
    return true;
}
