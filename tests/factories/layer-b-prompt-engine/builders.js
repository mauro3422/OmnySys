/**
 * @fileoverview Layer B Prompt Engine Factory
 * 
 * Builders para testing del motor de prompts
 * 
 * @module tests/factories/layer-b-prompt-engine
 */

/**
 * Builder para templates de prompts
 */
export class PromptTemplateBuilder {
  constructor() {
    this.template = {
      name: 'default',
      systemPrompt: `<|im_start|>system
You are a code analyzer. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string"
}

Instructions:
- confidence: certainty of analysis (0.0-1.0)
- reasoning: 1 sentence explaining what was found<|im_end|>`,
      userPrompt: `<|im_start|>user
FILE: {filePath}

CODE:
{fileContent}

Extract analysis as JSON.<|im_end|>
<|im_start|>assistant`
    };
  }

  withName(name) {
    this.template.name = name;
    return this;
  }

  withSystemPrompt(prompt) {
    this.template.systemPrompt = prompt;
    return this;
  }

  withUserPrompt(prompt) {
    this.template.userPrompt = prompt;
    return this;
  }

  withPlaceholders(placeholders) {
    this.template.placeholders = placeholders;
    return this;
  }

  withResponseSchema(schema) {
    this.template.responseSchema = schema;
    return this;
  }

  asGodObjectTemplate() {
    this.template.name = 'god-object';
    this.template.systemPrompt = 'God object detection system prompt';
    this.template.userPrompt = 'Analyze god object in: {filePath}';
    return this;
  }

  asEventHubTemplate() {
    this.template.name = 'event-hub';
    this.template.systemPrompt = 'Event hub detection system prompt';
    this.template.userPrompt = 'Analyze event hub in: {filePath}';
    return this;
  }

  asInvalidTemplate() {
    this.template.systemPrompt = null;
    this.template.userPrompt = null;
    return this;
  }

  build() {
    return { ...this.template };
  }

  static create() {
    return new PromptTemplateBuilder();
  }
}

/**
 * Builder para metadatos de archivos
 */
export class FileMetadataBuilder {
  constructor() {
    this.metadata = {
      filePath: 'src/components/TestComponent.js',
      exportCount: 2,
      exports: ['TestComponent', 'testHelper'],
      dependentCount: 5,
      importCount: 3,
      functionCount: 4
    };
  }

  withFilePath(path) {
    this.metadata.filePath = path;
    return this;
  }

  withExports(exports) {
    this.metadata.exports = Array.isArray(exports) ? exports : [exports];
    this.metadata.exportCount = this.metadata.exports.length;
    return this;
  }

  withDependents(count) {
    this.metadata.dependentCount = count;
    return this;
  }

  withImports(count) {
    this.metadata.importCount = count;
    return this;
  }

  withFunctions(count) {
    this.metadata.functionCount = count;
    return this;
  }

  asGodObject() {
    this.metadata.exportCount = 15;
    this.metadata.exports = ['doEverything', 'handleAll', 'manageAll'];
    this.metadata.dependentCount = 20;
    this.metadata.importCount = 10;
    return this;
  }

  asEventHub() {
    this.metadata.eventListenerCount = 10;
    this.metadata.eventNames = ['user:login', 'data:update', 'app:init'];
    return this;
  }

  asSimpleModule() {
    this.metadata.exportCount = 1;
    this.metadata.exports = ['helper'];
    this.metadata.dependentCount = 2;
    this.metadata.importCount = 0;
    this.metadata.functionCount = 1;
    return this;
  }

  build() {
    return { ...this.metadata };
  }

  static create() {
    return new FileMetadataBuilder();
  }
}

/**
 * Builder para configuración de prompts
 */
export class PromptConfigBuilder {
  constructor() {
    this.config = {
      systemPrompt: 'System prompt content',
      userPrompt: 'User prompt content',
      jsonSchema: { type: 'object', properties: {} },
      analysisType: 'default',
      temperature: 0.0,
      maxTokens: 2000
    };
  }

  withSystemPrompt(prompt) {
    this.config.systemPrompt = prompt;
    return this;
  }

