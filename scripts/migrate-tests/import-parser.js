/**
 * @fileoverview Import Parser - Extrae imports de archivos de test
 */

export function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+{?\s*([^}]+)\}?\s+from\s+['"]([^'"]+)['"];?/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim()).filter(n => n);
    const source = match[2];
    
    imports.push({ names, source });
  }
  
  return imports;
}

export function detectTestType(content, exportNames) {
  // Detectar tipo de test basado en el contenido
  if (content.includes('analyze') || content.includes('detect')) {
    return 'analysis';
  }
  if (content.includes('util') || content.includes('helper')) {
    return 'utility';
  }
  if (exportNames.some(n => n.toLowerCase().includes('detect'))) {
    return 'detector';
  }
  return 'analysis'; // default
}
