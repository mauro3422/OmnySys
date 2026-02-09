/**
 * @fileoverview Standardizer Analyzer - Genera versión estandarizada (tokens)
 * 
 * Convierte los nombres reales del código a tokens genéricos para:
 * - Pattern matching cross-project
 * - Machine Learning / entrenamiento
 * - Detección de patrones universales
 * 
 * Ejemplo:
 *   validateUser(user) → VALIDATE_FUNC(ENTITY_PARAM)
 *   processOrder(order, userId) → PROCESS_FUNC(ENTITY_PARAM, ID_PARAM)
 * 
 * @module data-flow/analyzers/standardizer-analyzer
 */

import { createHash } from 'crypto';

// Mapeo de verbos a categorías
const VERB_CATEGORIES = {
  // Read
  get: 'READ', fetch: 'READ', load: 'READ', find: 'READ', query: 'READ', retrieve: 'READ',
  read: 'READ', lookup: 'READ', search: 'READ',
  
  // Write
  create: 'WRITE', add: 'WRITE', save: 'WRITE', store: 'WRITE', insert: 'WRITE',
  write: 'WRITE', push: 'WRITE', append: 'WRITE',
  
  // Update
  update: 'UPDATE', set: 'UPDATE', modify: 'UPDATE', change: 'UPDATE', edit: 'UPDATE',
  patch: 'UPDATE', alter: 'UPDATE',
  
  // Delete
  delete: 'DELETE', remove: 'DELETE', clear: 'DELETE', destroy: 'DELETE', erase: 'DELETE',
  drop: 'DELETE', purge: 'DELETE',
  
  // Validation
  validate: 'VALIDATE', check: 'VALIDATE', verify: 'VALIDATE', ensure: 'VALIDATE',
  confirm: 'VALIDATE', assert: 'VALIDATE', test: 'VALIDATE',
  
  // Transformation
  transform: 'TRANSFORM', convert: 'TRANSFORM', map: 'TRANSFORM', parse: 'TRANSFORM',
  format: 'TRANSFORM', normalize: 'TRANSFORM', sanitize: 'TRANSFORM', process: 'TRANSFORM',
  
  // Calculation
  calculate: 'CALC', compute: 'CALC', sum: 'CALC', count: 'CALC', aggregate: 'CALC',
  total: 'CALC', average: 'CALC', derive: 'CALC',
  
  // Communication
  send: 'SEND', emit: 'SEND', notify: 'SEND', dispatch: 'SEND', publish: 'SEND',
  broadcast: 'SEND', deliver: 'SEND',
  
  // Handling
  handle: 'HANDLE', process: 'HANDLE', manage: 'HANDLE', orchestrate: 'HANDLE',
  coordinate: 'HANDLE', execute: 'HANDLE', run: 'HANDLE',
  
  // Initialization
  init: 'INIT', initialize: 'INIT', setup: 'INIT', configure: 'INIT', prepare: 'INIT',
  bootstrap: 'INIT', start: 'INIT',
  
  // Cleanup
  cleanup: 'CLEANUP', destroy: 'CLEANUP', dispose: 'CLEANUP', teardown: 'CLEANUP',
  close: 'CLEANUP', shutdown: 'CLEANUP'
};

// Tipos de datos comunes para inferir dominios
const DOMAIN_PATTERNS = {
  user: ['user', 'account', 'profile', 'person', 'customer', 'client'],
  order: ['order', 'purchase', 'transaction', 'cart', 'checkout'],
  payment: ['payment', 'charge', 'invoice', 'billing', 'price', 'cost', 'amount'],
  product: ['product', 'item', 'goods', 'merchandise', 'sku'],
  auth: ['auth', 'login', 'session', 'token', 'credential', 'password', 'permission'],
  notification: ['notification', 'email', 'sms', 'message', 'alert', 'push'],
  file: ['file', 'document', 'upload', 'download', 'attachment'],
  config: ['config', 'setting', 'preference', 'option', 'parameter']
};

export class StandardizerAnalyzer {
  constructor(context, functionName) {
    this.context = context;
    this.functionName = functionName;
    this.tokenCounter = 0;
    this.varMap = new Map(); // nombre real → token
    this.funcMap = new Map(); // nombre función → token
  }
  
