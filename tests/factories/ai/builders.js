export class AIConfigBuilder {
  constructor() {
    this.config = {
      llm: {
        enabled: true,
        gpu: { port: 8000, parallel: 4 },
        cpu: { port: 8001, parallel: 2 }
      },
      analysis: {
        useStaticFirst: true,
        llmOnlyForComplex: true,
        complexityThreshold: 0.7,
        confidenceThreshold: 0.8,
        enableLLMCache: true
      },
      performance: {
        enableCPUFallback: false,
        maxConcurrentAnalyses: 2,
        timeout: 120000
      },
      prompts: {
        systemPrompt: "You are a semantic code analyzer. Return ONLY valid JSON.",
        analysisTemplate: "Analyze the following file {filePath}:\n\n{code}"
      }
    };
  }

  withGPUEnabled(enabled = true) {
    this.config.llm.enabled = enabled;
    return this;
  }

  withGPUPort(port) {
    this.config.llm.gpu.port = port;
    return this;
  }

  withCPUPort(port) {
    this.config.llm.cpu.port = port;
    return this;
  }

  withCPUFallback(enabled = true) {
    this.config.performance.enableCPUFallback = enabled;
    return this;
  }

  withMaxConcurrent(max) {
    this.config.performance.maxConcurrentAnalyses = max;
    return this;
  }

  withTimeout(ms) {
    this.config.performance.timeout = ms;
    return this;
  }

  withSystemPrompt(prompt) {
    this.config.prompts.systemPrompt = prompt;
    return this;
  }

  withAnalysisTemplate(template) {
    this.config.prompts.analysisTemplate = template;
    return this;
  }

  withComplexityThreshold(threshold) {
    this.config.analysis.complexityThreshold = threshold;
    return this;
  }

  minimal() {
    this.config = {
      llm: { enabled: true }
    };
    return this;
  }

  build() {
    return JSON.parse(JSON.stringify(this.config));
  }

  static create() {
    return new AIConfigBuilder();
  }
}

export class LLMResponseBuilder {
  constructor() {
    this.response = {
      sharedState: [],
      events: [],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'unknown',
      confidence: 0.5,
      reasoning: 'No reasoning provided'
    };
  }

  withSharedState(items) {
    this.response.sharedState = items;
    return this;
  }

  addSharedStateItem(property, type = 'read', line = 1) {
    this.response.sharedState.push({ property, type, line });
    return this;
  }

  withEvents(events) {
    this.response.events = events;
    return this;
  }

  addEvent(name, type = 'emit', line = 1) {
    this.response.events.push({ name, type, line });
    return this;
  }

  withHiddenConnections(connections) {
    this.response.hiddenConnections = connections;
    return this;
  }

  addHiddenConnection(targetFile, reason, confidence = 0.8) {
    this.response.hiddenConnections.push({ targetFile, reason, confidence });
    return this;
  }

  withSuggestedConnections(connections) {
    this.response.suggestedConnections = connections;
    return this;
  }

  withSubsystemStatus(status) {
    this.response.subsystemStatus = status;
    return this;
  }

  withConfidence(confidence) {
    this.response.confidence = confidence;
    return this;
  }

  withReasoning(reasoning) {
    this.response.reasoning = reasoning;
    return this;
  }

  asOrphan() {
    this.response.subsystemStatus = 'orphan';
    this.response.confidence = 0.9;
    this.response.reasoning = 'File has no connections to other files';
    return this;
  }

  asConnected() {
    this.response.subsystemStatus = 'connected';
    this.response.confidence = 0.85;
    this.response.reasoning = 'File has multiple connections';
    return this;
  }

  asIsolated() {
    this.response.subsystemStatus = 'isolated';
    this.response.confidence = 0.7;
    this.response.reasoning = 'File operates independently';
    return this;
  }

  build() {
    return JSON.parse(JSON.stringify(this.response));
  }

  buildJSON() {
    return JSON.stringify(this.build());
  }

  buildWithMarkdown() {
    return '```json\n' + this.buildJSON() + '\n```';
  }

  buildWithPrefix(prefix = 'Here is the analysis:') {
    return prefix + '\n' + this.buildJSON();
  }

  buildWithComments() {
    const obj = this.build();
    return `{
  // Shared state variables
  "sharedState": ${JSON.stringify(obj.sharedState)},
  "events": ${JSON.stringify(obj.events)},
  "hiddenConnections": ${JSON.stringify(obj.hiddenConnections)},
  "suggestedConnections": ${JSON.stringify(obj.suggestedConnections)},
  "subsystemStatus": "${obj.subsystemStatus}",
  "confidence": ${obj.confidence},
  "reasoning": "${obj.reasoning}"
}`;
  }

  static create() {
    return new LLMResponseBuilder();
  }
}

