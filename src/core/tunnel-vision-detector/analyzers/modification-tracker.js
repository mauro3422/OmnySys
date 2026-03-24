import { statsPool } from '../../../shared/utils/stats-pool.js';

const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

export class ModificationTracker {
  constructor(options = {}) {
    this.modifications = new Map();
    this.windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  }

  mark(atomId) {
    const timestamp = Date.now();
    this.modifications.set(atomId, timestamp);
    return timestamp;
  }

  wasRecentlyModified(atomId) {
    const timestamp = this.modifications.get(atomId);
    if (!timestamp) return false;

    const now = Date.now();
    const age = now - timestamp;

    if (age > this.windowMs) {
      this.modifications.delete(atomId);
      return false;
    }

    return true;
  }

  pruneExpiredModifications() {
    const now = Date.now();
    for (const [atomId, timestamp] of this.modifications.entries()) {
      if (now - timestamp > this.windowMs) {
        this.modifications.delete(atomId);
      }
    }
  }

  getHistory() {
    return Array.from(this.modifications.entries()).map(([atomId, timestamp]) => ({
      atomId,
      timestamp,
      age: Date.now() - timestamp
    }));
  }

  getModificationTrackerStats() {
    return statsPool.getModuleStats('modification-tracker');
  }

  resetHistory() {
    this.modifications.clear();
  }

  containsModification(atomId) {
    return this.modifications.has(atomId);
  }

  size() {
    return this.modifications.size;
  }
}

export default ModificationTracker;

