/**
 * @fileoverview Meta Test Generator - Genera tests con Meta-Factory pattern
 */

import { extractImports, detectTestType } from './import-parser.js';
import { generateAnalysisTest, generateUtilityTest, generateDetectorTest } from './test-generators.js';

export function generateMetaTest(testPath, content) {
  const imports = extractImports(content);
  
  // Encontrar imports de Layer A
  const layerAImports = imports.filter(imp => 
    imp.source.includes('/layer-a-') || imp.source.includes('layer-a-')
  );
  
  if (layerAImports.length === 0) {
    return null;
  }
  
  // Usar el primer import como módulo principal
  const mainImport = layerAImports[0];
  const moduleName = mainImport.source
    .replace(/.*layer-a-[^/]+\//, '')
    .replace(/\.js$/, '');
  
  const exportNames = mainImport.names;
  
  // Extraer tests específicos
  const specificTests = [];
  const testRegex = /it\(['"]([^'"]+)['"],\s*(?:async\s*)?\(\)\s*=>\s*{/g;
  let match;
  while ((match = testRegex.exec(content)) !== null) {
    specificTests.push({
      name: match[1],
      fn: '() => {}' // Placeholder
    });
  }
  
  // Construir líneas de import
  const importLines = imports.map(imp => {
    const names = imp.names.join(', ');
    return `import { ${names} } from '${imp.source}';`;
  });
  
  // Detectar tipo de test
  const testType = detectTestType(content, exportNames);
  
  // Generar test según tipo
  switch (testType) {
    case 'analysis':
      return generateAnalysisTest(moduleName, exportNames, importLines, specificTests);
    case 'utility':
      return generateUtilityTest(moduleName, exportNames, importLines, specificTests);
    case 'detector':
      return generateDetectorTest(moduleName, exportNames, importLines, specificTests);
    default:
      return generateAnalysisTest(moduleName, exportNames, importLines, specificTests);
  }
}
