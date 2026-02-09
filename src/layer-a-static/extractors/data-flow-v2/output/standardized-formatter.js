/**
 * @fileoverview Standardized Formatter - Genera versión tokenizada para ML
 * 
 * Convierte el grafo de transformaciones a tokens estandarizados:
 * - validateUser(user) → VALIDATE_FUNC(ENTITY_PARAM)
 * - order.total * taxRate → ENTITY_PARAM.PROP * CONST_RATE
 * 
 * Output para entrenamiento de ML y pattern matching.
 * 
 * @module data-flow-v2/output/standardized-formatter
 */

import { createHash } from 'crypto';

// Mapa de verbos a tokens
const VERB_TOKENS = {
  get: 'READ', fetch: 'READ', load: 'READ', find: 'READ', query: 'READ',
  create: 'WRITE', add: 'WRITE', save: 'WRITE', insert: 'WRITE',
  update: 'UPDATE', set: 'UPDATE', modify: 'UPDATE', change: 'UPDATE',
  delete: 'DELETE', remove: 'DELETE', clear: 'DELETE', destroy: 'DELETE',
  validate: 'VALIDATE', check: 'VALIDATE', verify: 'VALIDATE', ensure: 'VALIDATE',
  process: 'PROCESS', handle: 'PROCESS', manage: 'PROCESS', execute: 'PROCESS',
  calculate: 'CALC', compute: 'CALC', sum: 'CALC', count: 'CALC',
  transform: 'TRANSFORM', convert: 'TRANSFORM', format: 'TRANSFORM', parse: 'TRANSFORM',
  send: 'SEND', emit: 'SEND', notify: 'SEND', dispatch: 'SEND',
  init: 'INIT', initialize: 'INIT', setup: 'INIT', configure: 'INIT',
  cleanup: 'CLEANUP', dispose: 'CLEANUP', teardown: 'CLEANUP'
};

// Patrones de dominio
const DOMAIN_PATTERNS = {
  user: ['user', 'account', 'profile', 'person', 'customer', 'client'],
  order: ['order', 'purchase', 'transaction', 'cart', 'checkout', 'payment'],
  product: ['product', 'item', 'goods', 'sku', 'merchandise'],
  auth: ['auth', 'login', 'session', 'token', 'credential', 'password', 'permission'],
  notification: ['notification', 'email', 'sms', 'message', 'alert', 'push'],
  file: ['file', 'document', 'upload', 'download', 'attachment'],
  config: ['config', 'setting', 'preference', 'option', 'parameter']
};

export class StandardizedFormatter {
  constructor(graph, functionName) {
    this.graph = graph;
    this.functionName = functionName;
    this.tokenCounter = 0;
    this.varTokens = new Map();
    this.funcTokens = new Map();
    this.domains = new Set();
  }

  format() {
    // Extraer información semántica
    const semantic = this.extractSemanticInfo();
    
    // Tokenizar componentes
    const tokens = {
      function: this.tokenizeFunctionName(semantic),
      inputs: this.tokenizeInputs(),
      transforms: this.tokenizeTransforms(),
      outputs: this.tokenizeOutputs(),
      domains: Array.from(this.domains)
    };

    // Generar patrón de texto
    const pattern = this.buildPattern(tokens);
    
    // Calcular hash
    const patternHash = this.calculateHash(pattern);

    // Extraer features para ML
    const mlFeatures = this.extractMLFeatures(tokens);

    // Detectar flow type
    const flowType = this.detectFlowType();

    return {
      patternHash,
      pattern,
      tokens,
      flowType,
      mlFeatures,
      
      // Metadata para debugging
      _meta: {
        originalName: this.functionName,
        tokenMappings: {
          variables: Object.fromEntries(this.varTokens),
          functions: Object.fromEntries(this.funcTokens)
        },
        semantic
      }
    };
  }

  extractSemanticInfo() {
    const parts = this.camelCaseSplit(this.functionName);
    const verb = parts[0]?.toLowerCase();
    
    const info = {
      verb,
      operationType: VERB_TOKENS[verb] || 'PROCESS',
      domains: [],
      entities: [],
      mainEntity: parts[parts.length - 1]
    };

    // Detectar dominios
    parts.forEach(part => {
      const lower = part.toLowerCase();
      for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
        if (patterns.some(p => lower.includes(p))) {
          info.domains.push(domain);
          this.domains.add(domain);
        }
      }
    });

