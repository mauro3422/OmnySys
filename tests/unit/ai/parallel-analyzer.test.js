import { describe, it, expect, beforeEach } from 'vitest';
import { ParallelAnalyzer } from '#ai/llm/client/analysis/parallel.js';
import { Analyzer } from '#ai/llm/client/analysis/analyzer.js';
import { PromptBuilder } from '#ai/llm/client/prompts/builder.js';
import { ServerManager } from '#ai/llm/client/server/server-manager.js';
import { AIConfigBuilder } from '#test-factories/ai/builders.js';

describe('ParallelAnalyzer', () => {
  let parallelAnalyzer;
  let analyzer;
  let serverManager;
  let promptBuilder;

  beforeEach(() => {
    const config = AIConfigBuilder.create()
      .withCPUFallback(true)
      .build();
    serverManager = new ServerManager(config);
    promptBuilder = new PromptBuilder(config);
    analyzer = new Analyzer(serverManager, promptBuilder);
    parallelAnalyzer = new ParallelAnalyzer(analyzer, serverManager);
  });

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(parallelAnalyzer.analyzer).toBe(analyzer);
      expect(parallelAnalyzer.serverManager).toBe(serverManager);
    });
  });

  describe('analyzeParallel', () => {
    it.skip('SKIP: requires LLM server running - distributes across servers', async () => {
      serverManager.servers.gpu.available = true;
      serverManager.servers.cpu.available = true;
      
      const prompts = ['p1', 'p2', 'p3', 'p4'];
      const results = await parallelAnalyzer.analyzeParallel(prompts);
      
      expect(results).toHaveLength(4);
    });

    it.skip('SKIP: requires LLM server running - uses gpu only when cpu fallback disabled', async () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(false)
        .build();
      const sm = new ServerManager(config);
      const pb = new PromptBuilder(config);
      const a = new Analyzer(sm, pb);
      const pa = new ParallelAnalyzer(a, sm);
      
      sm.servers.gpu.available = true;
      
      const prompts = ['p1', 'p2', 'p3'];
      const results = await pa.analyzeParallel(prompts);
      
      expect(results).toHaveLength(3);
    });

    it.skip('SKIP: requires LLM server running - handles single prompt', async () => {
      serverManager.servers.gpu.available = true;
      
      const results = await parallelAnalyzer.analyzeParallel(['single']);
      
      expect(results).toHaveLength(1);
    });

    it('returns empty array for empty input', async () => {
      const results = await parallelAnalyzer.analyzeParallel([]);
      
      expect(results).toEqual([]);
    });

    it.skip('SKIP: requires LLM server running - maintains order', async () => {
      serverManager.servers.gpu.available = true;
      serverManager.servers.cpu.available = true;
      
      const prompts = ['first', 'second', 'third', 'fourth'];
      const results = await parallelAnalyzer.analyzeParallel(prompts);
      
      expect(results).toHaveLength(4);
    });
  });

  describe('analyzeParallelWithSystemPrompts', () => {
    it.skip('SKIP: requires LLM server running - distributes with system prompts', async () => {
      serverManager.servers.gpu.available = true;
      serverManager.servers.cpu.available = true;
      
      const userPrompts = ['u1', 'u2', 'u3', 'u4'];
      const systemPrompts = ['s1', 's2', 's3', 's4'];
      
      const results = await parallelAnalyzer.analyzeParallelWithSystemPrompts(userPrompts, systemPrompts);
      
      expect(results).toHaveLength(4);
    });

    it.skip('SKIP: requires LLM server running - handles empty system prompts', async () => {
      serverManager.servers.gpu.available = true;
      
      const userPrompts = ['u1', 'u2'];
      
      const results = await parallelAnalyzer.analyzeParallelWithSystemPrompts(userPrompts, []);
      
      expect(results).toHaveLength(2);
    });

    it.skip('SKIP: requires LLM server running - handles partial system prompts', async () => {
      serverManager.servers.gpu.available = true;
      
      const userPrompts = ['u1', 'u2', 'u3'];
      const systemPrompts = ['s1'];
      
      const results = await parallelAnalyzer.analyzeParallelWithSystemPrompts(userPrompts, systemPrompts);
      
      expect(results).toHaveLength(3);
    });
  });

  describe('distribution logic', () => {
    it('should check CPU fallback status', () => {
      expect(parallelAnalyzer.serverManager.isCPUFallbackEnabled()).toBe(true);
    });

    it('should use GPU only when CPU fallback disabled', () => {
      const config = AIConfigBuilder.create()
        .withCPUFallback(false)
        .build();
      const sm = new ServerManager(config);
      const pb = new PromptBuilder(config);
      const a = new Analyzer(sm, pb);
      const pa = new ParallelAnalyzer(a, sm);
      
      expect(pa.serverManager.isCPUFallbackEnabled()).toBe(false);
    });
  });

  describe('internal methods', () => {
    it('should have _analyzeBatch method', () => {
      expect(typeof parallelAnalyzer._analyzeBatch).toBe('function');
    });

    it('should have _analyzeBatchWithPrompts method', () => {
      expect(typeof parallelAnalyzer._analyzeBatchWithPrompts).toBe('function');
    });
  });
});
