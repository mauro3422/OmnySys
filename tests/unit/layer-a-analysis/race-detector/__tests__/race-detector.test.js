import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('race-detector/__tests__/race-detector.test.js source contract', () => {
  it('keeps historical node:test suite file present for compatibility', () => {
    const sourcePath = path.resolve('src/layer-a-static/race-detector/__tests__/race-detector.test.js');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const content = fs.readFileSync(sourcePath, 'utf8');
    expect(content).toContain("from 'node:test'");
    expect(content).toContain('RaceDetectionPipeline');
  });
});
