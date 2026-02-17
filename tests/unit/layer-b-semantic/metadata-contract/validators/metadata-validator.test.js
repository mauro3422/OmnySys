/**
 * @fileoverview metadata-validator.test.js
 * 
 * Tests para validación de metadatos
 * 
 * @module tests/unit/layer-b-semantic/metadata-contract/validators/metadata-validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateMetadata,
  validateField,
  hasRequiredFields
} from '#layer-b/metadata-contract/validators/metadata-validator.js';
import { MetadataBuilder } from '../../../../factories/layer-b-metadata/builders.js';
import { REQUIRED_METADATA_FIELDS } from '#layer-b/metadata-contract/constants.js';

describe('metadata-contract/validators/metadata-validator', () => {
  describe('validateMetadata', () => {
    it('should validate complete metadata', () => {
      const metadata = new MetadataBuilder().build();
      
      const result = validateMetadata(metadata);
      
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const metadata = {};
      
      const result = validateMetadata(metadata);
      
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      REQUIRED_METADATA_FIELDS.forEach(field => {
        expect(result.missing).toContain(field);
      });
    });

    it('should detect null fields as missing', () => {
      const metadata = new MetadataBuilder()
        .withoutField('filePath')
        .build();
      metadata.filePath = null;
      
      const result = validateMetadata(metadata);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('filePath');
    });

    it('should validate number fields', () => {
      const metadata = new MetadataBuilder()
        .withInvalidType('exportCount', 'five')
        .withInvalidType('dependentCount', [1, 2, 3])
        .build();
      
      const result = validateMetadata(metadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exportCount must be a number'))).toBe(true);
      expect(result.errors.some(e => e.includes('dependentCount must be a number'))).toBe(true);
    });

    it('should validate array fields', () => {
      const metadata = new MetadataBuilder()
        .withInvalidType('exports', 'Component, helper')
        .withInvalidType('dependents', null)
        .build();
      
      const result = validateMetadata(metadata);
      
      expect(result.errors.some(e => e.includes('exports must be an array'))).toBe(true);
    });

    it('should validate filePath is string', () => {
      const metadata = new MetadataBuilder()
        .withInvalidType('filePath', 123)
        .build();
      
      const result = validateMetadata(metadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('filePath must be a string'))).toBe(true);
    });

    it('should accept undefined optional fields', () => {
      const metadata = new MetadataBuilder()
        .withoutField('localStorageKeys')
        .withoutField('eventNames')
        .build();
      
      const result = validateMetadata(metadata);
      
      expect(result.errors.some(e => e.includes('localStorageKeys'))).toBe(false);
      expect(result.errors.some(e => e.includes('eventNames'))).toBe(false);
    });

    it('should validate all number fields', () => {
      const numberFields = ['exportCount', 'dependentCount', 'importCount', 'functionCount'];
      
      numberFields.forEach(field => {
        const metadata = new MetadataBuilder()
          .withInvalidType(field, 'invalid')
          .build();
        
        const result = validateMetadata(metadata);
        expect(result.errors.some(e => e.includes(`${field} must be a number`))).toBe(true);
      });
    });

    it('should validate all array fields', () => {
      const arrayFields = ['exports', 'dependents', 'localStorageKeys', 'eventNames', 'envVars'];
      
      arrayFields.forEach(field => {
        const metadata = new MetadataBuilder()
          .withInvalidType(field, 'invalid')
          .build();
        
        const result = validateMetadata(metadata);
        expect(result.errors.some(e => e.includes(`${field} must be an array`))).toBe(true);
      });
    });
  });

  describe('validateField', () => {
    it('should return null for valid string field', () => {
      const metadata = { filePath: 'src/test.js' };
      
      const result = validateField(metadata, 'filePath', 'string');
      
      expect(result).toBeNull();
    });

    it('should return null for valid number field', () => {
      const metadata = { exportCount: 5 };
      
      const result = validateField(metadata, 'exportCount', 'number');
      
      expect(result).toBeNull();
    });

    it('should return null for valid array field', () => {
      const metadata = { exports: ['a', 'b'] };
      
      const result = validateField(metadata, 'exports', 'array');
      
      expect(result).toBeNull();
    });

    it('should return null for undefined optional field', () => {
      const metadata = {};
      
      const result = validateField(metadata, 'optionalField', 'string');
      
      expect(result).toBeNull();
    });

    it('should return null for null optional field', () => {
      const metadata = { optionalField: null };
      
      const result = validateField(metadata, 'optionalField', 'string');
      
      expect(result).toBeNull();
    });

    it('should return error for type mismatch', () => {
      const metadata = { exportCount: 'five' };
      
      const result = validateField(metadata, 'exportCount', 'number');
      
      expect(result).toBe('exportCount must be number, got string');
    });

    it('should detect array type correctly', () => {
      const metadata = { exports: 'not an array' };
      
      const result = validateField(metadata, 'exports', 'array');
      
      expect(result).toBe('exports must be array, got string');
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true when all required fields present', () => {
      const metadata = new MetadataBuilder().build();
      
      const result = hasRequiredFields(metadata);
      
      expect(result).toBe(true);
    });

    it('should return false when missing required field', () => {
      const metadata = new MetadataBuilder()
        .withoutField('filePath')
        .build();
      
      const result = hasRequiredFields(metadata);
      
      expect(result).toBe(false);
    });

    it('should return false when field is null', () => {
      const metadata = new MetadataBuilder().build();
      metadata.filePath = null;
      
      const result = hasRequiredFields(metadata);
      
      expect(result).toBe(false);
    });

    it('should return false when field is undefined', () => {
      const metadata = new MetadataBuilder().build();
      metadata.filePath = undefined;
      
      const result = hasRequiredFields(metadata);
      
      expect(result).toBe(false);
    });

    it('should check all required fields', () => {
      REQUIRED_METADATA_FIELDS.forEach(fieldToRemove => {
        const metadata = new MetadataBuilder().build();
        delete metadata[fieldToRemove];
        
        const result = hasRequiredFields(metadata);
        expect(result).toBe(false);
      });
    });
  });
});
