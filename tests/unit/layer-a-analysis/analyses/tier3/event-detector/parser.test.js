import { describe, it, expect } from 'vitest';
import {
  getBabelPlugins,
  parseCodeToAST,
  isParseableFile
} from '#layer-a/analyses/tier3/event-detector/parser.js';

describe('analyses/tier3/event-detector/parser.js', () => {
  it('builds babel plugins including typescript plugin for ts files', () => {
    const plugins = getBabelPlugins('file.ts');
    expect(plugins.some(p => Array.isArray(p) && p[0] === 'typescript')).toBe(true);
  });

  it('parses valid code and rejects invalid extension via helper', () => {
    expect(parseCodeToAST('const x = 1;', 'a.js')).not.toBeNull();
    expect(isParseableFile('a.tsx')).toBe(true);
    expect(isParseableFile('a.css')).toBe(false);
  });
});

