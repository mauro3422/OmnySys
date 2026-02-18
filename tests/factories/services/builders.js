/**
 * @fileoverview Services Factory - Builders for LLM Service testing
 * @module tests/factories/services/builders
 */

export class RequestOptionsBuilder {
  constructor() {
    this.options = {
      mode: 'auto',
      maxTokens: 2000,
      temperature: 0.7,
      topP: undefined,
      systemPrompt: undefined,
      provider: undefined,
      useCache: true
    };
  }

  withMode(mode) {
    this.options.mode = mode;
    return this;
  }

  withMaxTokens(tokens) {
    this.options.maxTokens = tokens;
    return this;
  }

  withTemperature(temp) {
    this.options.temperature = temp;
    return this;
  }

  withTopP(topP) {
    this.options.topP = topP;
    return this;
  }

  withSystemPrompt(prompt) {
    this.options.systemPrompt = prompt;
    return this;
  }

  withProvider(provider) {
    this.options.provider = provider;
    return this;
  }

  withCache(useCache) {
    this.options.useCache = useCache;
    return this;
  }

  forGPU() {
    this.options.mode = 'gpu';
    return this;
  }

  forCPU() {
    this.options.mode = 'cpu';
    return this;
  }

  withoutCache() {
    this.options.useCache = false;
    return this;
  }

  build() {
    return { ...this.options };
  }

  static create() {
    return new RequestOptionsBuilder();
  }
}

export class PromptBuilder {
  constructor() {
    this.prompt = 'Analyze this code for potential issues.';
  }

  withText(text) {
    this.prompt = text;
    return this;
  }

  short() {
    this.prompt = 'Hello';
    return this;
  }

  long(length = 50000) {
    this.prompt = 'Analyze: '.padEnd(length, 'x');
    return this;
  }

  empty() {
    this.prompt = '';
    return this;
  }

  codeAnalysis(code) {
    this.prompt = `Analyze the following code:\n\n${code}`;
    return this;
  }

  withNullBytes() {
    this.prompt = 'Hello\x00World';
    return this;
  }

  withMixedLineEndings() {
    this.prompt = 'Line1\nLine2\r\nLine3\rLine4';
    return this;
  }

  build() {
    return this.prompt;
  }

  static create() {
    return new PromptBuilder();
  }
}

export class RawResponseBuilder {
  constructor() {
    this.response = {
      content: 'This is the LLM response content.',
      provider: 'local',
      model: 'default',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop'
    };
  }

  withContent(content) {
    this.response.content = content;
    return this;
  }

  withProvider(provider) {
    this.response.provider = provider;
    return this;
  }

  withModel(model) {
    this.response.model = model;
    return this;
  }

  withUsage(promptTokens, completionTokens) {
    this.response.usage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
    return this;
  }

  withFinishReason(reason) {
    this.response.finishReason = reason;
    return this;
  }

  asOpenAIFormat() {
    this.response = {
      choices: [{
        message: { content: this.response.content || 'OpenAI response' },
        finish_reason: 'stop'
      }],
      model: this.response.model || 'gpt-4',
      usage: this.response.usage || { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    };
    return this;
  }

  asAnthropicFormat() {
    this.response = {
      content: [{ text: this.response.content || 'Anthropic response' }],
      model: this.response.model || 'claude-3',
      usage: this.response.usage || { input_tokens: 10, output_tokens: 20 }
    };
    return this;
  }

  asString() {
    this.response = this.response.content || 'Plain string response';
    return this;
  }

  withJSONContent(data = { result: 'success', value: 42 }) {
    this.response.content = JSON.stringify(data);
    return this;
  }

  withMarkdownJSON(data = { result: 'success' }) {
    this.response.content = '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    return this;
  }

  empty() {
    this.response = null;
    return this;
  }

  build() {
    return typeof this.response === 'string' ? this.response : { ...this.response };
  }

  static create() {
    return new RawResponseBuilder();
  }
}

export class ProviderConfigBuilder {
  constructor() {
    this.config = {
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeoutMs: 30000,
      maxRetries: 3,
      timeout: 60000
    };
  }

  withThreshold(threshold) {
    this.config.circuitBreakerThreshold = threshold;
    return this;
  }

  withResetTimeout(ms) {
    this.config.circuitBreakerResetTimeoutMs = ms;
    return this;
  }

  withMaxRetries(retries) {
    this.config.maxRetries = retries;
    return this;
  }

  withTimeout(ms) {
    this.config.timeout = ms;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new ProviderConfigBuilder();
  }
}

export class CacheConfigBuilder {
  constructor() {
    this.config = {
      enabled: true,
      defaultTTL: 5 * 60 * 1000,
      maxSize: 1000,
      checkInterval: 60 * 1000
    };
  }

  disabled() {
    this.config.enabled = false;
    return this;
  }

  withTTL(ms) {
    this.config.defaultTTL = ms;
    return this;
  }

  withMaxSize(size) {
    this.config.maxSize = size;
    return this;
  }

  withCheckInterval(ms) {
    this.config.checkInterval = ms;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new CacheConfigBuilder();
  }
}

export class HealthStatusBuilder {
  constructor() {
    this.status = {
      available: true,
      gpu: true,
      cpu: true,
      provider: 'local'
    };
  }

  available() {
    this.status.available = true;
    this.status.gpu = true;
    return this;
  }

  unavailable() {
    this.status.available = false;
    this.status.gpu = false;
    this.status.cpu = false;
    return this;
  }

  cpuOnly() {
    this.status.available = true;
    this.status.gpu = false;
    this.status.cpu = true;
    return this;
  }

  withError(error) {
    this.status.available = false;
    this.status.error = error;
    return this;
  }

  build() {
    return { ...this.status };
  }

  static create() {
    return new HealthStatusBuilder();
  }
}

export class CircuitBreakerStateBuilder {
  constructor() {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      threshold: 5,
      resetTimeoutMs: 30000
    };
  }

  closed() {
    this.state.state = 'CLOSED';
    return this;
  }

  open() {
    this.state.state = 'OPEN';
    this.state.lastFailureTime = Date.now();
    return this;
  }

  halfOpen() {
    this.state.state = 'HALF_OPEN';
    return this;
  }

  withFailures(count) {
    this.state.failureCount = count;
    return this;
  }

  withSuccesses(count) {
    this.state.successCount = count;
    return this;
  }

  withThreshold(threshold) {
    this.state.threshold = threshold;
    return this;
  }

  build() {
    return { ...this.state };
  }

  static create() {
    return new CircuitBreakerStateBuilder();
  }
}

export default {
  RequestOptionsBuilder,
  PromptBuilder,
  RawResponseBuilder,
  ProviderConfigBuilder,
  CacheConfigBuilder,
  HealthStatusBuilder,
  CircuitBreakerStateBuilder
};
