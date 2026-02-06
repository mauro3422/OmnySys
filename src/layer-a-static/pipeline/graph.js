import { buildGraph } from '../graph-builder.js';

export function buildSystemGraph(normalizedParsedFiles, normalizedResolvedImports, verbose = true) {
  if (verbose) console.log('ðŸ—ï¸  Building dependency graph...');
  const systemMap = buildGraph(normalizedParsedFiles, normalizedResolvedImports);
  if (verbose) {
    console.log(`  âœ“ Graph with ${systemMap.metadata.totalFiles} files`);
    console.log(`  âœ“ ${systemMap.metadata.totalDependencies} dependencies found`);
    if (systemMap.metadata.cyclesDetected.length > 0) {
      console.log(`  âš ï¸  ${systemMap.metadata.cyclesDetected.length} cycles detected!`);
    }
    console.log('');
  }
  return systemMap;
}
