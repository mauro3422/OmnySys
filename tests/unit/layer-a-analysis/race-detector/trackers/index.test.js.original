import { describe, it, expect } from 'vitest';
import {
  BaseTracker,
  GlobalVariableTracker,
  ModuleStateTracker,
  ExternalResourceTracker,
  SingletonTracker,
  ClosureTracker
} from '#layer-a/race-detector/trackers/index.js';

describe('race-detector/trackers/index.js', () => {
  it('exports tracker constructors', () => {
    expect(BaseTracker).toBeTypeOf('function');
    expect(GlobalVariableTracker).toBeTypeOf('function');
    expect(ModuleStateTracker).toBeTypeOf('function');
    expect(ExternalResourceTracker).toBeTypeOf('function');
    expect(SingletonTracker).toBeTypeOf('function');
    expect(ClosureTracker).toBeTypeOf('function');
  });
});
