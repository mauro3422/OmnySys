/**
 * @fileoverview TimingAnalyzer.js
 * 
 * Analyzes timing and concurrency patterns for race detection.
 * 
 * @module race-detector/strategies/race-detection-strategy/detectors/TimingAnalyzer
 */

import {
  findAtomById as findAtomByIdInProject,
  findEntryPoints as findEntryPointsInProject,
  getAtomCallers as getAtomCallersInProject
} from '../analyzers/timing-analyzer/detectors/atom-finder.js';

/**
 * Analyzes timing and concurrency patterns
 */
export class TimingAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Check if two accesses can run concurrently
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if can run concurrently
   */
  canRunConcurrently(access1, access2, project) {
    if (access1.isAsync && access2.isAsync) {
      return true;
    }

    if (!this.sameBusinessFlow(access1, access2, project)) {
      return true;
    }

    const entry1 = this.findEntryPoints(access1.atom, project);
    const entry2 = this.findEntryPoints(access2.atom, project);

    return !entry1.some(e => entry2.includes(e));
  }

  /**
   * Check if accesses are in same business flow
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same flow
   */
  sameBusinessFlow(access1, access2, project) {
    const callers1 = this.getAtomCallers(access1.atom, project);
    const callers2 = this.getAtomCallers(access2.atom, project);
    return callers1.some(c => callers2.includes(c));
  }

  /**
   * Check if accesses share entry point
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {boolean} - True if same entry point
   */
  sameEntryPoint(access1, access2, project) {
    const entry1 = this.findEntryPoints(access1.atom, project);
    const entry2 = this.findEntryPoints(access2.atom, project);
    return entry1.some(e => entry2.includes(e));
  }

  /**
   * Get callers of an atom
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Array of atom IDs that call this atom
   */
  getAtomCallers(atomId, project) {
    const cacheKey = `callers_${atomId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const callers = getAtomCallersInProject(atomId, project);
    this.cache.set(cacheKey, callers);
    return callers;
  }

  /**
   * Find entry points for an atom
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Array<string>} - Entry point atom IDs
   */
  findEntryPoints(atomId, project) {
    const cacheKey = `entries_${atomId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const entries = findEntryPointsInProject(atomId, project);
    this.cache.set(cacheKey, entries);
    return entries;
  }

  /**
   * Find atom by ID
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Object|null} - Atom data or null
   */
  findAtomById(atomId, project) {
    return findAtomByIdInProject(atomId, project);
  }

  /**
   * Clear internal cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default TimingAnalyzer;
