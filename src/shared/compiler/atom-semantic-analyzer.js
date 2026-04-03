import { analyzeAtomSemantics, buildAssertionFromSemantics } from '../../layer-c-memory/mcp/tools/generate-tests/atom-semantic-analyzer/core.js';
import { JsAnalyzer } from '../../layer-c-memory/mcp/tools/generate-tests/atom-semantic-analyzer/js-analyzer.js';

const ANALYZER_REGISTRY = new Map([
  ['.js', JsAnalyzer],
  ['.mjs', JsAnalyzer],
  ['.cjs', JsAnalyzer],
  ['.ts', JsAnalyzer],
  ['.tsx', JsAnalyzer]
]);

export function getAtomSemantics(atom) {
  const ext = getExtension(atom?.filePath || '');
  const analyzer = ANALYZER_REGISTRY.get(ext) || null;
  return analyzeAtomSemantics(atom, analyzer);
}

export function getAssertionForAtom(atom, testType = 'happy') {
  const semantics = getAtomSemantics(atom);
  return buildAssertionFromSemantics(semantics, atom, testType);
}

export function getAnalyzerForFile(filePath) {
  const ext = getExtension(filePath);
  return ANALYZER_REGISTRY.get(ext) || null;
}

export { analyzeAtomSemantics, buildAssertionFromSemantics } from '../../layer-c-memory/mcp/tools/generate-tests/atom-semantic-analyzer/core.js';
export { JsAnalyzer } from '../../layer-c-memory/mcp/tools/generate-tests/atom-semantic-analyzer/js-analyzer.js';

function getExtension(filePath) {
  const idx = filePath.lastIndexOf('.');
  return idx >= 0 ? filePath.slice(idx).toLowerCase() : '';
}
