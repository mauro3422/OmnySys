import { describe, expect, it } from 'vitest';

import {
  buildHealthProbeUrls,
  buildHealthUrl,
  buildMcpUrl
} from '../../../../src/cli/utils/mcp-endpoints.js';

describe('mcp-endpoints', () => {
  it('builds WSL-aware MCP endpoints when a host override is present', () => {
    const env = {
      WSL_DISTRO_NAME: 'Ubuntu',
      OMNYSYS_WSL_HOST: '172.20.48.1'
    };

    expect(buildMcpUrl({ env })).toBe('http://172.20.48.1:9999/mcp');
    expect(buildHealthUrl({ env })).toBe('http://172.20.48.1:9999/health');
  });

  it('keeps localhost when WSL is detected but no host override is provided', () => {
    const env = {
      WSL_DISTRO_NAME: 'Ubuntu'
    };

    expect(buildMcpUrl({ env })).toBe('http://localhost:9999/mcp');
    expect(buildHealthUrl({ env })).toBe('http://localhost:9999/health');
  });

  it('keeps localhost as the default outside WSL', () => {
    expect(buildMcpUrl({ platform: 'win32' })).toBe('http://localhost:9999/mcp');
    expect(buildHealthUrl({ platform: 'win32' })).toBe('http://localhost:9999/health');
  });

  it('tries multiple probe URLs for health checks', () => {
    const urls = buildHealthProbeUrls({
      env: {
        WSL_DISTRO_NAME: 'Ubuntu',
        OMNYSYS_WSL_HOST: '172.20.48.1'
      }
    });

    expect(urls).toContain('http://127.0.0.1:9999/health');
    expect(urls).toContain('http://localhost:9999/health');
    expect(urls).toContain('http://172.20.48.1:9999/health');
  });
});
