/**
 * @fileoverview external-resource-tracker.js
 *
 * Tracks access to external resources (DB, cache, file system)
 *
 * @module race-detector/trackers/external-resource-tracker
 */

import { BaseTracker } from './base-tracker.js';

/**
 * Tracker for external resource access
 */
export class ExternalResourceTracker extends BaseTracker {
  constructor(project) {
    super(project);
    
    // Patterns for different resource types
    this.resourcePatterns = {
      database: [
        { pattern: /\b(db|database)\./i, type: 'database' },
        { pattern: /\b(query|insert|update|delete|select)\b/i, type: 'database' },
        { pattern: /\b(sequelize|prisma|mongoose|typeorm|knex)\b/i, type: 'database' }
      ],
      cache: [
        { pattern: /\b(redis|cache|memcached)\./i, type: 'cache' },
        { pattern: /\bgetCache|setCache|delCache\b/i, type: 'cache' }
      ],
      filesystem: [
        { pattern: /\bfs\./i, type: 'filesystem' },
        { pattern: /\b(readFile|writeFile|appendFile|unlink)\b/i, type: 'filesystem' }
      ],
      api: [
        { pattern: /\b(fetch|axios|http|request)\b/i, type: 'api' },
        { pattern: /\bpost|put|patch|delete\b/i, type: 'api' }
      ]
    };
  }

  /**
   * Track external resource access
   * @param {Object} molecule - Molecule with atoms
   * @param {Object} module - Parent module
   */
  trackMolecule(molecule, module) {
    const atoms = molecule.atoms || [];
    
    for (const atom of atoms) {
      this.trackAtom(atom, molecule, module);
    }
  }

  /**
   * Track external calls in a single atom
   * @private
   */
  trackAtom(atom, molecule, module) {
    const calls = atom.calls || [];
    
    for (const call of calls) {
      if (call.type === 'external') {
        const resourceInfo = this.identifyResource(call);
        if (resourceInfo) {
          this.registerAccess(
            'external',
            `${resourceInfo.type}:${resourceInfo.name}`,
            atom,
            module,
            {
              type: 'call',
              operation: call.name,
              line: call.line,
              resourceType: resourceInfo.type
            },
            molecule.filePath
          );
        }
      }
    }
  }

  /**
   * Identify the type of external resource
   * @private
   */
  identifyResource(call) {
    const name = call.name || '';
    
    for (const [resourceType, patterns] of Object.entries(this.resourcePatterns)) {
      for (const { pattern } of patterns) {
        if (pattern.test(name)) {
          return { type: resourceType, name };
        }
      }
    }
    
    return null;
  }
}

export default ExternalResourceTracker;
