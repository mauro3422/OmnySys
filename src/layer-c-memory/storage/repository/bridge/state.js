import { normalizeProjectPath } from '../repository-path-utils.js';

export const bridgeState = {
  journals: new Map(),
  flushTimers: new Map()
};

export { normalizeProjectPath };

export function getProjectJournal(projectPath) {
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  let journal = bridgeState.journals.get(normalizedProjectPath);
  if (!journal) {
    journal = new Map();
    bridgeState.journals.set(normalizedProjectPath, journal);
  }
  return { normalizedProjectPath, journal };
}
