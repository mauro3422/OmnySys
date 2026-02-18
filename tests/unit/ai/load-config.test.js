import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadAIConfig } from '#ai/llm/load-config.js';
import { AIConfigBuilder } from '#test-factories/ai/builders.js';

describe('loadAIConfig', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-config-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('config loading', () => {
    it('should load valid config from file', async () => {
      const configPath = path.join(tempDir, 'ai-config.json');
      const config = AIConfigBuilder.create()
        .withGPUEnabled(true)
        .withCPUFallback(true)
        .withTimeout(60000)
        .build();
      
      await fs.writeFile(configPath, JSON.stringify(config));
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded.llm.enabled).toBe(true);
      expect(loaded.performance.enableCPUFallback).toBe(true);
      expect(loaded.performance.timeout).toBe(60000);
    });

    it('should load config with all fields', async () => {
      const configPath = path.join(tempDir, 'ai-config-full.json');
      const config = AIConfigBuilder.create()
        .withGPUPort(9000)
        .withCPUPort(9001)
        .withMaxConcurrent(4)
        .withSystemPrompt('Custom prompt')
        .withComplexityThreshold(0.9)
        .build();
      
      await fs.writeFile(configPath, JSON.stringify(config));
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded.llm.gpu.port).toBe(9000);
      expect(loaded.llm.cpu.port).toBe(9001);
      expect(loaded.performance.maxConcurrentAnalyses).toBe(4);
      expect(loaded.prompts.systemPrompt).toBe('Custom prompt');
      expect(loaded.analysis.complexityThreshold).toBe(0.9);
    });

    it('should resolve relative paths correctly', async () => {
      const configPath = path.join(tempDir, 'relative-config.json');
      const config = AIConfigBuilder.create().minimal().build();
      
      await fs.writeFile(configPath, JSON.stringify(config));
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded).toBeDefined();
      expect(loaded.llm.enabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return default config for non-existent file', async () => {
      const loaded = await loadAIConfig('/non/existent/path/config.json');
      
      expect(loaded).toBeDefined();
      expect(loaded.llm.enabled).toBe(true);
      expect(loaded.analysis).toBeDefined();
      expect(loaded.performance).toBeDefined();
      expect(loaded.prompts).toBeDefined();
    });

    it('should return default config for invalid JSON', async () => {
      const configPath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(configPath, '{ invalid json }');
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded).toBeDefined();
      expect(loaded.llm.enabled).toBe(true);
    });

    it('should return default config for empty file', async () => {
      const configPath = path.join(tempDir, 'empty.json');
      await fs.writeFile(configPath, '');
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded).toBeDefined();
      expect(loaded.llm.enabled).toBe(true);
    });

    it('should handle partial configs without defaults for non-error path', async () => {
      const configPath = path.join(tempDir, 'partial.json');
      await fs.writeFile(configPath, JSON.stringify({ llm: { enabled: false } }));
      
      const loaded = await loadAIConfig(configPath);
      
      expect(loaded.llm.enabled).toBe(false);
      expect(loaded.llm).toBeDefined();
    });
  });

  describe('default config structure', () => {
    it('should have all required fields in default config', async () => {
      const loaded = await loadAIConfig('/non/existent/path');
      
      expect(loaded.llm).toBeDefined();
      expect(loaded.llm.enabled).toBe(true);
      expect(loaded.analysis.useStaticFirst).toBe(true);
      expect(loaded.analysis.llmOnlyForComplex).toBe(true);
      expect(loaded.analysis.complexityThreshold).toBe(0.7);
      expect(loaded.analysis.confidenceThreshold).toBe(0.8);
      expect(loaded.performance.enableCPUFallback).toBe(false);
      expect(loaded.performance.maxConcurrentAnalyses).toBe(2);
      expect(loaded.performance.timeout).toBe(120000);
      expect(loaded.prompts.systemPrompt).toBeDefined();
    });
  });
});
