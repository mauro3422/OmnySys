import { describe, it, expect, beforeEach } from 'vitest';
import { BatchAnalyzer } from '#ai/llm/client/analysis/batch.js';
import { Analyzer } from '#ai/llm/client/analysis/analyzer.js';
import { PromptBuilder } from '#ai/llm/client/prompts/builder.js';
import { ServerManager } from '#ai/llm/client/server/server-manager.js';
import { AIConfigBuilder } from '#test-factories/ai/builders.js';

describe('BatchAnalyzer', () => {
  let batchAnalyzer;
  let analyzer;
  let serverManager;
  let promptBuilder;

  beforeEach(() => {
    const config = AIConfigBuilder.create()
      .withMaxConcurrent(2)
      .build();
    serverManager = new ServerManager(config);
    promptBuilder = new PromptBuilder(config);
    analyzer = new Analyzer(serverManager, promptBuilder);
    batchAnalyzer = new BatchAnalyzer(analyzer, serverManager);
  });

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(batchAnalyzer.analyzer).toBe(analyzer);
      expect(batchAnalyzer.serverManager).toBe(serverManager);
    });
  });

  describe('analyzeBatch', () => {
    it.skip('SKIP: requires LLM server running - processes prompts in batches', async () => {
      serverManager.servers.gpu.available = true;
      
      const prompts = ['p1', 'p2', 'p3', 'p4'];
      const results = await batchAnalyzer.analyzeBatch(prompts, 'gpu');
      
      expect(results).toHaveLength(4);
    });

    it.skip('SKIP: requires LLM server running - respects max concurrent limit', async () => {
      serverManager.servers.gpu.available = true;
      
      const prompts = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
      
      await batchAnalyzer.analyzeBatch(prompts, 'gpu');
    });

    it.skip('SKIP: requires LLM server running - handles errors gracefully', async () => {
      serverManager.servers.gpu.available = true;
      
      const prompts = ['valid', null, 'also valid'];
      const results = await batchAnalyzer.analyzeBatch(prompts, 'gpu');
      
      expect(results[1]).toHaveProperty('error');
    });

    it('returns empty array for empty input', async () => {
      const results = await batchAnalyzer.analyzeBatch([], 'gpu');
      
      expect(results).toEqual([]);
    });
  });

  describe('analyzeBatchWithPrompts', () => {
    it.skip('SKIP: requires LLM server running - processes with custom system prompts', async () => {
      serverManager.servers.gpu.available = true;
      
      const userPrompts = ['u1', 'u2'];
      const systemPrompts = ['s1', 's2'];
      
      const results = await batchAnalyzer.analyzeBatchWithPrompts(userPrompts, systemPrompts, 'gpu');
      
      expect(results).toHaveLength(2);
    });

    it.skip('SKIP: requires LLM server running - handles mismatched prompt arrays', async () => {
      serverManager.servers.gpu.available = true;
      
      const userPrompts = ['u1', 'u2', 'u3'];
      const systemPrompts = ['s1'];
      
      const results = await batchAnalyzer.analyzeBatchWithPrompts(userPrompts, systemPrompts, 'gpu');
      
      expect(results).toHaveLength(3);
    });

    it.skip('SKIP: requires LLM server running - handles empty system prompts', async () => {
      serverManager.servers.gpu.available = true;
      
      const userPrompts = ['u1', 'u2'];
      
      const results = await batchAnalyzer.analyzeBatchWithPrompts(userPrompts, [], 'gpu');
      
      expect(results).toHaveLength(2);
    });
  });

  describe('getMaxConcurrent', () => {
    it('should use serverManager max concurrent', () => {
      expect(batchAnalyzer.serverManager.getMaxConcurrent()).toBe(2);
    });

    it('should use custom max concurrent from config', () => {
      const config = AIConfigBuilder.create()
        .withMaxConcurrent(8)
        .build();
      const sm = new ServerManager(config);
      const pb = new PromptBuilder(config);
      const a = new Analyzer(sm, pb);
      const ba = new BatchAnalyzer(a, sm);
      
      expect(ba.serverManager.getMaxConcurrent()).toBe(8);
    });
  });
});