  withUserPrompt(prompt) {
    this.config.userPrompt = prompt;
    return this;
  }

  withSchema(schema) {
    this.config.jsonSchema = schema;
    return this;
  }

  withAnalysisType(type) {
    this.config.analysisType = type;
    return this;
  }

  withTemperature(temp) {
    this.config.temperature = temp;
    return this;
  }

  withMaxTokens(tokens) {
    this.config.maxTokens = tokens;
    return this;
  }

  asDefault() {
    this.config.analysisType = 'default';
    return this;
  }

  asGodObject() {
    this.config.analysisType = 'god-object';
    return this;
  }

  asEventHub() {
    this.config.analysisType = 'event-hub';
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new PromptConfigBuilder();
  }
}

/**
 * Builder para arquetipos
 */
export class ArchetypeBuilder {
  constructor() {
    this.archetype = {
      type: 'default',
      severity: 50,
      mergeKey: 'default',
      fields: ['confidence', 'reasoning'],
      detect: () => false
    };
  }

  withType(type) {
    this.archetype.type = type;
    return this;
  }

  withSeverity(severity) {
    this.archetype.severity = severity;
    return this;
  }

  withMergeKey(key) {
    this.archetype.mergeKey = key;
    return this;
  }

  withFields(fields) {
    this.archetype.fields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  withDetectFunction(fn) {
    this.archetype.detect = fn;
    return this;
  }

  asGodObject() {
    this.archetype.type = 'god-object';
    this.archetype.severity = 100;
    this.archetype.mergeKey = 'god-object';
    this.archetype.fields = ['confidence', 'reasoning', 'functions', 'exports'];
    return this;
  }

  asEventHub() {
    this.archetype.type = 'event-hub';
    this.archetype.severity = 80;
    this.archetype.mergeKey = 'event-hub';
    this.archetype.fields = ['confidence', 'reasoning', 'eventNames'];
    return this;
  }

  asLowPriority() {
    this.archetype.severity = 10;
    return this;
  }

  asHighPriority() {
    this.archetype.severity = 90;
    return this;
  }

  build() {
    return { ...this.archetype };
  }

  static create() {
    return new ArchetypeBuilder();
  }
}

/**
 * Builder para contenido de archivos
 */
export class FileContentBuilder {
  constructor() {
    this.content = '';
    this.lines = 0;
  }

  withLine(line) {
    this.content += line + '\n';
    this.lines++;
    return this;
  }

  withFunction(name, params = []) {
    this.content += `export function ${name}(${params.join(', ')}) {\n`;
    this.content += `  // Implementation\n`;
    this.content += `}\n\n`;
    this.lines += 4;
    return this;
  }

  withImport(source, specifiers = []) {
    this.content += `import { ${specifiers.join(', ')} } from '${source}';\n`;
    this.lines += 1;
    return this;
  }

  withExport(name, isDefault = false) {
    if (isDefault) {
      this.content += `export default ${name};\n`;
    } else {
      this.content += `export { ${name} };\n`;
    }
    this.lines += 1;
    return this;
  }

  withClass(name) {
    this.content += `export class ${name} {\n`;
    this.content += `  constructor() {}\n`;
    this.content += `}\n\n`;
    this.lines += 4;
    return this;
  }

  asSimpleModule() {
    return this
      .withImport('./utils', ['helper'])
      .withFunction('main', ['arg1', 'arg2'])
      .withExport('main');
  }

  asGodObject() {
    const methods = ['init', 'load', 'save', 'process', 'validate', 'render', 'handle', 'update', 'delete', 'create'];
    methods.forEach(method => this.withFunction(method, ['data']));
    return this;
  }

  withLength(length) {
    this.content = 'x'.repeat(length);
    this.lines = Math.ceil(length / 50);
    return this;
  }

  build() {
    return {
      content: this.content,
      lines: this.lines,
      length: this.content.length
    };
  }

  static create() {
    return new FileContentBuilder();
  }
}

/**
 * Exportación default
 */
export default {
  PromptTemplateBuilder,
  FileMetadataBuilder,
  PromptConfigBuilder,
  ArchetypeBuilder,
  FileContentBuilder
};
