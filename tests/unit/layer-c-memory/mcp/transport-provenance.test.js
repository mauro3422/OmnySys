import { describe, expect, it } from 'vitest';
import {
  buildTransportProvenance,
  inferTransportOrigin,
  normalizeTransportOrigin
} from '../../../../src/layer-c-memory/mcp/transport-provenance.js';

describe('transport-provenance', () => {
  it('normalizes transport aliases', () => {
    expect(normalizeTransportOrigin('stdio')).toBe('stdio_bridge');
    expect(normalizeTransportOrigin('shell')).toBe('shell_http_fallback');
    expect(normalizeTransportOrigin('native')).toBe('native_mcp');
  });

  it('infers stdio bridge transport from recovery markers', () => {
    expect(inferTransportOrigin({
      clientInfo: {
        bridge_recovery: true
      }
    })).toBe('stdio_bridge');
  });

  it('defaults to native MCP for plain requests', () => {
    expect(inferTransportOrigin()).toBe('native_mcp');
  });

  it('builds a transport provenance envelope', () => {
    expect(buildTransportProvenance({
      origin: 'shell_http_fallback',
      source: 'explicit',
      sessionId: 'session-1',
      clientId: 'client-1'
    })).toMatchObject({
      transport_origin: 'shell_http_fallback',
      transport_origin_source: 'explicit',
      transport_session_id: 'session-1',
      transport_client_id: 'client-1'
    });
  });
});
