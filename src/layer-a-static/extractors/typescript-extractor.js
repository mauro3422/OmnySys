/**
 * typescript-extractor.js
 * Extrae información de TypeScript (types, interfaces, generics)
 * 
 * Detecta:
 * - Interfaces y sus implementaciones
 * - Type aliases y sus usos
 * - Herencia de interfaces
 * - Generic constraints
 * - Cambios que rompen contratos
 */

/**
 * Extrae definiciones de TypeScript del código
 * @param {string} code - Código fuente
 * @returns {Object} - { interfaces: [], types: [], classes: [], generics: [] }
 */
export function extractTypeScriptDefinitions(code) {
  const result = {
    interfaces: [],    // interface User { ... }
    types: [],        // type User = { ... }
    classes: [],      // class User implements Person { ... }
    enums: [],        // enum Status { ... }
    generics: [],     // function<T extends {}>(x: T)
    imports: [],      // import type { ... }
    exports: [],      // export type, export interface
    all: []
  };
  
  // Interfaces: interface Name extends Other { ... }
  const interfacePattern = /interface\s+(\w+)\s*(?:extends\s+([^{]+))?\s*\{/g;
  
  // Type aliases: type Name = ...
  const typePattern = /type\s+(\w+)\s*(?:<[^>]+>)?\s*=\s*([^;]+);/g;
  
  // Classes con implements: class X implements Y, Z
  const classPattern = /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([^{]+))?\s*\{/g;
  
  // Enums
  const enumPattern = /(?:export\s+)?enum\s+(\w+)\s*\{([^}]+)\}/g;
  
  // Generic functions: function name<T>(x: T): T
  const genericFuncPattern = /function\s+(\w+)\s*<([^>]+)>\s*\(/g;
  const genericArrowPattern = /const\s+(\w+)\s*=\s*<([^>]+)>\s*\(/g;
  
  // Type imports: import type { X } from '...'
  const typeImportPattern = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  
  // Type exports: export type, export interface
  const typeExportPattern = /export\s+(type|interface)\s+(\w+)/g;
  
  // Usage de tipos: const x: Type, function(x: Type): ReturnType
  const typeUsagePattern = /:\s*(\w+(?:<[^>]+>)?(?:\[\])?)/g;
  
  let match;
  
  // Interfaces
  while ((match = interfacePattern.exec(code)) !== null) {
    const extendsList = match[2] ? match[2].split(',').map(e => e.trim()) : [];
    
    result.interfaces.push({
      type: 'interface',
      name: match[1],
      extends: extendsList,
      line: getLineNumber(code, match.index),
      hasGenerics: match[0].includes('<')
    });
  }
  
  // Type aliases
  while ((match = typePattern.exec(code)) !== null) {
    result.types.push({
      type: 'type_alias',
      name: match[1],
      definition: match[2].slice(0, 100),
      line: getLineNumber(code, match.index),
      hasGenerics: match[0].includes('<')
    });
  }
  
  // Classes
  while ((match = classPattern.exec(code)) !== null) {
    const implementsList = match[3] ? match[3].split(',').map(i => i.trim()) : [];
    
    result.classes.push({
      type: 'class',
      name: match[1],
      extends: match[2] || null,
      implements: implementsList,
      line: getLineNumber(code, match.index)
    });
  }
  
  // Enums
  while ((match = enumPattern.exec(code)) !== null) {
    const values = match[2].split(',').map(v => v.trim()).filter(v => v);
    
    result.enums.push({
      type: 'enum',
      name: match[1],
      values: values.slice(0, 20), // Limitar
      valueCount: values.length,
      line: getLineNumber(code, match.index)
    });
  }
  
  // Generic functions
  while ((match = genericFuncPattern.exec(code)) !== null) {
    result.generics.push({
      type: 'generic_function',
      name: match[1],
      constraints: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Generic arrows
  while ((match = genericArrowPattern.exec(code)) !== null) {
    result.generics.push({
      type: 'generic_arrow',
      name: match[1],
      constraints: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  // Type imports
  while ((match = typeImportPattern.exec(code)) !== null) {
    const types = match[1].split(',').map(t => t.trim());
    
    for (const typeName of types) {
      result.imports.push({
        type: 'type_import',
        name: typeName,
        source: match[2],
        line: getLineNumber(code, match.index)
      });
    }
  }
  
  // Type exports
  while ((match = typeExportPattern.exec(code)) !== null) {
    result.exports.push({
      type: match[1] === 'interface' ? 'interface_export' : 'type_export',
      name: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  result.all = [
    ...result.interfaces,
    ...result.types,
    ...result.classes,
    ...result.enums,
    ...result.generics
  ];
  
  return result;
}

/**
 * Detecta implementaciones de interfaces
 * @param {Object} fileResults - Mapa de filePath -> TS analysis
 * @returns {Array} - Conexiones interface -> implementador
 */
export function detectInterfaceImplementations(fileResults) {
  const connections = [];
  
  // Indexar interfaces por nombre
  const interfaceIndex = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis.interfaces || []) {
      if (!interfaceIndex.has(iface.name)) {
        interfaceIndex.set(iface.name, []);
      }
      interfaceIndex.get(iface.name).push({ file: filePath, definition: iface });
    }
  }
  
  // Buscar clases que implementan interfaces
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const cls of analysis.classes || []) {
      for (const implemented of cls.implements || []) {
        if (interfaceIndex.has(implemented)) {
          for (const ifaceDef of interfaceIndex.get(implemented)) {
            connections.push({
              id: `implements_${implemented}_${filePath}`,
              sourceFile: ifaceDef.file,
              targetFile: filePath,
              type: 'interfaceImplementation',
              via: 'typescript',
              interfaceName: implemented,
              className: cls.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Class '${cls.name}' implements interface '${implemented}'`
            });
          }
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta extensiones de interfaces
 * @param {Object} fileResults - Mapa de filePath -> TS analysis
 * @returns {Array} - Conexiones base -> extendida
 */
export function detectInterfaceExtensions(fileResults) {
  const connections = [];
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const iface of analysis.interfaces || []) {
      for (const extended of iface.extends || []) {
        // Buscar dónde se define la interface base
        for (const [otherFile, otherAnalysis] of Object.entries(fileResults)) {
          const baseInterface = otherAnalysis.interfaces?.find(i => i.name === extended);
          if (baseInterface) {
            connections.push({
              id: `extends_${extended}_${otherFile}_to_${filePath}`,
              sourceFile: otherFile,
              targetFile: filePath,
              type: 'interfaceExtension',
              via: 'typescript',
              baseInterface: extended,
              extendedInterface: iface.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Interface '${iface.name}' extends '${extended}'`
            });
          }
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta usos de types (type aliases)
 * @param {Object} fileResults - Mapa de filePath -> TS analysis
 * @returns {Array} - Conexiones type definition -> usage
 */
export function detectTypeUsages(fileResults) {
  const connections = [];
  
  // Indexar type definitions
  const typeIndex = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const type of analysis.types || []) {
      if (!typeIndex.has(type.name)) {
        typeIndex.set(type.name, []);
      }
      typeIndex.get(type.name).push({ file: filePath, definition: type });
    }
  }
  
  // Buscar imports de types
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const imp of analysis.imports || []) {
      if (typeIndex.has(imp.name)) {
        for (const typeDef of typeIndex.get(imp.name)) {
          if (typeDef.file !== filePath) {
            connections.push({
              id: `type_import_${imp.name}_${typeDef.file}_to_${filePath}`,
              sourceFile: typeDef.file,
              targetFile: filePath,
              type: 'typeImport',
              via: 'typescript',
              typeName: imp.name,
              confidence: 1.0,
              detectedBy: 'typescript-extractor',
              reason: `Type '${imp.name}' imported from '${typeDef.file}'`
            });
          }
        }
      }
    }
  }
  
  return connections;
}

/**
 * Detecta cambios potencialmente breaking en types
 * @param {Object} fileResults - Mapa de filePath -> TS analysis
 * @returns {Array} - Alertas de breaking changes potenciales
 */
export function detectPotentialBreakingChanges(fileResults) {
  const alerts = [];
  
  // Buscar interfaces/types exportados (son API pública)
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    for (const exp of analysis.exports || []) {
      // Si es un type/interface exportado, marcar como API pública
      alerts.push({
        type: 'PUBLIC_API',
        file: filePath,
        name: exp.name,
        kind: exp.type === 'interface_export' ? 'interface' : 'type',
        severity: 'INFO',
        reason: `Exported ${exp.type === 'interface_export' ? 'interface' : 'type'} '${exp.name}' is public API`,
        suggestion: 'Changes to this may break consumers'
      });
    }
  }
  
  return alerts;
}

/**
 * Extrae análisis TypeScript de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Análisis completo
 */
export function extractTypeScriptFromFile(filePath, code) {
  return {
    filePath,
    ...extractTypeScriptDefinitions(code),
    breakingChangeAlerts: detectPotentialBreakingChanges({ [filePath]: extractTypeScriptDefinitions(code) }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Detecta todas las conexiones TypeScript
 * @param {Object} fileSourceCode - Mapa de filePath -> código
 * @returns {Object} - Conexiones detectadas
 */
export function detectAllTypeScriptConnections(fileSourceCode) {
  const fileResults = {};
  
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractTypeScriptFromFile(filePath, code);
  }
  
  const implementations = detectInterfaceImplementations(fileResults);
  const extensions = detectInterfaceExtensions(fileResults);
  const typeUsages = detectTypeUsages(fileResults);
  
  return {
    connections: [...implementations, ...extensions, ...typeUsages],
    fileResults,
    byType: {
      implementation: implementations,
      extension: extensions,
      typeUsage: typeUsages
    }
  };
}

// Utilidad
function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
