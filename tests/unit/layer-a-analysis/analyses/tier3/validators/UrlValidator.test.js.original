import { describe, it, expect } from 'vitest';
import { UrlValidator } from '#layer-a/analyses/tier3/validators/UrlValidator.js';

describe('analyses/tier3/validators/UrlValidator.js', () => {
  it('flags suspicious URLs from advanced analysis results', () => {
    const validator = new UrlValidator();
    const out = validator.validate({
      fileResults: {
        'a.js': {
          networkCalls: { urls: [{ url: 'http://localhost:3000/api', line: 10 }] },
          webSocket: { urls: [] }
        }
      }
    });
    expect(out.total).toBe(1);
    expect(out.all[0].type).toBe('SUSPICIOUS_URL');
  });
});

