import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('race-detector/__tests__/race-detector.test.js', () => {
  const sourcePath = path.resolve(
    'src/layer-a-static/race-detector/__tests__/race-detector.test.js'
  );

  it('exists as a source-level regression suite with strategy coverage intent', () => {
    expect(fs.existsSync(sourcePath)).toBe(true);
    const content = fs.readFileSync(sourcePath, 'utf8');

    expect(content).toContain('RaceDetectionPipeline');
    expect(content).toContain('ReadWriteRaceStrategy');
    expect(content).toContain('WriteWriteRaceStrategy');
  });
});

