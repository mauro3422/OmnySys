import fs from 'fs/promises';
import path from 'path';
import { discoverCompilerFiles } from './file-discovery.js';
import { detectCompilerPolicyDriftFromSource } from './policy-conformance-detection.js';

export async function scanCompilerPolicyDrift(rootPath, options = {}) {
  const { limit = 20 } = options;
  const files = await discoverCompilerFiles(rootPath);
  const findings = [];

  for (const filePath of files) {
    const absolutePath = path.join(rootPath, filePath);
    const source = await fs.readFile(absolutePath, 'utf8').catch(() => null);
    if (!source) continue;

    const localFindings = detectCompilerPolicyDriftFromSource(filePath, source);
    for (const finding of localFindings) {
      findings.push({
        ...finding,
        filePath
      });
      if (findings.length >= limit) {
        return findings;
      }
    }
  }

  return findings;
}
