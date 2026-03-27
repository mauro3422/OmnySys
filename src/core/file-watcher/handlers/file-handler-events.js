import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

export function formatOriginSuffix(changeContext = {}) {
  return changeContext.origin ? ` (origin=${changeContext.origin})` : '';
}

export function emitFileLifecycleEvent(context, eventName, filePath, changeContext = {}, extra = {}) {
  context.emit(eventName, {
    filePath,
    origin: changeContext.origin || 'unknown',
    source: changeContext.source || null,
    ...extra
  });
}

export function logFileLifecycle(message) {
  logger.info(message);
}
