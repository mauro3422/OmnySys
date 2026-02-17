/**
 * @fileoverview prompt-engine-index.test.js
 * 
 * Tests para el facade principal del prompt-engine
 * 
 * @module tests/unit/layer-b-semantic/prompt-engine/index
 */

import { describe, it, expect } from 'vitest';
import {
  // Core
  PromptEngine,
  ENGINE_DEFAULT_CONFIG,
  generateSystemPrompt,
  generateUserPrompt,
  generatePromptConfig,
  generatePromptWithOptions,
  PromptGenerationOptions,
  resolveSchema,
  getSchemaSync,
  preloadSchemas,
  hasSchema,
  listAvailableSchemas,
  
  // Config
  BASE_RULES,
  SPECIFIC_RULES,
  getRulesForType,
  hasSpecificRules,
  getSupportedAnalysisTypes,
  PLACEHOLDER_DEFINITIONS,
  getAllPlaceholders,
  extractRequiredPlaceholders,
  resolvePlaceholder,
  isValidPlaceholder,
  listAvailablePlaceholders,
  DEFAULT_ENGINE_CONFIG,
  
  // Validators
  ValidationResult,
  validatePrompt,
  validateTemplate,
  validatePromptOrThrow,
  
  // Utils
  extractPlaceholders,
  replacePlaceholder,
  replaceAllPlaceholders,
  createReplacementMap,
  applyReplacements,
  compactBlock,
  compactMetadataSection,
  insertFileContent,
  formatMetadataForDisplay,
  
  // Version
  VERSION,
  REFACTOR_DATE
} from '#layer-b/prompt-engine/index.js';

describe('prompt-engine/index - Main Facade', () => {
  describe('Core Exports', () => {
    it('should export PromptEngine class', () => {
      expect(PromptEngine).toBeDefined();
      expect(typeof PromptEngine).toBe('function');
    });

    it('should export ENGINE_DEFAULT_CONFIG', () => {
      expect(ENGINE_DEFAULT_CONFIG).toBeDefined();
      expect(ENGINE_DEFAULT_CONFIG).toHaveProperty('temperature');
      expect(ENGINE_DEFAULT_CONFIG).toHaveProperty('maxTokens');
      expect(ENGINE_DEFAULT_CONFIG.temperature).toBe(0.0);
    });

    it('should export generator functions', () => {
      expect(typeof generateSystemPrompt).toBe('function');
      expect(typeof generateUserPrompt).toBe('function');
      expect(typeof generatePromptConfig).toBe('function');
      expect(typeof generatePromptWithOptions).toBe('function');
    });

    it('should export PromptGenerationOptions', () => {
      expect(PromptGenerationOptions).toBeDefined();
      expect(PromptGenerationOptions).toHaveProperty('DEFAULT');
      expect(PromptGenerationOptions).toHaveProperty('FAST');
      expect(PromptGenerationOptions).toHaveProperty('DETAILED');
    });

    it('should export schema functions', () => {
      expect(typeof resolveSchema).toBe('function');
      expect(typeof hasSchema).toBe('function');
      expect(typeof listAvailableSchemas).toBe('function');
    });
  });

  describe('Config Exports', () => {
    it('should export anti-hallucination rules', () => {
      expect(BASE_RULES).toBeDefined();
      expect(SPECIFIC_RULES).toBeDefined();
      expect(typeof getRulesForType).toBe('function');
    });

    it('should export placeholder utilities', () => {
      expect(PLACEHOLDER_DEFINITIONS).toBeDefined();
      expect(typeof extractRequiredPlaceholders).toBe('function');
      expect(typeof isValidPlaceholder).toBe('function');
    });

    it('should export DEFAULT_ENGINE_CONFIG', () => {
      expect(DEFAULT_ENGINE_CONFIG).toBeDefined();
      expect(DEFAULT_ENGINE_CONFIG.temperature).toBe(0.0);
    });
  });

  describe('Validator Exports', () => {
    it('should export ValidationResult', () => {
      expect(ValidationResult).toBeDefined();
    });

    it('should export validation functions', () => {
      expect(typeof validatePrompt).toBe('function');
      expect(typeof validateTemplate).toBe('function');
    });
  });

  describe('Utils Exports', () => {
    it('should export placeholder replacers', () => {
      expect(typeof extractPlaceholders).toBe('function');
      expect(typeof replacePlaceholder).toBe('function');
      expect(typeof replaceAllPlaceholders).toBe('function');
      expect(typeof createReplacementMap).toBe('function');
      expect(typeof applyReplacements).toBe('function');
    });

    it('should export metadata formatters', () => {
      expect(typeof compactBlock).toBe('function');
      expect(typeof compactMetadataSection).toBe('function');
      expect(typeof insertFileContent).toBe('function');
      expect(typeof formatMetadataForDisplay).toBe('function');
    });
  });

  describe('Version Export', () => {
    it('should export VERSION', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toBe('2.0.0');
    });

    it('should export REFACTOR_DATE', () => {
      expect(REFACTOR_DATE).toBeDefined();
      expect(typeof REFACTOR_DATE).toBe('string');
    });
  });

  describe('Integration - Default Export', () => {
    it('should have default singleton instance', async () => {
      const defaultEngine = await import('#layer-b/prompt-engine/index.js');
      expect(defaultEngine.default).toBeDefined();
      expect(defaultEngine.default).toBeInstanceOf(PromptEngine);
    });
  });
});
