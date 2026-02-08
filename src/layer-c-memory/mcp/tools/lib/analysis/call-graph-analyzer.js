/**
 * @fileoverview call-graph-analyzer.js
 * 
 * Call Graph Analyzer - Find all call sites of a symbol
 * Part of the analysis library extracted from ast-analyzer.js
 * 
 * @module analysis/call-graph-analyzer
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
