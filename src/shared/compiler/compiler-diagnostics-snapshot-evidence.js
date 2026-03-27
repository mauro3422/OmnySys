import fs from 'fs/promises';
import path from 'path';
import { discoverCompilerFiles } from './file-discovery.js';

const CANONICAL_ADOPTION_PATTERNS = {
  centralityCoverage: /\bsummarizeCentralityCoverageRow\b/,
  sharedStateContention: /\bgetSharedStateContentionSummary\b|\bsummarizeSharedStateHotspots\b/,
  scannedFileManifest: /\bsyncPersistedScannedFileManifest\b|\bsummarizePersistedScannedFileCoverage\b|\bgetPersistedScannedFilePaths\b|\bloadPersistedScannedFilePaths\b/,
  runtimeBoundarySurfaces: /\bexecuteWithBoundary\b|\bexecuteWithNetworkBoundary\b|\bclassifyBoundaryError\b/
};

export async function collectCanonicalAdoptionEvidence(projectPath) {
  const compilerFiles = await discoverCompilerFiles(projectPath, { readAverIgnore: false });
  const evidence = Object.fromEntries(
    Object.keys(CANONICAL_ADOPTION_PATTERNS).map((key) => [key, {
      adopted: false,
      consumerCount: 0,
      sampleFiles: []
    }])
  );

  await Promise.all(compilerFiles.map(async (filePath) => {
    let source = '';
    try {
      source = await fs.readFile(path.join(projectPath, filePath), 'utf8');
    } catch {
      return;
    }

    for (const [key, pattern] of Object.entries(CANONICAL_ADOPTION_PATTERNS)) {
      if (!pattern.test(source)) {
        continue;
      }

      const entry = evidence[key];
      entry.adopted = true;
      entry.consumerCount += 1;
      if (entry.sampleFiles.length < 5) {
        entry.sampleFiles.push(filePath);
      }
    }
  }));

  return evidence;
}