  /**
   * Construye la versión estandarizada
   */
  build() {
    const semantic = this.extractSemanticInfo();
    
    // Tokenizar componentes
    const tokens = {
      function: this.tokenizeFunctionName(semantic),
      params: this.tokenizeParams(),
      variables: this.tokenizeVariables(),
      operations: this.tokenizeOperations(),
      domains: semantic.domains || []
    };
    
    // Generar patrón de texto
    const pattern = this.buildPattern(tokens);
    
    // Calcular hash del patrón
    const patternHash = this.calculateHash(pattern);
    
    // Features para ML
    const mlFeatures = this.extractMLFeatures(tokens);
    
    return {
      patternHash,
      pattern,
      tokens,
      flowType: this.detectFlowType(),
      mlFeatures,
      
      // Para debugging
      _meta: {
        originalName: this.functionName,
        tokenMap: Object.fromEntries(this.varMap),
        semantic
      }
    };
  }
  
  /**
   * Extrae información semántica del nombre
   */
  extractSemanticInfo() {
    const parts = this.camelCaseSplit(this.functionName);
    const verb = parts[0]?.toLowerCase();
    
    const info = {
      verb,
      operationType: VERB_CATEGORIES[verb] || 'PROCESS',
      domains: [],
      entities: []
    };
    
    // Detectar dominios y entidades
    parts.forEach(part => {
      const lower = part.toLowerCase();
      
      for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
        if (patterns.some(p => lower.includes(p))) {
          if (!info.domains.includes(domain)) {
            info.domains.push(domain);
          }
        }
      }
    });
    
    // La última parte suele ser la entidad principal
    if (parts.length > 1) {
      info.mainEntity = parts[parts.length - 1];
    }
    
