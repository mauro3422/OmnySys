import fs from 'fs/promises';
import { collectWatcherAlertReferencedSymbols, loadWatcherLiveFileSymbols } from './watcher-issue-storage-alerts.js';

async function getCachedFileContents(absolutePath, fileContentsCache) {
  if (fileContentsCache.has(absolutePath)) {
    return fileContentsCache.get(absolutePath);
  }

  try {
    const contents = await fs.readFile(absolutePath, 'utf8');
    fileContentsCache.set(absolutePath, contents);
    return contents;
  } catch {
    fileContentsCache.set(absolutePath, '');
    return '';
  }
}

export async function isAlertOutdatedByMissingSymbols(alert, absolutePath, fileContentsCache) {
  const referencedSymbols = collectWatcherAlertReferencedSymbols(alert);
  if (referencedSymbols.length === 0) {
    return false;
  }

  const contents = await getCachedFileContents(absolutePath, fileContentsCache);
  return referencedSymbols.some((symbol) => !contents.includes(symbol));
}

export function isAlertOutdatedByCanonicalSymbols(alert, relativePath, db, fileSymbolCache) {
  const referencedSymbols = collectWatcherAlertReferencedSymbols(alert);
  if (referencedSymbols.length === 0 || !db || !relativePath) {
    return false;
  }

  if (!fileSymbolCache.has(relativePath)) {
    fileSymbolCache.set(relativePath, new Set(loadWatcherLiveFileSymbols(db, relativePath)));
  }

  const liveSymbols = fileSymbolCache.get(relativePath);
  return referencedSymbols.some((symbol) => !liveSymbols.has(symbol));
}
