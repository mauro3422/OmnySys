/**
 * @fileoverview Small repository access helpers for watcher issue persistence.
 *
 * Keeps repository/bootstrap concerns out of watcher-issue-persistence so the
 * persistence module focuses on lifecycle and SQL only.
 *
 * @module core/file-watcher/watcher-issue-repository
 */

export async function getWatcherIssueDb(projectPath) {
  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(projectPath);
  return repo?.db || null;
}

