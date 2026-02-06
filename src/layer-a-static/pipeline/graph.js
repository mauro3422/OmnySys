import { buildGraph } from '../graph/index.js';

export function buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose = true) {
  if (verbose) console.log('Building dependency graph...');
  const systemMap = buildGraph(normalizedParsedFiles, normalizedResolvedImports);
  if (verbose) {
    console.log(`  ✓ Graph with ${systemMap.metadata.totalFiles} files`);
    console.log(`  ✓ ${systemMap.metadata.totalDependencies} dependencies found`);
    if (systemMap.metadata.cyclesDetected.length > 0) {
      console.log(`  ⚠️  ${systemMap.metadata.cyclesDetected.length} cycles detected!`);
    }
    console.log('');
  }
  return systemMap;
}
