import fs from 'fs/promises';
import path from 'path';
import { getCompilerDataDir } from './compiler-persistence-paths.js';

/**
 * Checks if a previous Layer A analysis exists for the project.
 * Fast path: only uses fs.access on known files (no DB open, no file tree scan).
 * Omnysys.db always exists after first boot, so we check for index.json
 * (the persisted manifest) as the primary signal of a complete analysis.
 */
export async function hasPersistedCompilerAnalysis(projectPath) {
  const dataDir = getCompilerDataDir(projectPath);
  const dbPath = path.join(dataDir, 'omnysys.db');
  const indexPath = path.join(dataDir, 'index.json');

  try {
    // Fastest: check for index.json (persisted manifest — means analysis completed)
    await fs.access(indexPath);
    return true;
  } catch {
    // Fallback: check if omnysys.db exists (means at least partial analysis ran)
    try {
      await fs.access(dbPath);
      return true;
    } catch {
      return false;
    }
  }
}
