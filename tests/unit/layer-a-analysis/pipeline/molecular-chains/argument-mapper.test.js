import { describe, it, expect } from 'vitest';
import ArgumentMapperDefault, * as ArgumentMapperCompat from '#layer-a/pipeline/molecular-chains/argument-mapper.js';
import { ArgumentMapper } from '#layer-a/pipeline/molecular-chains/argument-mapper/index.js';

describe('pipeline/molecular-chains/argument-mapper.js', () => {
  it('re-exports the modular API for backward compatibility', () => {
    expect(ArgumentMapperCompat.ArgumentMapper).toBeTypeOf('function');
    expect(ArgumentMapperDefault).toBe(ArgumentMapper);
  });
});
