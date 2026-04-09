import { describe, expect, it } from 'vitest';
import {
  canonicalizeClientInfo,
  buildInitializeResponse,
  buildRestartAcceptedResponse,
  isProxyManagedRestartArgs,
  isRestartServerToolCall,
  normalizeBridgeInitializeMessage,
  resolveRestartType,
  shouldTriggerRecovery,
  isSessionExpiredError
} from '../../../../src/layer-c-memory/mcp/stdio-bridge-helpers.js';

describe('stdio-bridge-helpers', () => {
  it('stamps transport provenance on canonicalized client info', () => {
    const clientInfo = canonicalizeClientInfo({
      name: 'Claude',
      client_id: 'claude'
    });

    expect(clientInfo.transport_origin).toBe('stdio_bridge');
    expect(clientInfo.transport_origin_source).toBe('stdio_bridge');
    expect(clientInfo.client_route_id).toMatch(/^claude::\d+$/);
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

  it('treats invalid or missing MCP session as a recoverable session error', () => {
    const error = new Error('Bad Request: invalid or missing MCP session');

    expect(shouldTriggerRecovery(error)).toBe(true);
    expect(isSessionExpiredError(error)).toBe(true);
  });

  it('treats fetch failures during restart as recoverable session errors', () => {
    const error = new Error('BRIDGE_FORWARD_FAILED: fetch failed');

    expect(shouldTriggerRecovery(error)).toBe(true);
    expect(isSessionExpiredError(error)).toBe(true);
  });

  it('builds a local initialize response from cached daemon data', () => {
    const response = buildInitializeResponse(42, {
      result: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'omnysys', version: '3.0.0' }
      }
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 42,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: 'omnysys', version: '3.0.0' }
      }
    });
  });

  it('builds a local restart acknowledgement for process restarts', () => {
    const response = buildRestartAcceptedResponse(7, {
      processRestart: true
    }, {
      retryAfterMs: 5000,
      estimatedReadyAt: '2026-04-08T20:52:50.000Z'
    });

    expect(response).toEqual(expect.objectContaining({
      jsonrpc: '2.0',
      id: 7,
      result: expect.objectContaining({
        structuredContent: expect.objectContaining({
          success: true,
          restarting: true,
          processRestart: true,
          restartType: 'true_process_restart',
          message: 'Restart request accepted. The bridge is recovering and will reconnect automatically. Estimated ready in about 5s.',
          bridgeRecovery: expect.objectContaining({
            state: 'recovering',
            retryAfterMs: 5000,
            estimatedReadyAt: '2026-04-08T20:52:50.000Z'
          })
        }),
        content: [
          expect.objectContaining({
            type: 'text'
          })
        ]
      })
    }));
    expect(typeof response.result.structuredContent.timestamp).toBe('string');
  });

  it('builds a recovering acknowledgement for destructive proxy reanalyze', () => {
    const response = buildRestartAcceptedResponse(8, {
      clearCache: true,
      reanalyze: true
    });

    expect(response.result.structuredContent).toEqual(expect.objectContaining({
      processRestart: false,
      proxyManagedRestart: true,
      restartType: 'proxy_reanalyze',
      bridgeRecovery: expect.objectContaining({
        state: 'recovering',
        forceFreshSession: true,
        retryAfterMs: 15000
      })
    }));
  });

  it('does not mark cache-only flush as a proxy-managed restart', () => {
    const response = buildRestartAcceptedResponse(9, {
      clearCacheOnly: true
    });

    expect(response.result.structuredContent).toEqual(expect.objectContaining({
      proxyManagedRestart: false,
      restartType: 'cache_only_flush',
      bridgeRecovery: expect.objectContaining({
        state: 'accepted',
        retryAfterMs: 0
      })
    }));
  });

  it('classifies restart modes consistently for bridge decisions', () => {
    expect(resolveRestartType({ processRestart: true })).toBe('true_process_restart');
    expect(resolveRestartType({ clearCache: true, reanalyze: true })).toBe('proxy_reanalyze');
    expect(resolveRestartType({ clearCacheOnly: true })).toBe('cache_only_flush');
    expect(resolveRestartType({})).toBe('legacy_proxy_restart');
    expect(isProxyManagedRestartArgs({ processRestart: true })).toBe(true);
    expect(isProxyManagedRestartArgs({ clearCache: true, reanalyze: true })).toBe(true);
    expect(isProxyManagedRestartArgs({ clearCacheOnly: true })).toBe(false);
    expect(isProxyManagedRestartArgs({ reindexOnly: true })).toBe(false);
  });

  it('detects restart tool calls routed through tools/call', () => {
    expect(isRestartServerToolCall({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'mcp_omnysystem_restart_server',
        arguments: { processRestart: true }
      },
      id: 9
    })).toBe(true);
  });
});
