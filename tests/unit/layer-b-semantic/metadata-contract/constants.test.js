/**
 * @fileoverview constants.test.js
 * 
 * Tests para constantes del metadata-contract
 * 
 * @module tests/unit/layer-b-semantic/metadata-contract/constants
 */

import { describe, it, expect } from 'vitest';
import {
  REQUIRED_METADATA_FIELDS,
  OPTIONAL_METADATA_FIELDS,
  ALL_METADATA_FIELDS,
  ARCHITECTURAL_THRESHOLDS,
  ARRAY_LIMITS,
  TYPESCRIPT_EXTENSIONS,
  SINGLETON_INDICATORS
} from '#layer-b/metadata-contract/constants.js';

describe('metadata-contract/constants', () => {
  describe('REQUIRED_METADATA_FIELDS', () => {
    it('should be an array', () => {
      expect(Array.isArray(REQUIRED_METADATA_FIELDS)).toBe(true);
    });

    it('should contain filePath', () => {
      expect(REQUIRED_METADATA_FIELDS).toContain('filePath');
    });

    it('should contain exportCount', () => {
      expect(REQUIRED_METADATA_FIELDS).toContain('exportCount');
    });

    it('should contain dependentCount', () => {
      expect(REQUIRED_METADATA_FIELDS).toContain('dependentCount');
    });

    it('should contain importCount', () => {
      expect(REQUIRED_METADATA_FIELDS).toContain('importCount');
    });

    it('should contain functionCount', () => {
      expect(REQUIRED_METADATA_FIELDS).toContain('functionCount');
    });

    it('should have 5 required fields', () => {
      expect(REQUIRED_METADATA_FIELDS.length).toBe(5);
    });
  });

  describe('OPTIONAL_METADATA_FIELDS', () => {
    it('should be an array', () => {
      expect(Array.isArray(OPTIONAL_METADATA_FIELDS)).toBe(true);
    });

    it('should contain exports', () => {
      expect(OPTIONAL_METADATA_FIELDS).toContain('exports');
    });

    it('should contain dependents', () => {
      expect(OPTIONAL_METADATA_FIELDS).toContain('dependents');
    });

    it('should contain flags', () => {
      expect(OPTIONAL_METADATA_FIELDS).toContain('hasDynamicImports');
      expect(OPTIONAL_METADATA_FIELDS).toContain('hasTypeScript');
      expect(OPTIONAL_METADATA_FIELDS).toContain('hasGlobalAccess');
    });

    it('should contain data arrays', () => {
      expect(OPTIONAL_METADATA_FIELDS).toContain('localStorageKeys');
      expect(OPTIONAL_METADATA_FIELDS).toContain('eventNames');
      expect(OPTIONAL_METADATA_FIELDS).toContain('envVars');
    });
  });

  describe('ALL_METADATA_FIELDS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_METADATA_FIELDS)).toBe(true);
    });

    it('should include all required fields', () => {
      REQUIRED_METADATA_FIELDS.forEach(field => {
        expect(ALL_METADATA_FIELDS).toContain(field);
      });
    });

    it('should include all optional fields', () => {
      OPTIONAL_METADATA_FIELDS.forEach(field => {
        expect(ALL_METADATA_FIELDS).toContain(field);
      });
    });

    it('should have correct total count', () => {
      expect(ALL_METADATA_FIELDS.length).toBe(
        REQUIRED_METADATA_FIELDS.length + OPTIONAL_METADATA_FIELDS.length
      );
    });
  });

  describe('ARCHITECTURAL_THRESHOLDS', () => {
    it('should have GOD_OBJECT thresholds', () => {
      expect(ARCHITECTURAL_THRESHOLDS).toHaveProperty('GOD_OBJECT');
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT).toHaveProperty('MIN_EXPORTS');
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT).toHaveProperty('MIN_DEPENDENTS');
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT).toHaveProperty('HIGH_DEPENDENTS');
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT).toHaveProperty('COUPLING_RATIO');
    });

    it('should have correct God Object values', () => {
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT.MIN_EXPORTS).toBe(5);
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT.MIN_DEPENDENTS).toBe(5);
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT.HIGH_DEPENDENTS).toBe(10);
      expect(ARCHITECTURAL_THRESHOLDS.GOD_OBJECT.COUPLING_RATIO).toBe(3);
    });

    it('should have ORPHAN_MODULE thresholds', () => {
      expect(ARCHITECTURAL_THRESHOLDS).toHaveProperty('ORPHAN_MODULE');
      expect(ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE).toHaveProperty('MAX_DEPENDENTS');
      expect(ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE).toHaveProperty('MIN_EXPORTS');
    });

    it('should have correct Orphan Module values', () => {
      expect(ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE.MAX_DEPENDENTS).toBe(0);
      expect(ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE.MIN_EXPORTS).toBe(1);
    });
  });

  describe('ARRAY_LIMITS', () => {
    it('should have EXPORTS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('EXPORTS');
      expect(typeof ARRAY_LIMITS.EXPORTS).toBe('number');
    });

    it('should have DEPENDENTS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('DEPENDENTS');
      expect(typeof ARRAY_LIMITS.DEPENDENTS).toBe('number');
    });

    it('should have EVENT_NAMES limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('EVENT_NAMES');
      expect(typeof ARRAY_LIMITS.EVENT_NAMES).toBe('number');
    });

    it('should have GLOBAL_WRITES limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('GLOBAL_WRITES');
    });

    it('should have GLOBAL_READS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('GLOBAL_READS');
    });

    it('should have ENV_VARS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('ENV_VARS');
    });

    it('should have SEMANTIC_CONNECTIONS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('SEMANTIC_CONNECTIONS');
    });

    it('should have LOCAL_STORAGE_KEYS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('LOCAL_STORAGE_KEYS');
    });

    it('should have COLOCATED_FILES limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('COLOCATED_FILES');
    });

    it('should have ROUTE_STRINGS limit', () => {
      expect(ARRAY_LIMITS).toHaveProperty('ROUTE_STRINGS');
    });
  });

  describe('TYPESCRIPT_EXTENSIONS', () => {
    it('should be an array', () => {
      expect(Array.isArray(TYPESCRIPT_EXTENSIONS)).toBe(true);
    });

    it('should contain .ts', () => {
      expect(TYPESCRIPT_EXTENSIONS).toContain('.ts');
    });

    it('should contain .tsx', () => {
      expect(TYPESCRIPT_EXTENSIONS).toContain('.tsx');
    });

    it('should have 2 extensions', () => {
      expect(TYPESCRIPT_EXTENSIONS.length).toBe(2);
    });
  });

  describe('SINGLETON_INDICATORS', () => {
    it('should be an array', () => {
      expect(Array.isArray(SINGLETON_INDICATORS)).toBe(true);
    });

    it('should contain singleton', () => {
      expect(SINGLETON_INDICATORS).toContain('singleton');
    });

    it('should contain getinstance', () => {
      expect(SINGLETON_INDICATORS).toContain('getinstance');
    });

    it('should contain instance', () => {
      expect(SINGLETON_INDICATORS).toContain('instance');
    });

    it('should have 3 indicators', () => {
      expect(SINGLETON_INDICATORS.length).toBe(3);
    });

    it('should have lowercase strings', () => {
      SINGLETON_INDICATORS.forEach(indicator => {
        expect(indicator).toBe(indicator.toLowerCase());
      });
    });
  });
});
