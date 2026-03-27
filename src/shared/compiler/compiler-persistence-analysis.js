import fs from 'fs/promises';
import path from 'path';
import { getCompilerDataDir, withCompilerRepository } from './compiler-persistence-paths.js';

export async function hasPersistedCompilerAnalysis(projectPath) {
  const dataDir = getCompilerDataDir(projectPath);
  const dbPath = path.join(dataDir, 'omnysys.db');
  const indexPath = path.join(dataDir, 'index.json');

  try {
    try {
      await fs.unlink(`${indexPath}.tmp`);
    } catch {
      // Ignore stale temp files.
    }

    await fs.access(indexPath);
    return true;
  } catch {
    try {
      await fs.access(dbPath);
      const count = await withCompilerRepository(projectPath, (repo) =>
        repo.db.prepare('SELECT COUNT(*) as count FROM atoms').get()?.count || 0
      );
      return count > 0;
    } catch {
      return false;
    }
  }
}
