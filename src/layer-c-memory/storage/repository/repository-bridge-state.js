import { resolve } from 'path';

export const bridgeState = {
  journals: new Map(),
  flushTimers: new Map()
};

export function normalizeProjectPath(projectPath) {
  const raw = String(projectPath || '').trim();
  if (!raw) return '__default__';
  return resolve(raw).replace(/\\/g, '/');
}

export function getProjectJournal(projectPath) {
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  let journal = bridgeState.journals.get(normalizedProjectPath);
  if (!journal) {
    journal = new Map();
    bridgeState.journals.set(normalizedProjectPath, journal);
  }
  return { normalizedProjectPath, journal };
}
