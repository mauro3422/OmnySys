import { describe, expect, it } from 'vitest';
import {
  canonicalizeClientInfo,
  normalizeBridgeInitializeMessage
} from '../../../../src/layer-c-memory/mcp/stdio-bridge-helpers.js';

describe('stdio-bridge-helpers', () => {
  it('stamps transport provenance on canonicalized client info', () => {
    const clientInfo = canonicalizeClientInfo({
      name: 'Claude',
      client_id: 'claude'
    });

    expect(clientInfo.transport_origin).toBe('stdio_bridge');
    expect(clientInfo.transport_origin_source).toBe('stdio_bridge');
  });

  it('preserves transport provenance when normalizing initialize requests', () => {
    const message = normalizeBridgeInitializeMessage({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'Claude',
          client_id: 'claude'
        }
      },
      id: 1
    });

    expect(message.params.clientInfo.transport_origin).toBe('stdio_bridge');
    expect(message.params.clientInfo.transport_origin_source).toBe('stdio_bridge');
  });
});
