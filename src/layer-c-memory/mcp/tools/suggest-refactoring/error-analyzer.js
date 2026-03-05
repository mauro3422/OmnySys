/**
 * Error handling analyzer
 * @module mcp/tools/suggest-refactoring/error-analyzer
 */

/**
 * Sugiere agregar manejo de errores
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeErrorHandling(atoms) {
  const suggestions = [];

  for (const atom of atoms) {
    // Skip test files — tests intentionally omit error handling
    const fp = atom.filePath || atom.file || '';
    if (fp.match(/\.(test|spec)\.[jt]sx?$/) || fp.match(/(^|\/)test(s)?\//) || fp.includes('/__tests__/') || fp.match(/(^|\/)factories\//)) continue;

    // Ignorar getters/setters y funciones extremadamente cortas (falsos positivos)
    if (atom.linesOfCode < 4) continue;
    if (atom.name && (atom.name.startsWith('get') || atom.name.startsWith('set'))) continue;

    // Funciones async sin try/catch
    if (atom.isAsync && !atom.hasErrorHandling) {
      const hasNetwork = atom.hasNetworkCalls;
      const hasFileOps = atom.calls?.some(c => c.name?.includes('readFile') || c.name?.includes('writeFile'));

      if (hasNetwork || hasFileOps) {
        suggestions.push({
          type: 'add_error_handling',
          severity: hasNetwork ? 'high' : 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: `Add try/catch for ${hasNetwork ? 'network' : 'file'} operations`,
          reason: hasNetwork ? 'Network calls can fail' : 'File operations can throw',
          currentState: 'No error handling detected'
        });
      }
    }

    // Funciones que retornan promesas sin await
    if (atom.calls?.some(c => c.type === 'promise' || c.name?.includes('Promise'))) {
      if (!atom.isAsync && !atom.calls.some(c => c.name === 'then' || c.name === 'catch')) {
        suggestions.push({
          type: 'handle_promises',
          severity: 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: 'Either await promises or handle with .catch()',
          reason: 'Unhandled promise rejections can crash the app'
        });
      }
    }
  }

  return suggestions;
}
