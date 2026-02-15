import { describe, it, expect } from 'vitest';
import * as moduleAnalyzerApi from '../../../../../src/layer-a-static/module-system/module-analyzer/index.js';

describe('module-system/module-analyzer/index.js', () => {
  it('exports analyzer components', () => {
    expect(typeof moduleAnalyzerApi.ConnectionAnalyzer).toBe('function');
    expect(typeof moduleAnalyzerApi.ExportAnalyzer).toBe('function');
    expect(typeof moduleAnalyzerApi.ImportAnalyzer).toBe('function');
    expect(typeof moduleAnalyzerApi.MetricsCalculator).toBe('function');
    expect(typeof moduleAnalyzerApi.ChainBuilder).toBe('function');
    expect(typeof moduleAnalyzerApi.ModuleAnalyzer).toBe('function');
  });
});

