import { BaseTracker } from './base-tracker.js';
import { GlobalInitializationRule } from '../../pattern-detection/detectors/rules/singleton-rules.js';

/**
 * Tracker for singleton patterns
 */
export class SingletonTracker extends BaseTracker {
  constructor(db) {
    super(db);
    this._initRules();
  }

  _initRules() {
    this.rules = [
      new GlobalInitializationRule()
    ];
  }

  trackMolecule(molecule, module) {
    if (!molecule) return;
    const filePath = molecule.filePath;

    for (const rule of this.rules) {
      rule.check([], filePath, molecule, {
        registerAccess: (type, name, atom, mod, details, path) => {
          this.registerAccess(type, name, atom, mod || module, details, path);
        }
      });
    }
  }
}

export default SingletonTracker;
