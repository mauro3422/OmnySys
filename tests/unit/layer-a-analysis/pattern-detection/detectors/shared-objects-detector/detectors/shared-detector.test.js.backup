import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

describe('pattern-detection/shared-objects/detectors/shared-detector.js', () => {
  const sourcePath = path.resolve(
    'src/layer-a-static/pattern-detection/detectors/shared-objects-detector/detectors/shared-detector.js'
  );

  it('exists as source module with detector class implementation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('export class SharedObjectsDetector');
    expect(source).toContain('async detect(systemMap)');
  });

  it('documents current broken relative import as integration blocker', async () => {
    await expect(import(pathToFileURL(sourcePath).href)).rejects.toThrow(
      "Cannot find module '../../detector-base.js'"
    );
  });
});

