import { describe, it, expect, beforeEach } from 'vitest';
import { LLMClient } from '#ai/llm/client/LLMClient.js';
import { AIConfigBuilder, AnalysisPromptBuilder } from '#test-factories/ai/builders.js';

describe('LLMClient', () => {
  let client;
  let config;

  beforeEach(() => {
    config = AIConfigBuilder.create()
      .withGPUEnabled(true)
      .withCPUFallback(false)
      .build();
    client = new LLMClient(config);
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(client.config).toEqual(config);
    });

    it('should create instance without config', () => {
      const emptyClient = new LLMClient();
      expect(emptyClient.config).toEqual({});
    });

    it('should initialize all sub-modules', () => {
      expect(client.serverManager).toBeDefined();
      expect(client.promptBuilder).toBeDefined();
      expect(client.analyzer).toBeDefined();
      expect(client.parallelAnalyzer).toBeDefined();
      expect(client.batchAnalyzer).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it.skip('SKIP: requires LLM server - should return health status', async () => {
      const health = await client.healthCheck();
      
      expect(health).toHaveProperty('gpu');
      expect(health).toHaveProperty('cpu');
      expect(typeof health.gpu).toBe('boolean');
      expect(typeof health.cpu).toBe('boolean');
    });

    it('should delegate to serverManager', () => {
      expect(typeof client.healthCheck).toBe('function');
    });
  });

  describe('selectServer', () => {
    it('should delegate to serverManager', () => {
      client.serverManager.servers.gpu.available = true;
      
      const server = client.selectServer('gpu');
      
      expect(server).toBe('gpu');
    });

    it('should use default mode gpu', () => {
      client.serverManager.servers.gpu.available = true;
      
      const server = client.selectServer();
      
      expect(server).toBe('gpu');
    });

    it('should return null when no server available', () => {
      const server = client.selectServer('gpu');
      
      expect(server).toBe(null);
    });
  });

  describe('analyze', () => {
    it.skip('SKIP: requires LLM server - should analyze with prompt', async () => {
      client.serverManager.servers.gpu.available = true;
      
      const result = await client.analyze('test prompt');
      
      expect(result).toBeDefined();
    });

    it('should delegate to analyzer', () => {
      expect(typeof client.analyze).toBe('function');
    });

    it.skip('SKIP: requires LLM server - should pass options correctly', async () => {
      client.serverManager.servers.cpu.available = true;
      
      const options = { mode: 'cpu', systemPrompt: 'Custom prompt' };
      
      expect(() => client.analyze('test', options)).toBeDefined();
    });
  });

  describe('analyzeParallel', () => {
    it.skip('SKIP: requires LLM server - should analyze multiple prompts', async () => {
      client.serverManager.servers.gpu.available = true;
      
      const prompts = ['prompt1', 'prompt2', 'prompt3'];
      const results = await client.analyzeParallel(prompts);
      
      expect(results).toHaveLength(3);
    });

    it('should delegate to parallelAnalyzer', () => {
      expect(typeof client.analyzeParallel).toBe('function');
    });
  });

  describe('analyzeParallelWithSystemPrompts', () => {
    it.skip('SKIP: requires LLM server - should analyze with custom system prompts', async () => {
      client.serverManager.servers.gpu.available = true;
      
      const userPrompts = ['prompt1', 'prompt2'];
      const systemPrompts = ['system1', 'system2'];
      
      const results = await client.analyzeParallelWithSystemPrompts(userPrompts, systemPrompts);
      
      expect(results).toHaveLength(2);
    });

    it('should delegate to parallelAnalyzer', () => {
      expect(typeof client.analyzeParallelWithSystemPrompts).toBe('function');
    });
  });

  describe('analyzeBatch', () => {
    it.skip('SKIP: requires LLM server - should analyze batch', async () => {
      client.serverManager.servers.gpu.available = true;
      
      const prompts = ['p1', 'p2', 'p3', 'p4'];
      const results = await client.analyzeBatch(prompts, 'gpu');
      
      expect(results).toHaveLength(4);
    });

    it('should delegate to batchAnalyzer', () => {
      expect(typeof client.analyzeBatch).toBe('function');
    });
  });

  describe('analyzeBatchWithPrompts', () => {
    it.skip('SKIP: requires LLM server - should analyze batch with custom prompts', async () => {
      client.serverManager.servers.gpu.available = true;
      
      const userPrompts = ['p1', 'p2'];
      const systemPrompts = ['s1', 's2'];
      
      const results = await client.analyzeBatchWithPrompts(userPrompts, systemPrompts, 'gpu');
      
      expect(results).toHaveLength(2);
    });

    it('should delegate to batchAnalyzer', () => {
      expect(typeof client.analyzeBatchWithPrompts).toBe('function');
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should build prompt from code and filePath', () => {
      const promptData = AnalysisPromptBuilder.create()
        .withCode('const x = 1;')
        .withFilePath('src/test.js')
        .build();
      
      client.promptBuilder.prompts.analysisTemplate = 'File: {filePath}\nCode: {code}';
      
      const prompt = client.buildAnalysisPrompt(promptData.code, promptData.filePath);
      
      expect(prompt).toContain('src/test.js');
      expect(prompt).toContain('const x = 1;');
    });

    it('should delegate to promptBuilder', () => {
      const code = 'function test() {}';
      const filePath = 'test.js';
      
      client.promptBuilder.prompts.analysisTemplate = '{filePath}: {code}';
      
      const prompt = client.buildAnalysisPrompt(code, filePath);
      
      expect(prompt).toBe('test.js: function test() {}');
    });

    it('should handle empty code', () => {
      const prompt = client.buildAnalysisPrompt('', 'empty.js');
      
      expect(prompt).toBeDefined();
    });
  });

  describe('integration', () => {
    it('should have correct sub-module references', () => {
      expect(client.analyzer.serverManager).toBe(client.serverManager);
      expect(client.analyzer.promptBuilder).toBe(client.promptBuilder);
    });

    it('should share config across modules', () => {
      const customConfig = AIConfigBuilder.create()
        .withTimeout(30000)
        .withSystemPrompt('Custom')
        .build();
      const customClient = new LLMClient(customConfig);
      
      expect(customClient.promptBuilder.getTimeout()).toBe(30000);
      expect(customClient.promptBuilder.getSystemPrompt()).toBe('Custom');
    });

    it('should allow server state manipulation', () => {
      client.serverManager.servers.gpu.available = true;
      client.serverManager.acquireServer('gpu');
      
      expect(client.serverManager.servers.gpu.activeRequests).toBe(1);
      
      client.serverManager.releaseServer('gpu');
      
      expect(client.serverManager.servers.gpu.activeRequests).toBe(0);
    });
  });
});

describe('LLMClient exports', () => {
  it('should export LLMClient from index', async () => {
    const { LLMClient: ImportedClient } = await import('#ai/llm/client/index.js');
    
    expect(ImportedClient).toBeDefined();
  });

  it('should export ServerManager from index', async () => {
    const { ServerManager } = await import('#ai/llm/client/index.js');
    
    expect(ServerManager).toBeDefined();
  });

  it('should export PromptBuilder from index', async () => {
    const { PromptBuilder } = await import('#ai/llm/client/index.js');
    
    expect(PromptBuilder).toBeDefined();
  });

  it('should export analyzers from index', async () => {
    const { Analyzer, ParallelAnalyzer, BatchAnalyzer } = await import('#ai/llm/client/index.js');
    
    expect(Analyzer).toBeDefined();
    expect(ParallelAnalyzer).toBeDefined();
    expect(BatchAnalyzer).toBeDefined();
  });
});