export class NormalizedAnalysisBuilder {
  constructor() {
    this.analysis = {
      analysis: {
        orphan: {
          isOrphan: false,
          dependentCount: 0,
          suggestions: []
        },
        semantic: {
          sharedState: [],
          events: { emits: [], listens: [] },
          connections: []
        },
        patterns: {
          isStateManager: false,
          isSingleton: false,
          isGodObject: false,
          hasSideEffects: false
        }
      },
      sharedState: [],
      events: [],
      confidence: 0.5,
      reasoning: 'No reasoning provided'
    };
  }

  withOrphanStatus(isOrphan, dependentCount = 0) {
    this.analysis.analysis.orphan.isOrphan = isOrphan;
    this.analysis.analysis.orphan.dependentCount = dependentCount;
    return this;
  }

  withSuggestion(suggestion) {
    this.analysis.analysis.orphan.suggestions.push(suggestion);
    return this;
  }

  withSharedState(items) {
    this.analysis.analysis.semantic.sharedState = items;
    this.analysis.sharedState = items;
    return this;
  }

  withEmits(events) {
    this.analysis.analysis.semantic.events.emits = events;
    return this;
  }

  withListens(events) {
    this.analysis.analysis.semantic.events.listens = events;
    return this;
  }

  asStateManager() {
    this.analysis.analysis.patterns.isStateManager = true;
    return this;
  }

  asSingleton() {
    this.analysis.analysis.patterns.isSingleton = true;
    return this;
  }

  asGodObject() {
    this.analysis.analysis.patterns.isGodObject = true;
    return this;
  }

  withSideEffects() {
    this.analysis.analysis.patterns.hasSideEffects = true;
    return this;
  }

  withConfidence(confidence) {
    this.analysis.confidence = confidence;
    return this;
  }

  withReasoning(reasoning) {
    this.analysis.reasoning = reasoning;
    return this;
  }

  build() {
    return JSON.parse(JSON.stringify(this.analysis));
  }

  static create() {
    return new NormalizedAnalysisBuilder();
  }
}

export class ServerStateBuilder {
  constructor() {
    this.state = {
      gpu: {
        available: false,
        activeRequests: 0,
        maxParallel: 4,
        url: 'http://127.0.0.1:8000'
      },
      cpu: {
        available: false,
        activeRequests: 0,
        maxParallel: 2,
        url: 'http://127.0.0.1:8001'
      }
    };
  }

  withGPUAvailable(available = true) {
    this.state.gpu.available = available;
    return this;
  }

  withCPUAvailable(available = true) {
    this.state.cpu.available = available;
    return this;
  }

  withGPURequests(count) {
    this.state.gpu.activeRequests = count;
    return this;
  }

  withCPURequests(count) {
    this.state.cpu.activeRequests = count;
    return this;
  }

  withGPUMaxParallel(max) {
    this.state.gpu.maxParallel = max;
    return this;
  }

  withCPUMaxParallel(max) {
    this.state.cpu.maxParallel = max;
    return this;
  }

  bothAvailable() {
    this.state.gpu.available = true;
    this.state.cpu.available = true;
    return this;
  }

  gpuOnly() {
    this.state.gpu.available = true;
    this.state.cpu.available = false;
    return this;
  }

  cpuOnly() {
    this.state.gpu.available = false;
    this.state.cpu.available = true;
    return this;
  }

  noneAvailable() {
    this.state.gpu.available = false;
    this.state.cpu.available = false;
    return this;
  }

  gpuAtCapacity() {
    this.state.gpu.available = true;
    this.state.gpu.activeRequests = this.state.gpu.maxParallel;
    return this;
  }

  build() {
    return JSON.parse(JSON.stringify(this.state));
  }

  static create() {
    return new ServerStateBuilder();
  }
}

export class AnalysisPromptBuilder {
  constructor() {
    this.prompt = {
      code: 'function test() { return true; }',
      filePath: 'src/test.js'
    };
  }

  withCode(code) {
    this.prompt.code = code;
    return this;
  }

  withFilePath(filePath) {
    this.prompt.filePath = filePath;
    return this;
  }

  withComplexCode() {
    this.prompt.code = `
import { store } from './store';
import { eventBus } from './events';

class ComplexComponent {
  constructor() {
    this.state = store.getState();
    eventBus.on('update', this.handleUpdate.bind(this));
  }

  handleUpdate(data) {
    store.dispatch({ type: 'UPDATE', payload: data });
    eventBus.emit('processed', data);
  }

  render() {
    return \`<div>\${this.state.value}</div>\`;
  }
}

export default ComplexComponent;
`;
    return this;
  }

  build() {
    return { ...this.prompt };
  }

  static create() {
    return new AnalysisPromptBuilder();
  }
}

export default {
  AIConfigBuilder,
  LLMResponseBuilder,
  NormalizedAnalysisBuilder,
  ServerStateBuilder,
  AnalysisPromptBuilder
};
