/**
 * AST Analyzer - Módulo de análisis de código para Omnisciencia
 * 
 * Proporciona análisis de:
 * - Call Graph (quién llama a qué)
 * - Signatures (firmas de funciones)
 * - Value Flow (flujo de datos)
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Parsea un archivo para encontrar llamadas a una función específica
 * Usa análisis regex-based (rápido) + parsing básico
 */
export async function findCallSites(projectPath, targetFile, symbolName) {
  const callSites = [];
  
  try {
    // Leer el archivo objetivo para entender sus exports
    const targetContent = await fs.readFile(
      path.join(projectPath, targetFile), 
      'utf-8'
    );
    
    // Buscar cómo se exporta el símbolo
    const exportPatterns = [
      // export function symbolName
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${symbolName}\\s*\\(`),
      // export const symbolName = 
      new RegExp(`export\\s+(?:const|let|var)\\s+${symbolName}\\s*=`),
      // export { symbolName }
      new RegExp(`export\\s*\\{[^}]*\\b${symbolName}\\b[^}]*\\}`),
      // export default symbolName
      new RegExp(`export\\s+default\\s+(?:async\\s+)?(?:function\\s+)?${symbolName}`),
      // class symbolName
      new RegExp(`export\\s+(?:default\\s+)?class\\s+${symbolName}\\b`),
      // symbolName: function
      new RegExp(`\\b${symbolName}\\s*:\\s*(?:async\\s+)?(?:function)?\\s*\\(`)
    ];
    
    let exportType = null;
    for (const pattern of exportPatterns) {
      if (pattern.test(targetContent)) {
        exportType = pattern.toString();
        break;
      }
    }
    
    if (!exportType) {
      return { error: `Symbol '${symbolName}' not found in ${targetFile}` };
    }
    
    // Buscar en todos los archivos del proyecto
    const metadataPath = path.join(projectPath, '.omnysysdata', 'index.json');
    let allFiles = [];
    
    try {
      const indexContent = await fs.readFile(metadataPath, 'utf-8');
      const index = JSON.parse(indexContent);
      allFiles = Object.keys(index.fileIndex || {});
    } catch {
      // Fallback: buscar archivos JS/TS
      const srcPath = path.join(projectPath, 'src');
      allFiles = await findAllJsFiles(srcPath);
    }
    
    // Analizar cada archivo que podría usar el símbolo
    for (const filePath of allFiles) {
      if (filePath === targetFile) continue; // Skip self
      
      try {
        const content = await fs.readFile(
          path.join(projectPath, filePath), 
          'utf-8'
        );
        
        // PATRÓN 1: Named import del archivo
        const fileBasename = path.basename(targetFile, '.js');
        
        // Buscar various patrones de import
        const importPatterns = [
          // import { symbolName } from './path/to/file'
          new RegExp(`import\\s*\\{\\s*${symbolName}\\s*\\}\\s*from\\s*['"][^'"]*${fileBasename}['"]`, 'i'),
          // import * as namespace from './path/to/file'
          new RegExp(`import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s*['"][^'"]*${fileBasename}['"]`, 'i'),
          // import symbolName from './path/to/file' (default import)
          new RegExp(`import\\s+${symbolName}\\s+from\\s*['"][^'"]*${fileBasename}['"]`, 'i'),
          // import { symbolName as alias } from './path/to/file'
          new RegExp(`import\\s*\\{\\s*\\w+\\s+as\\s+${symbolName}\\s*\\}\\s*from`, 'i')
        ];
        
        let hasImport = false;
        let importNamespace = null;
        
        for (const pattern of importPatterns) {
          const match = content.match(pattern);
          if (match) {
            hasImport = true;
            
            // Si es import * as namespace, capturar el namespace
            const namespaceMatch = content.match(
              new RegExp(`import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s*['"][^'"]*${fileBasename}['"]`, 'i')
            );
            if (namespaceMatch) {
              importNamespace = namespaceMatch[1];
            }
            break;
          }
        }
        
        // PATRÓN 3: Buscar en re-exports y namespace imports
    // El símbolo puede estar disponible a través de: import * as namespace from 'file'
    // donde file re-exporta el símbolo
    
    const namespaceImportRegex = new RegExp(
      `import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s*['"]([^'"]+)['"]`,
      'g'
    );
    
    const namespaceImports = [...content.matchAll(namespaceImportRegex)];
    
    for (const namespaceMatch of namespaceImports) {
      const [fullMatch, namespace, importPath] = namespaceMatch;
      
      // Verificar si este importPath podría eventualmente exportar targetFile
      const possiblePaths = [
        importPath,
        importPath.replace('.js', ''),
        path.basename(importPath).replace('.js', '') + '.js',
        `./${path.basename(importPath)}`,
        `../${path.basename(importPath)}`
      ];
      
      const targetBasename = path.basename(targetFile, '.js');
      
      for (const p of possiblePaths) {
        if (p.includes(targetBasename) || targetBasename.includes(p.replace('./', '').replace('../', ''))) {
          // Este namespace podría contener nuestro símbolo
          // Buscar llamadas como namespace.symbolName(
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (new RegExp(`\\b${namespace}\\.${symbolName}\\s*\\(`).test(line)) {
              const contextStart = Math.max(0, i - 2);
              const contextEnd = Math.min(lines.length, i + 3);
              const context = lines.slice(contextStart, contextEnd).join('\n');
              
              callSites.push({
                file: filePath,
                line: i + 1,
                column: line.indexOf(namespace) + 1,
                code: line.trim(),
                context: context,
                type: 'namespace_method_call',
                importType: `namespace (${namespace} from ${importPath})`,
                note: 'Detected via namespace re-export pattern'
              });
            }
          }
          break;
        }
      }
    }
    
    
    // PATRÓN 4: Default exports que son clases/funciones
    // Buscar import symbolName from './file' donde file exporta por default
    const defaultImportOfFileRegex = new RegExp(
      `import\\s+${symbolName}\\s+from\\s*['"]([^'"]+)${path.basename(targetFile, '.js')}['"]`,
      'i'
    );
    
    // PATRÓN 5: Búsqueda directa más agresiva para casos complejos
    // Buscar cualquier aparición del símbolo seguido de paréntesis
    // Esto captura casos como orchestrator.analyzeAndWait donde orchestrator viene de otro import
    
    // Primero, buscar TODOS los namespace imports en el archivo
    const allNamespaceImports = [];
    const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = namespaceRegex.exec(content)) !== null) {
      allNamespaceImports.push({
        namespace: match[1],
        from: match[2]
      });
    }
    
    // Para cada namespace importado, buscar si llama a symbolName
    for (const nsImport of allNamespaceImports) {
      const methodCallPattern = new RegExp(`\\b${nsImport.namespace}\\.${symbolName}\\s*\\(`);
      
      if (methodCallPattern.test(content)) {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (methodCallPattern.test(line)) {
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length, i + 3);
            const context = lines.slice(contextStart, contextEnd).join('\n');
            
            callSites.push({
              file: filePath,
              line: i + 1,
              column: line.indexOf(nsImport.namespace) + 1,
              code: line.trim(),
              context: context,
              type: 'namespace_method_call',
              importType: `namespace (${nsImport.namespace} from ${nsImport.from})`,
              note: `Called as ${nsImport.namespace}.${symbolName}()`
            });
          }
        }
      }
    }
        
        if (hasImport || importNamespace) {
          // Buscar líneas donde se llama al símbolo
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Verificar diferentes patrones de llamada
            const callPatterns = [
              // symbolName(
              new RegExp(`\\b${symbolName}\\s*\\(`),
              // namespace.symbolName(
              importNamespace ? new RegExp(`\\b${importNamespace}\\.${symbolName}\\s*\\(`) : null,
              // symbolName.call(
              new RegExp(`\\b${symbolName}\\.call\\s*\\(`),
              // symbolName.apply(
              new RegExp(`\\b${symbolName}\\.apply\\s*\\(`),
              // new symbolName(
              new RegExp(`new\\s+${symbolName}\\s*\\(`),
              // object.symbolName(
              new RegExp(`\\.${symbolName}\\s*\\(`)
            ].filter(Boolean);
            
            for (const callPattern of callPatterns) {
              if (callPattern.test(line)) {
                // Extraer contexto
                const contextStart = Math.max(0, i - 2);
                const contextEnd = Math.min(lines.length, i + 3);
                const context = lines.slice(contextStart, contextEnd).join('\n');
                
                // Determinar tipo de llamada
                let callType = 'function_call';
                if (line.includes('new ')) callType = 'instantiation';
                else if (line.includes('.call(')) callType = 'call';
                else if (line.includes('.apply(')) callType = 'apply';
                else if (line.match(/\.\w+\s*\(/)) callType = 'method_call';
                
                callSites.push({
                  file: filePath,
                  line: i + 1,
                  column: line.indexOf(symbolName) + 1,
                  code: line.trim(),
                  context: context,
                  type: callType,
                  importType: importNamespace ? `namespace (${importNamespace})` : 'named'
                });
                break;
              }
            }
          }
        }
        
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return {
      targetSymbol: symbolName,
      targetFile,
      exportType,
      totalCallSites: callSites.length,
      callSites: callSites.slice(0, 20) // Limitar resultados
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analiza la firma de una función y encuentra usos inconsistentes
 */
export async function analyzeFunctionSignature(projectPath, targetFile, symbolName, newSignature) {
  const results = {
    currentSignature: null,
    usages: [],
    breakingChanges: [],
    recommendations: []
  };
  
  try {
    // Leer archivo objetivo
    const content = await fs.readFile(
      path.join(projectPath, targetFile),
      'utf-8'
    );
    
    // Extraer firma actual
    const functionRegex = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${symbolName}\\s*\\(([^)]*)\\)`,
      'i'
    );
    
    const match = content.match(functionRegex);
    if (match) {
      results.currentSignature = `${symbolName}(${match[1]})`;
    }
    
    // Encontrar todos los call sites
    const callGraph = await findCallSites(projectPath, targetFile, symbolName);
    
    if (callGraph.error) {
      return { error: callGraph.error };
    }
    
    results.usages = callGraph.callSites || [];
    
    // Analizar breaking changes
    if (newSignature) {
      const newParams = parseSignature(newSignature);
      const currentParams = match ? parseSignature(match[1]) : [];
      
      // Verificar cambios en parámetros
      for (const callSite of results.usages) {
        const args = extractArguments(callSite.code);
        
        if (newParams.length < args.length) {
          results.breakingChanges.push({
            location: `${callSite.file}:${callSite.line}`,
            issue: 'Too many arguments',
            currentArgs: args.length,
            maxArgs: newParams.length,
            code: callSite.code
          });
        }
        
        // Verificar parámetros obligatorios eliminados
        const removedRequired = currentParams.filter(p => 
          !p.hasDefault && 
          !newParams.find(np => np.name === p.name)
        );
        
        if (removedRequired.length > 0) {
          results.breakingChanges.push({
            location: `${callSite.file}:${callSite.line}`,
            issue: 'Uses removed required parameters',
            removedParams: removedRequired.map(p => p.name),
            code: callSite.code
          });
        }
      }
      
      if (results.breakingChanges.length === 0) {
        results.recommendations.push('✅ Signature change appears safe - no breaking changes detected');
      } else {
        results.recommendations.push(`⚠️ ${results.breakingChanges.length} breaking changes detected`);
        results.recommendations.push('Consider making new parameters optional or provide migration path');
      }
    }
    
    return results;
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analiza el flujo de valores de un símbolo
 */
export async function analyzeValueFlow(projectPath, targetFile, symbolName) {
  const flow = {
    symbol: symbolName,
    file: targetFile,
    type: null, // 'function', 'variable', 'class'
    inputs: [],
    outputs: [],
    dependencies: [],
    consumers: []
  };
  
  try {
    const content = await fs.readFile(
      path.join(projectPath, targetFile),
      'utf-8'
    );
    
    // Detectar tipo de símbolo
    if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${symbolName}`).test(content)) {
      flow.type = 'function';
    } else if (new RegExp(`export\\s+class\\s+${symbolName}`).test(content)) {
      flow.type = 'class';
    } else if (new RegExp(`export\\s+(?:const|let|var)\\s+${symbolName}`).test(content)) {
      flow.type = 'variable';
    }
    
    // Para funciones, extraer parámetros y return
    if (flow.type === 'function') {
      const funcMatch = content.match(
        new RegExp(`(?:export\\s+(?:async\\s+)?)?function\\s+${symbolName}\\s*\\(([^)]*)\\)(?:\\s*:\\s*([^\\{]+))?`, 'i')
      );
      
      if (funcMatch) {
        // Parsear parámetros
        const params = funcMatch[1].split(',').map(p => {
          const [name, type] = p.split(':').map(s => s.trim());
          return { 
            name: name.replace(/\?\s*$/, ''), 
            optional: p.includes('?') || p.includes('='),
            type: type || 'unknown'
          };
        }).filter(p => p.name);
        
        flow.inputs = params;
        
        // Buscar return statements
        const funcBody = extractFunctionBody(content, symbolName);
        if (funcBody) {
          const returnMatches = funcBody.match(/return\s+([^;]+);?/g);
          if (returnMatches) {
            flow.outputs = returnMatches.map(r => ({
              statement: r.trim(),
              type: inferType(r)
            }));
          }
        }
      }
      
      // Buscar dependencias (otras funciones llamadas)
      const body = extractFunctionBody(content, symbolName);
      if (body) {
        const calls = body.match(/\b(\w+)\s*\(/g) || [];
        flow.dependencies = [...new Set(calls.map(c => c.replace('(', '').trim()))]
          .filter(c => !['if', 'while', 'for', 'switch', 'catch'].includes(c))
          .slice(0, 10);
      }
    }
    
    // Encontrar consumidores (quién usa el valor retornado)
    const callGraph = await findCallSites(projectPath, targetFile, symbolName);
    if (!callGraph.error && callGraph.callSites) {
      flow.consumers = callGraph.callSites.map(site => ({
        file: site.file,
        line: site.line,
        context: site.context
      }));
    }
    
    return flow;
    
  } catch (error) {
    return { error: error.message };
  }
}

// ============ UTILIDADES ============

async function findAllJsFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        await findAllJsFiles(fullPath, files);
      } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories that can't be read
  }
  
  return files;
}

function parseSignature(signature) {
  if (!signature || signature.trim() === '') return [];
  
  return signature.split(',').map(param => {
    const [name, type] = param.split(':').map(s => s.trim());
    return {
      name: name.replace(/\?\s*$/, '').replace(/\s*=\s*.+$/, ''),
      optional: param.includes('?') || param.includes('='),
      type: type || 'unknown'
    };
  }).filter(p => p.name);
}

function extractArguments(callLine) {
  const match = callLine.match(/\((.*)\)/);
  if (!match) return [];
  
  // Split by comma, handling nested parentheses
  const args = [];
  let depth = 0;
  let current = '';
  
  for (const char of match[1]) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) args.push(current.trim());
  return args;
}

function extractFunctionBody(content, functionName) {
  const regex = new RegExp(
    `function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
    'i'
  );
  
  const match = content.match(regex);
  if (!match) return null;
  
  const startIndex = match.index + match[0].length;
  let depth = 1;
  let endIndex = startIndex;
  
  while (depth > 0 && endIndex < content.length) {
    if (content[endIndex] === '{') depth++;
    if (content[endIndex] === '}') depth--;
    endIndex++;
  }
  
  return content.slice(startIndex, endIndex - 1);
}

function inferType(returnStatement) {
  const value = returnStatement.replace(/^return\s+/, '').trim();
  
  if (/^\d+$/.test(value)) return 'number';
  if (/^["'`].*["'`]$/.test(value)) return 'string';
  if (/^(true|false)$/.test(value)) return 'boolean';
  if (/^\[/.test(value)) return 'array';
  if (/^\{/.test(value)) return 'object';
  if (/^new\s+/.test(value)) return 'instance';
  if (/^(async\s+)?(\(?[^)]*\)?\s*=>|\{)/.test(value)) return 'function';
  
  return 'unknown';
}