    return info;
  }
  
  /**
   * Tokeniza el nombre de la función
   */
  tokenizeFunctionName(semantic) {
    const category = semantic.operationType;
    return `${category}_FUNC`;
  }
  
  /**
   * Tokeniza los parámetros
   */
  tokenizeParams() {
    return this.context.inputs.map((input, index) => {
      // Primer parámetro suele ser la entidad principal
      if (index === 0) {
        return 'ENTITY_PARAM';
      }
      
      // Segundo parámetro suele ser un ID
      if (index === 1 && /id$/i.test(input.name)) {
        return 'ID_PARAM';
      }
      
      // Tercer parámetro suele ser opciones/config
      if (index === 2) {
        return 'OPTIONS_PARAM';
      }
      
      return `PARAM_${index}`;
    });
  }
  
  /**
   * Tokeniza las variables locales
   */
  tokenizeVariables() {
    const tokens = [];
    
    this.context.transforms.forEach((t, index) => {
      const varName = t.to;
      
      if (!this.varMap.has(varName)) {
        this.tokenCounter++;
        
        // Intentar inferir tipo de variable
        let tokenType = 'VAR';
        
        if (t.type === 'function_call') {
          const funcName = t.via?.toLowerCase() || '';
          
          if (/total|sum|amount|price|cost/i.test(funcName)) {
            tokenType = 'TOTAL';
          } else if (/count|length|size/i.test(funcName)) {
            tokenType = 'COUNT';
          } else if (/valid|check|test/i.test(funcName)) {
            tokenType = 'VALID';
          } else if (/get|fetch|load|read/i.test(funcName)) {
            tokenType = 'DATA';
          } else if (/format|parse|transform/i.test(funcName)) {
            tokenType = 'FORMATTED';
          }
        }
        
        this.varMap.set(varName, `${tokenType}_${this.tokenCounter}`);
      }
      
      tokens.push(this.varMap.get(varName));
    });
    
    return tokens;
  }
  
  /**
   * Tokeniza las operaciones
   */
  tokenizeOperations() {
    return this.context.transforms.map(t => {
      switch (t.type) {
        case 'function_call':
          return this.tokenizeFunctionCall(t.via);
        case 'arithmetic':
          return `ARITH_${t.operation}`;
        case 'property_access':
          return 'PROP_ACCESS';
        case 'ternary':
          return 'TERNARY';
        case 'object_merge':
          return 'OBJ_MERGE';
        case 'array_method':
          return `ARRAY_${t.method?.toUpperCase()}`;
        case 'update':
          return `UPDATE_${t.operation}`;
        default:
          return t.type.toUpperCase();
      }
    });
  }
  
  /**
   * Tokeniza una llamada a función
   */
  tokenizeFunctionCall(funcName) {
    if (!funcName) return 'CALL';
    
    const lower = funcName.toLowerCase();
    
    // Verificar si ya la tokenizamos
    if (this.funcMap.has(lower)) {
      return this.funcMap.get(lower);
    }
    
    // Inferir tipo de operación
    let token = 'CALL_FUNC';
    
    for (const [verb, category] of Object.entries(VERB_CATEGORIES)) {
      if (lower.includes(verb)) {
        token = `${category}_FUNC`;
        break;
      }
    }
    
    // Casos especiales
    if (/^(fetch|axios|http|request)/i.test(lower)) {
      token = 'NETWORK_CALL';
    } else if (/^(save|insert|update|delete|remove)/i.test(lower)) {
      token = 'DB_WRITE';
    } else if (/^(find|get|query|select|read)/i.test(lower)) {
      token = 'DB_READ';
    } else if (/^(log|warn|error|debug)/i.test(lower)) {
      token = 'LOG_CALL';
    } else if (/^(emit|dispatch|trigger)/i.test(lower)) {
      token = 'EVENT_EMIT';
    }
    
    this.funcMap.set(lower, token);
    return token;
  }
  
  /**
   * Construye el patrón de texto
   */
  buildPattern(tokens) {
    const parts = [];
    
    // Función y parámetros
    const params = tokens.params.join(', ');
    parts.push(`${tokens.function}(${params})`);
    
    // Transformaciones
    if (tokens.operations.length > 0) {
      const ops = tokens.operations.join(' → ');
      parts.push(`{ ${ops}`);
      
      // Outputs
      const hasReturn = this.context.outputs.some(o => o.type === 'return');
      const hasSideEffect = this.context.outputs.some(o => o.type === 'side_effect');
      
      if (hasSideEffect && hasReturn) {
        parts.push('→ SIDE_EFFECT + RETURN }');
      } else if (hasSideEffect) {
        parts.push('→ SIDE_EFFECT }');
      } else if (hasReturn) {
        parts.push('→ RETURN }');
      } else {
        parts.push('}');
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Calcula hash del patrón para búsquedas rápidas
   */
  calculateHash(pattern) {
    return createHash('sha256')
      .update(pattern)
      .digest('hex')
      .substring(0, 16);
  }
  
  /**
   * Extrae features para ML
   */
  extractMLFeatures(tokens) {
    return {
      paramCount: tokens.params.length,
      varCount: tokens.variables.length,
      operationCount: tokens.operations.length,
      operationTypes: [...new Set(tokens.operations)],
      hasEntityParam: tokens.params.includes('ENTITY_PARAM'),
      hasIdParam: tokens.params.includes('ID_PARAM'),
      domainCount: tokens.domains.length,
      domains: tokens.domains
    };
  }
  
  /**
   * Detecta flow type estandarizado
   */
  detectFlowType() {
    const ops = this.context.transforms.map(t => t.type);
    const hasRead = ops.includes('function_call') && this.context.transforms.some(t => 
      /get|fetch|load|find|read|query/i.test(t.via || '')
    );
    const hasWrite = this.context.outputs.some(o => 
      o.type === 'side_effect' && /write|save|persist|storage/i.test(o.category)
    );
    const hasTransform = ops.some(t => 
      ['arithmetic', 'ternary', 'object_merge'].includes(t)
    );
    
    if (hasRead && hasTransform && hasWrite) return 'READ_TRANSFORM_WRITE';
    if (hasRead && !hasTransform && !hasWrite) return 'READ_ONLY';
    if (!hasRead && !hasTransform && hasWrite) return 'WRITE_ONLY';
    if (hasRead && hasTransform && !hasWrite) return 'READ_TRANSFORM';
    if (hasTransform && hasWrite && !hasRead) return 'TRANSFORM_WRITE';
    
    return 'MIXED';
  }
  
  // Helper
  
  camelCaseSplit(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(Boolean);
  }
}
