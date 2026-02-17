/**
 * @fileoverview connection.test.js
 * 
 * Tests para validación de conexiones semánticas
 * 
 * @module tests/unit/layer-b-semantic/schema-validator/validators/connection
 */

import { describe, it, expect } from 'vitest';
import { validateSemanticConnection } from '#layer-b/schema-validator/validators/connection.js';

describe('schema-validator/validators/connection', () => {
  describe('validateSemanticConnection', () => {
    it('should validate valid connection', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require id field', () => {
      const connection = {
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
    });

    it('should require type field', () => {
      const connection = {
        id: 'conn1',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: type');
    });

    it('should require target field', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        reason: 'Listens to events',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: target');
    });

    it('should require reason field', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: reason');
    });

    it('should require confidence field', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events'
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: confidence');
    });

    it('should validate type is valid', () => {
      const connection = {
        id: 'conn1',
        type: 'invalid_type',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.85
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
    });

    it('should accept valid types', () => {
      const validTypes = ['shared_state', 'event_listener', 'callback', 'side_effect', 'global_access', 'mutation'];
      
      validTypes.forEach(type => {
        const connection = {
          id: 'conn1',
          type,
          target: 'target.js',
          reason: 'Test reason',
          confidence: 0.85
        };
        
        const result = validateSemanticConnection(connection);
        expect(result.errors.some(e => e.includes('Invalid type'))).toBe(false);
      });
    });

    it('should validate confidence is number', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 'high'
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid confidence type'))).toBe(true);
    });

    it('should validate confidence is between 0 and 1', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 1.5
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid confidence value'))).toBe(true);
    });

    it('should validate confidence meets minimum', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.5
      };
      
      const result = validateSemanticConnection(connection, 0.7);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Low confidence'))).toBe(true);
    });

    it('should validate severity if provided', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0.85,
        severity: 'invalid'
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid severity'))).toBe(true);
    });

    it('should accept valid severities', () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      
      validSeverities.forEach(severity => {
        const connection = {
          id: 'conn1',
          type: 'event_listener',
          target: 'target.js',
          reason: 'Test reason',
          confidence: 0.85,
          severity
        };
        
        const result = validateSemanticConnection(connection);
        expect(result.errors.some(e => e.includes('Invalid severity'))).toBe(false);
      });
    });

    it('should handle confidence of 0', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 0
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Low confidence'))).toBe(true);
    });

    it('should handle confidence of 1', () => {
      const connection = {
        id: 'conn1',
        type: 'event_listener',
        target: 'target.js',
        reason: 'Listens to events',
        confidence: 1
      };
      
      const result = validateSemanticConnection(connection);
      expect(result.valid).toBe(true);
    });
  });
});
