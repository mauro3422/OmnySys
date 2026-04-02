import { describe, expect, it } from 'vitest';

import { probeDatabaseIntegrity } from '../../../../../src/layer-c-memory/storage/database/connection-helpers.js';

function createDb({ open = true, rows = [], throws = null } = {}) {
  return {
    open,
    prepare() {
      return {
        all() {
          if (throws) {
            throw throws;
          }
          return rows;
        }
      };
    }
  };
}

describe('probeDatabaseIntegrity', () => {
  it('marks a quick_check ok result as healthy', () => {
    const result = probeDatabaseIntegrity(createDb({
      rows: [{ quick_check: 'ok' }]
    }));

    expect(result.healthy).toBe(true);
    expect(result.trustworthy).toBe(true);
    expect(result.status).toBe('healthy');
    expect(result.findings).toEqual([]);
  });

  it('marks non-ok quick_check output as unhealthy', () => {
    const result = probeDatabaseIntegrity(createDb({
      rows: [{ quick_check: 'row 1 missing from table atoms' }]
    }));

    expect(result.healthy).toBe(false);
    expect(result.trustworthy).toBe(false);
    expect(result.status).toBe('degraded');
    expect(result.findings).toContain('row 1 missing from table atoms');
  });

  it('treats a closed database as unavailable', () => {
    const result = probeDatabaseIntegrity(createDb({ open: false }));

    expect(result.healthy).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.findings).toContain('database_connection_closed');
  });

  it('handles quick_check failures safely', () => {
    const result = probeDatabaseIntegrity(createDb({
      throws: new Error('database disk image is malformed')
    }));

    expect(result.healthy).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.findings).toContain('database disk image is malformed');
  });
});
