import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '#ai/llm/client/prompts/builder.js';
import { AIConfigBuilder, AnalysisPromptBuilder } from '#test-factories/ai/builders.js';

describe('PromptBuilder', () => {
  describe('constructor', () => {
    it('should create instance with no config', () => {
      const builder = new PromptBuilder();
      expect(builder).toBeDefined();
      expect(builder.config).toEqual({});
    });

    it('should create instance with config', () => {
      const config = AIConfigBuilder.create().build();
      const builder = new PromptBuilder(config);
      
      expect(builder.config).toEqual(config);
    });

    it('should use default prompts when not provided', () => {
      const builder = new PromptBuilder({});
      
      expect(builder.prompts.systemPrompt).toBe("You are a semantic code analyzer. Return ONLY valid JSON.");
    });

    it('should use custom prompts from config', () => {
      const config = AIConfigBuilder.create()
        .withSystemPrompt('Custom system prompt')
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.prompts.systemPrompt).toBe('Custom system prompt');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return default system prompt', () => {
      const builder = new PromptBuilder({});
      
      expect(builder.getSystemPrompt()).toBe("You are a semantic code analyzer. Return ONLY valid JSON.");
    });

    it('should return custom system prompt from config', () => {
      const config = AIConfigBuilder.create()
        .withSystemPrompt('My custom prompt')
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.getSystemPrompt()).toBe('My custom prompt');
    });

    it('should override with custom prompt parameter', () => {
      const config = AIConfigBuilder.create()
        .withSystemPrompt('Config prompt')
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.getSystemPrompt('Override prompt')).toBe('Override prompt');
    });

    it('should use config prompt when custom is null', () => {
      const config = AIConfigBuilder.create()
        .withSystemPrompt('Config prompt')
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.getSystemPrompt(null)).toBe('Config prompt');
    });

    it('should use default when config prompt is empty', () => {
      const builder = new PromptBuilder({ prompts: { systemPrompt: '' } });
      
      expect(builder.getSystemPrompt()).toBe("You are a semantic code analyzer. Return ONLY valid JSON.");
    });
  });

  describe('getTimeout', () => {
    it('should return default timeout', () => {
      const builder = new PromptBuilder({});
      
      expect(builder.getTimeout()).toBe(120000);
    });

    it('should return custom timeout from config', () => {
      const config = AIConfigBuilder.create()
        .withTimeout(60000)
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.getTimeout()).toBe(60000);
    });

    it('should return default when performance config is missing', () => {
      const builder = new PromptBuilder({ prompts: {} });
      
      expect(builder.getTimeout()).toBe(120000);
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should build prompt with filePath placeholder', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('Analyze {filePath}')
        .build();
      const builder = new PromptBuilder(config);
      
      const result = builder.buildAnalysisPrompt('code', 'src/test.js');
      
      expect(result).toBe('Analyze src/test.js');
    });

    it('should build prompt with code placeholder', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('Code: {code}')
        .build();
      const builder = new PromptBuilder(config);
      
      const result = builder.buildAnalysisPrompt('function test() {}', 'file.js');
      
      expect(result).toBe('Code: function test() {}');
    });

    it('should build prompt with both placeholders', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('File: {filePath}\nCode:\n{code}')
        .build();
      const builder = new PromptBuilder(config);
      
      const promptData = AnalysisPromptBuilder.create()
        .withCode('const x = 1;')
        .withFilePath('src/const.js')
        .build();
      
      const result = builder.buildAnalysisPrompt(promptData.code, promptData.filePath);
      
      expect(result).toBe('File: src/const.js\nCode:\nconst x = 1;');
    });

    it('should handle empty code', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('{filePath}: {code}')
        .build();
      const builder = new PromptBuilder(config);
      
      const result = builder.buildAnalysisPrompt('', 'empty.js');
      
      expect(result).toBe('empty.js: ');
    });

    it('should handle code with special characters', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('{code}')
        .build();
      const builder = new PromptBuilder(config);
      
      const specialCode = 'const str = "hello {world}";';
      const result = builder.buildAnalysisPrompt(specialCode, 'file.js');
      
      expect(result).toBe('const str = "hello {world}";');
    });

    it('should handle multiline code', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('Code:\n{code}')
        .build();
      const builder = new PromptBuilder(config);
      
      const multilineCode = 'line1\nline2\nline3';
      const result = builder.buildAnalysisPrompt(multilineCode, 'multi.js');
      
      expect(result).toBe('Code:\nline1\nline2\nline3');
    });

    it('should handle complex paths', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('Path: {filePath}')
        .build();
      const builder = new PromptBuilder(config);
      
      const complexPath = 'src/components/nested/deep/file.js';
      const result = builder.buildAnalysisPrompt('code', complexPath);
      
      expect(result).toBe('Path: src/components/nested/deep/file.js');
    });

    it('should handle template without placeholders', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('Static template')
        .build();
      const builder = new PromptBuilder(config);
      
      const result = builder.buildAnalysisPrompt('code', 'file.js');
      
      expect(result).toBe('Static template');
    });

    it('should handle empty template', () => {
      const config = AIConfigBuilder.create()
        .withAnalysisTemplate('')
        .build();
      const builder = new PromptBuilder(config);
      
      const result = builder.buildAnalysisPrompt('code', 'file.js');
      
      expect(result).toBe('');
    });
  });

  describe('integration', () => {
    it('should work with full config', () => {
      const config = AIConfigBuilder.create()
        .withSystemPrompt('Analyze this code')
        .withAnalysisTemplate('File: {filePath}\n\n{code}')
        .withTimeout(30000)
        .build();
      const builder = new PromptBuilder(config);
      
      expect(builder.getSystemPrompt()).toBe('Analyze this code');
      expect(builder.getTimeout()).toBe(30000);
      
      const prompt = builder.buildAnalysisPrompt('const x = 1;', 'test.js');
      expect(prompt).toContain('test.js');
      expect(prompt).toContain('const x = 1;');
    });

    it('should allow custom prompts per call', () => {
      const builder = new PromptBuilder({});
      
      const prompt1 = builder.getSystemPrompt('First prompt');
      const prompt2 = builder.getSystemPrompt('Second prompt');
      
      expect(prompt1).toBe('First prompt');
      expect(prompt2).toBe('Second prompt');
    });
  });
});
