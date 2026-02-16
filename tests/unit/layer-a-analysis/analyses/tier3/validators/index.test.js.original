import { describe, it, expect } from 'vitest';
import { UrlValidator } from '#layer-a/analyses/tier3/validators/index.js';

describe('analyses/tier3/validators/index.js', () => {
  it('exports UrlValidator class', () => {
    expect(UrlValidator).toBeTypeOf('function');
    const validator = new UrlValidator();
    expect(validator.validate).toBeTypeOf('function');
  });

  it('UrlValidator detects suspicious URLs and returns contract', () => {
    const validator = new UrlValidator();
    const result = validator.validate({
      fileResults: {
        'src/api.js': {
          networkCalls: {
            urls: [{ url: 'http://localhost:3000/api/users', line: 10 }]
          }
        }
      }
    });

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('byFile');
    expect(result).toHaveProperty('all');
    expect(result.total).toBeGreaterThan(0);
    expect(result.all[0]).toHaveProperty('suggestion');
  });
});
