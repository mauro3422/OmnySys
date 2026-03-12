import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:SemanticQueries');

export function runSemanticQuerySafely(fn, operation, defaultValue = null) {
    try {
        return fn();
    } catch (error) {
        logger.error(`[${operation}] Database query failed:`, error.message);
        return defaultValue;
    }
}
