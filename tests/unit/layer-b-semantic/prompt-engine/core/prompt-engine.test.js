/**
 * @fileoverview prompt-engine.test.js
 * 
 * Tests para la clase PromptEngine
 * 
 * @module tests/unit/layer-b-semantic/prompt-engine/core/prompt-engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptEngine } from '#layer-b/prompt-engine/core/prompt-engine.js';
import { 
  PromptTemplateBuilder, 
  FileMetadataBuilder, 
  FileContentBuilder 
} from '../../../../factories/layer-b-prompt-engine/builders.js';

describe('prompt-engine/core/PromptEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PromptEngine();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(engine).toBeInstanceOf(PromptEngine);
      expect(engine.config).toBeDefined();
      expect(engine.config.temperature).toBe(0.0);
      expect(engine.config.maxTokens).toBe(2000);
    });

    it('should accept custom config', () => {
      const customEngine = new PromptEngine({
        temperature: 0.5,
        maxTokens: 1000,
        validatePrompts: false
      });
      
      expect(customEngine.config.temperature).toBe(0.5);
      expect(customEngine.config.maxTokens).toBe(1000);
      expect(customEngine.config.validatePrompts).toBe(false);
    });

    it('should merge config with defaults', () => {
      const customEngine = new PromptEngine({
        maxTokens: 3000
      });
      
      expect(customEngine.config.temperature).toBe(0.0); // default
      expect(customEngine.config.maxTokens).toBe(3000); // custom
      expect(customEngine.config.enableCompacting).toBe(true); // default
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = engine.getStats();
      expect(stats).toHaveProperty('cachedSchemas');
      expect(stats).toHaveProperty('config');
      expect(stats.cachedSchemas).toBe(0);
    });

    it('should include config in stats', () => {
      const stats = engine.getStats();
      expect(stats.config).toHaveProperty('temperature');
      expect(stats.config).toHaveProperty('maxTokens');
    });
  });

  describe('clearSchemaCache', () => {
    it('should clear cache', () => {
      engine.clearSchemaCache();
      const stats = engine.getStats();
      expect(stats.cachedSchemas).toBe(0);
    });
  });

  describe('generateSystemPromptOnly', () => {
    it('should generate system prompt for default type', async () => {
      const metadata = new FileMetadataBuilder().build();
      
      const systemPrompt = await engine.generateSystemPromptOnly(metadata);
      
      expect(typeof systemPrompt).toBe('string');
      expect(systemPrompt.length).toBeGreaterThan(0);
    });

    it('should include anti-hallucination rules', async () => {
      const metadata = new FileMetadataBuilder().build();
      
      const systemPrompt = await engine.generateSystemPromptOnly(metadata);
      
      expect(systemPrompt).toContain('JSON');
    });
  });

  describe('generateUserPromptOnly', () => {
    it('should generate user prompt with file content', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = 'const x = 1;';
      
      const userPrompt = await engine.generateUserPromptOnly(metadata, fileContent);
      
      expect(typeof userPrompt).toBe('string');
      expect(userPrompt).toContain(metadata.filePath);
      expect(userPrompt).toContain(fileContent);
    });

    it('should include metadata placeholders', async () => {
      const metadata = new FileMetadataBuilder()
        .withExports(['test'])
        .withDependents(5)
        .build();
      const fileContent = '';
      
      const userPrompt = await engine.generateUserPromptOnly(metadata, fileContent);
      
      expect(userPrompt).toContain('EXPORTS');
      expect(userPrompt).toContain('DEPENDENTS');
    });
  });

  describe('generatePrompt', () => {
    it('should generate complete prompt config', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = new FileContentBuilder().asSimpleModule().build().content;
      
      const config = await engine.generatePrompt(metadata, fileContent);
      
      expect(config).toHaveProperty('systemPrompt');
      expect(config).toHaveProperty('userPrompt');
      expect(config).toHaveProperty('jsonSchema');
      expect(config).toHaveProperty('analysisType');
      expect(config).toHaveProperty('temperature');
      expect(config).toHaveProperty('maxTokens');
    });

    it('should set temperature to 0.0', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = '';
      
      const config = await engine.generatePrompt(metadata, fileContent);
      
      expect(config.temperature).toBe(0.0);
    });

    it('should set default maxTokens', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = '';
      
      const config = await engine.generatePrompt(metadata, fileContent);
      
      expect(config.maxTokens).toBe(2000);
    });

    it('should cache schema after first use', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = '';
      
      await engine.generatePrompt(metadata, fileContent);
      const stats1 = engine.getStats();
      
      await engine.generatePrompt(metadata, fileContent);
      const stats2 = engine.getStats();
      
      expect(stats2.cachedSchemas).toBe(stats1.cachedSchemas);
    });
  });

  describe('preloadSchemas', () => {
    it('should preload specified schemas', async () => {
      await engine.preloadSchemas(['default', 'semantic-connections']);
      
      const stats = engine.getStats();
      expect(stats.cachedSchemas).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing template gracefully', async () => {
      const metadata = new FileMetadataBuilder().build();
      const fileContent = '';
      
      // Should not throw, use default template
      const config = await engine.generatePrompt(metadata, fileContent);
      expect(config).toBeDefined();
    });
  });
});