    return info;
  }

  tokenizeFunctionName(semantic) {
    return `${semantic.operationType}_FUNC`;
  }

  tokenizeInputs() {
    const entryNodes = this.graph.nodes.filter(n => 
      n.category === 'input' || 
      (n.inputs?.length === 0 && n.type !== 'constant')
    );

    return entryNodes.map((node, index) => {
      if (index === 0) {
        return {
          original: node.output?.name || `param_${index}`,
          token: 'ENTITY_PARAM',
          type: 'entity'
        };
      }
      
      if (index === 1 && /id$/i.test(node.output?.name || '')) {
        return {
          original: node.output?.name,
          token: 'ID_PARAM',
          type: 'identifier'
        };
      }

      return {
        original: node.output?.name || `param_${index}`,
        token: `PARAM_${index}`,
        type: 'generic'
      };
    });
  }

  tokenizeTransforms() {
    const transformNodes = this.graph.nodes.filter(n => 
      n.category !== 'input' && 
      n.category !== 'constant' &&
      n.category !== 'side_effect'
    );

    return transformNodes.map((node, index) => {
      // Token según el tipo de transformación
      let token = node.standardToken || 'TRANSFORM';
      
      // Si es llamada a función, tokenizar la función
      if (node.properties?.functionName) {
        token = this.tokenizeFunctionCall(node.properties.functionName);
      }

      // Inputs tokenizados
      const inputs = (node.inputs || []).map(input => 
        this.tokenizeOperand(input)
      );

      // Output tokenizado
      const output = node.output?.name 
        ? this.getOrCreateVarToken(node.output.name, node.type)
        : `VAR_${index}`;

      return {
        step: index + 1,
        type: node.type,
        token,
        inputs,
        output,
        properties: {
          isPure: node.properties?.isPure,
          isAsync: node.properties?.isAsync
        }
      };
    });
  }

  tokenizeOutputs() {
    const exitNodes = this.graph.nodes.filter(n => 
      n.category === 'side_effect' ||
      n.type === 'RETURN' ||
      (n.output && !this.hasOutgoingEdges(n.id))
    );

    return exitNodes.map(node => {
      if (node.category === 'side_effect') {
        return {
          type: 'side_effect',
          token: node.standardToken || 'SE_UNKNOWN',
          category: node.properties?.mutatesExternal ? 'mutating' : 'read_only',
          target: node.properties?.functionName
        };
      }

      return {
        type: 'return',
        token: 'RETURN',
        data: node.output ? this.tokenizeOperand(node.output) : 'void'
      };
    });
  }

  tokenizeFunctionCall(funcName) {
    if (!funcName) return 'CALL_FUNC';
    
    if (this.funcTokens.has(funcName)) {
      return this.funcTokens.get(funcName);
    }

    const lower = funcName.toLowerCase();
    
    // Detectar por patrón
    for (const [verb, token] of Object.entries(VERB_TOKENS)) {
      if (lower.includes(verb)) {
        this.funcTokens.set(funcName, `${token}_FUNC`);
        return `${token}_FUNC`;
      }
    }

    // Casos especiales
    if (/fetch|axios|http|request/i.test(lower)) {
      this.funcTokens.set(funcName, 'NETWORK_CALL');
      return 'NETWORK_CALL';
    }

    if (/save|insert|update|delete|create/i.test(lower)) {
      this.funcTokens.set(funcName, 'DB_WRITE');
      return 'DB_WRITE';
    }

    if (/find|get|query|select|read/i.test(lower)) {
      this.funcTokens.set(funcName, 'DB_READ');
      return 'DB_READ';
    }

    this.funcTokens.set(funcName, 'CALL_FUNC');
    return 'CALL_FUNC';
  }

  tokenizeOperand(operand) {
    if (!operand) return 'UNKNOWN';

    if (operand.type === 'variable' || operand.type === 'identifier') {
      return this.getOrCreateVarToken(operand.name);
    }

    if (operand.type === 'literal') {
      return this.tokenizeLiteral(operand.value);
    }

    if (operand.type === 'property_access') {
      return `${this.getOrCreateVarToken(operand.object)}.PROP`;
    }

    if (operand.type === 'call_result') {
      return 'CALL_RESULT';
    }

    return operand.type?.toUpperCase() || 'UNKNOWN';
  }

  tokenizeLiteral(value) {
    if (typeof value === 'number') {
      if (value === 0) return 'CONST_ZERO';
      if (value === 1) return 'CONST_ONE';
      if (value >= 0 && value <= 1) return 'CONST_RATIO'; // Probablemente ratio/percentage
      return 'CONST_NUMBER';
    }

    if (typeof value === 'string') {
      if (value === '') return 'CONST_EMPTY_STR';
      return 'CONST_STRING';
    }

    if (typeof value === 'boolean') {
      return value ? 'CONST_TRUE' : 'CONST_FALSE';
    }

    return 'CONST_LITERAL';
  }

  getOrCreateVarToken(varName, transformType = null) {
    if (this.varTokens.has(varName)) {
      return this.varTokens.get(varName);
    }

    this.tokenCounter++;
    
    // Intentar inferir tipo de variable
    let prefix = 'VAR';
    
    if (transformType) {
      if (['MULTIPLY', 'ADD', 'SUBTRACT'].includes(transformType)) {
        prefix = 'CALC';
      } else if (['VALIDATE', 'CHECK'].includes(transformType)) {
        prefix = 'VALID';
      } else if (transformType.includes('GET') || transformType.includes('READ')) {
        prefix = 'DATA';
      }
    }

    const token = `${prefix}_${this.tokenCounter}`;
    this.varTokens.set(varName, token);
    return token;
  }

  buildPattern(tokens) {
    const parts = [];
    
    // Función
    const params = tokens.inputs.map(p => p.token).join(', ');
    parts.push(`${tokens.function}(${params})`);
    
    // Transformaciones
    if (tokens.transforms.length > 0) {
      const ops = tokens.transforms.map(t => {
        const inputs = t.inputs.join(',');
        return `${t.token}(${inputs})→${t.output}`;
      }).join(' → ');
      
      parts.push(`{ ${ops} }`);
    }
    
    // Outputs
    const outputs = tokens.outputs.map(o => o.token).join('+');
    parts.push(`→ ${outputs}`);
    
    return parts.join(' ');
  }

  calculateHash(pattern) {
    return createHash('sha256')
      .update(pattern)
      .digest('hex')
      .substring(0, 16);
  }

  extractMLFeatures(tokens) {
    return {
      paramCount: tokens.inputs.length,
      transformCount: tokens.transforms.length,
      outputCount: tokens.outputs.length,
      sideEffectCount: tokens.outputs.filter(o => o.type === 'side_effect').length,
      operationTypes: [...new Set(tokens.transforms.map(t => t.type))],
      hasEntityParam: tokens.inputs.some(p => p.token === 'ENTITY_PARAM'),
      hasIdParam: tokens.inputs.some(p => p.token === 'ID_PARAM'),
      domainCount: tokens.domains.length,
      domains: tokens.domains
    };
  }

  detectFlowType() {
    const hasInputs = this.graph.meta.entryPoints.length > 0;
    const hasOutputs = this.graph.meta.exitPoints.length > 0;
    const hasSideEffects = this.graph.meta.hasSideEffects;
    const hasAsync = this.graph.meta.hasAsync;
    
    const transformTypes = this.graph.nodes
      .filter(n => n.category !== 'input' && n.category !== 'side_effect')
      .map(n => n.type);

    const hasRead = transformTypes.some(t => /READ|FETCH|GET|FIND/i.test(t));
    const hasWrite = hasSideEffects;
    const hasTransform = transformTypes.length > 0;

    if (hasRead && hasTransform && hasWrite) return 'READ_TRANSFORM_WRITE';
    if (hasRead && !hasTransform && !hasWrite) return 'READ_ONLY';
    if (!hasRead && !hasTransform && hasWrite) return 'WRITE_ONLY';
    if (hasRead && hasTransform && !hasWrite) return 'READ_TRANSFORM';
    if (hasTransform && hasWrite && !hasRead) return 'TRANSFORM_WRITE';
    
    return 'MIXED';
  }

  hasOutgoingEdges(nodeId) {
    return this.graph.edges.some(e => e.from === nodeId);
  }

  camelCaseSplit(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(Boolean);
  }
}

export default StandardizedFormatter;
