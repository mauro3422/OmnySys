import { describe, it, expect } from 'vitest';
import {
  ExtractionStrategy,
  StrategyRegistry
} from '#layer-a/extractors/metadata/type-contracts/strategies/base-strategy.js';

class DummyStrategy extends ExtractionStrategy {
  constructor(name, priority, canHandle = true) {
    super(name, priority);
    this._canHandle = canHandle;
  }

  canHandle() {
    return this._canHandle;
  }

  extract() {
    return { params: [] };
  }
}

describe('extractors/metadata/type-contracts/strategies/base-strategy.js', () => {
  it('base strategy throws when abstract methods are not implemented', () => {
    const base = new ExtractionStrategy('base', 1);
    expect(() => base.canHandle({})).toThrow();
    expect(() => base.extract({})).toThrow();
  });

  it('registry sorts strategies by priority and extracts from applicable ones', () => {
    const reg = new StrategyRegistry();
    reg.register(new DummyStrategy('low', 10));
    reg.register(new DummyStrategy('high', 100));
    const out = reg.extractAll({ code: 'function x(){}' });
    expect(out.length).toBe(2);
    expect(out[0].source).toBe('high');
  });
});

