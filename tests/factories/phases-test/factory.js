/**
 * @fileoverview Phases Test Factory - Main Factory
 */

import { AtomBuilder, FileMetadataBuilder, FunctionInfoBuilder } from './builders.js';
import { AtomScenarios, PhaseContextScenarios } from './scenarios.js';

export class PhasesTestFactory {
  /**
   * Create a phase context
   * @param {string} scenario - Scenario name
   * @returns {Object} Phase context
   */
  static createContext(scenario = 'empty') {
    return PhaseContextScenarios[scenario] 
      ? PhaseContextScenarios[scenario]()
      : PhaseContextScenarios.empty();
  }

  /**
   * Create an atom
   * @param {string} scenario - Scenario name or custom name
   * @returns {Object} Atom metadata
   */
  static createAtom(scenario = 'simpleUtility') {
    if (AtomScenarios[scenario]) {
      return AtomScenarios[scenario]();
    }
    return AtomBuilder.create(scenario).build();
  }

  /**
   * Create multiple atoms
   * @param {number} count - Number of atoms
   * @returns {Array} Array of atoms
   */
  static createAtoms(count) {
    return Array.from({ length: count }, (_, i) => 
      AtomBuilder.create(`func${i}`).build()
    );
  }

  /**
   * Create a function info
   * @param {string} name - Function name
   * @returns {Object} Function info
   */
  static createFunctionInfo(name = 'testFunction') {
    return FunctionInfoBuilder.create(name).build();
  }

  /**
   * Create file metadata
   * @returns {Object} File metadata
   */
  static createFileMetadata() {
    return FileMetadataBuilder.create().build();
  }
}
