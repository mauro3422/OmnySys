import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import {
  getAtomCountSummary,
  getLastAnalyzed,
  getPhase2FileCounts
} from '../../../shared/compiler/index.js';

export async function loadMetadataStatus(projectPath) {
  try {
    const metadata = await getProjectMetadata(projectPath);
    const statusMetadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: getLastAnalyzed(metadata)
    };

    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(projectPath);
      if (repo?.db) {
        const atomSummary = getAtomCountSummary(repo.db);
        const phase2Counts = getPhase2FileCounts(repo.db);
        statusMetadata.liveAtomCount = atomSummary.totalAtoms;
        statusMetadata.liveFileCount = phase2Counts.liveFileCount;
        statusMetadata.phase2PendingFiles = phase2Counts.pendingFiles;
        statusMetadata.phase2CompletedFiles = phase2Counts.completedFiles;
        statusMetadata.societiesCount = repo.db.prepare('SELECT COUNT(*) as n FROM societies').get()?.n || 0;
      }
    } catch {
      // Repo not ready yet; live counts remain omitted.
    }

    return statusMetadata;
  } catch (error) {
    return { error: 'Metadata not available', message: error.message };
  }
}
