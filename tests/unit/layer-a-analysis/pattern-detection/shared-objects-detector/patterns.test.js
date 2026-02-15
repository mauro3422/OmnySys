/**
 * @fileoverview Shared Objects Detector Patterns Tests
 * 
 * Tests for name-patterns.js pattern detection functions.
 * 
 * @module tests/unit/layer-a-analysis/pattern-detection/shared-objects-detector/patterns
 */

import { describe, it, expect } from 'vitest';
import { 
  isConfigObject, 
  isStateObject, 
  isUtilsObject 
} from '#layer-a/pattern-detection/detectors/shared-objects-detector/patterns/name-patterns.js';

describe('Name Patterns', () => {
  /**
   * ============================================
   * CONFIG PATTERN CONTRACT
   * ============================================
   */

  describe('Config Pattern Contract', () => {
    it('should identify CONFIG as config', () => {
      expect(isConfigObject('CONFIG')).toBe(true);
      expect(isConfigObject('config')).toBe(true);
      expect(isConfigObject('Config')).toBe(true);
    });

    it('should identify SETTINGS as config', () => {
      expect(isConfigObject('SETTINGS')).toBe(true);
      expect(isConfigObject('settings')).toBe(true);
    });

    it('should identify OPTIONS as config', () => {
      expect(isConfigObject('OPTIONS')).toBe(true);
      expect(isConfigObject('options')).toBe(true);
    });

    it('should identify DEFAULTS as config', () => {
      expect(isConfigObject('DEFAULTS')).toBe(true);
      expect(isConfigObject('defaults')).toBe(true);
    });

    it('should identify CONSTANTS as config', () => {
      expect(isConfigObject('CONSTANTS')).toBe(true);
      expect(isConfigObject('constants')).toBe(true);
    });

    it('should identify ENV as config', () => {
      expect(isConfigObject('ENV')).toBe(true);
      expect(isConfigObject('env')).toBe(true);
    });

    it('should identify CFG/CONF as config', () => {
      expect(isConfigObject('CFG')).toBe(true);
      expect(isConfigObject('CONF')).toBe(true);
    });

    it('should not identify regular names as config', () => {
      expect(isConfigObject('userStore')).toBe(false);
      expect(isConfigObject('dataManager')).toBe(false);
      expect(isConfigObject('appState')).toBe(false);
    });
  });

  /**
   * ============================================
   * STATE PATTERN CONTRACT
   * ============================================
   */

  describe('State Pattern Contract', () => {
    it('should identify *store as state', () => {
      expect(isStateObject('userStore', {}, '')).toBe(true);
      expect(isStateObject('appStore', {}, '')).toBe(true);
      expect(isStateObject('dataStore', {}, '')).toBe(true);
    });

    it('should identify *state as state', () => {
      expect(isStateObject('appState', {}, '')).toBe(true);
      expect(isStateObject('globalState', {}, '')).toBe(true);
    });

    it('should identify *manager as state', () => {
      expect(isStateObject('userManager', {}, '')).toBe(true);
      expect(isStateObject('stateManager', {}, '')).toBe(true);
    });

    it('should identify *cache as state', () => {
      expect(isStateObject('userCache', {}, '')).toBe(true);
      expect(isStateObject('dataCache', {}, '')).toBe(true);
    });

    it('should identify *registry as state', () => {
      expect(isStateObject('serviceRegistry', {}, '')).toBe(true);
      expect(isStateObject('moduleRegistry', {}, '')).toBe(true);
    });

    it('should identify *pool as state', () => {
      expect(isStateObject('connectionPool', {}, '')).toBe(true);
      expect(isStateObject('threadPool', {}, '')).toBe(true);
    });

    it('should identify *queue as state', () => {
      expect(isStateObject('taskQueue', {}, '')).toBe(true);
      expect(isStateObject('messageQueue', {}, '')).toBe(true);
    });

    it('should identify *buffer as state', () => {
      expect(isStateObject('dataBuffer', {}, '')).toBe(true);
    });

    it('should identify *context as state', () => {
      expect(isStateObject('appContext', {}, '')).toBe(true);
      expect(isStateObject('userContext', {}, '')).toBe(true);
    });

    it('should identify *provider as state', () => {
      expect(isStateObject('dataProvider', {}, '')).toBe(true);
    });

    it('should not identify config files as state', () => {
      expect(isStateObject('appStore', {}, 'src/config/types.js')).toBe(false);
      expect(isStateObject('userState', {}, 'src/constants/index.js')).toBe(false);
    });

    it('should not identify regular names as state', () => {
      expect(isStateObject('userData', {}, '')).toBe(false);
      expect(isConfigObject('data')).toBe(false);
    });
  });

  /**
   * ============================================
   * UTILS PATTERN CONTRACT
   * ============================================
   */

  describe('Utils Pattern Contract', () => {
    it('should identify *utils as utils', () => {
      expect(isUtilsObject('utils')).toBe(true);
      expect(isUtilsObject('stringUtils')).toBe(true);
      expect(isUtilsObject('arrayUtils')).toBe(true);
    });

    it('should identify *helpers as utils', () => {
      expect(isUtilsObject('helpers')).toBe(true);
      expect(isUtilsObject('domHelpers')).toBe(true);
    });

    it('should identify *tools as utils', () => {
      expect(isUtilsObject('tools')).toBe(true);
      expect(isUtilsObject('devTools')).toBe(true);
    });

    it('should identify lib as utils', () => {
      expect(isUtilsObject('lib')).toBe(true);
    });

    it('should identify *library as utils', () => {
      expect(isUtilsObject('library')).toBe(true);
      expect(isUtilsObject('myLibrary')).toBe(true);
    });

    it('should identify common as utils', () => {
      expect(isUtilsObject('common')).toBe(true);
    });

    it('should not identify regular names as utils', () => {
      expect(isUtilsObject('userStore')).toBe(false);
      expect(isUtilsObject('appState')).toBe(false);
    });
  });

  /**
   * ============================================
   * EDGE CASES CONTRACT
   * ============================================
   */

  describe('Edge Cases Contract', () => {
    it('should handle empty strings', () => {
      expect(isConfigObject('')).toBe(false);
      expect(isStateObject('', {}, '')).toBe(false);
      expect(isUtilsObject('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isConfigObject(null)).toBe(false);
      expect(isConfigObject(undefined)).toBe(false);
      expect(isStateObject(null, {}, '')).toBe(false);
      expect(isUtilsObject(undefined)).toBe(false);
    });

    it('should handle special characters', () => {
      expect(isConfigObject('CONFIG_123')).toBe(true);
      expect(isStateObject('store_1', {}, '')).toBe(true);
    });

    it('should handle very long names', () => {
      const longName = 'veryLongUserStoreNameThatIsQuiteLong';
      expect(isStateObject(longName, {}, '')).toBe(true);
    });

    it('should be case-insensitive where appropriate', () => {
      expect(isConfigObject('config')).toBe(true);
      expect(isConfigObject('Config')).toBe(true);
      expect(isConfigObject('CONFIG')).toBe(true);
    });
  });
});
