import { normalizeCount } from './contract-helpers.js';
import { buildMcpUrl } from '../mcp-endpoints.js';

export function buildDaemonRow(status) {
  return {
    area: 'Daemon',
    state: status.initialized ? 'ready' : 'starting',
    detail: `telemetry=${status.telemetryMode || 'unknown'} | project=${status.project || 'n/a'}`,
    source: 'mcp-http-server'
  };
}

export function buildHttpRow(status) {
  const port = status.proxyRuntimeTelemetry?.port || status.transport?.port || 9999;
  const url = buildMcpUrl({ port });
  const workerPid = status.proxyRuntimeTelemetry?.workerPid || status.proxyRuntimeTelemetry?.pid || null;

  return {
    area: 'MCP HTTP',
    state: status.initialized ? 'ready' : 'starting',
    detail: `url=${url} | port=${normalizeCount(port)} | worker=${workerPid || 'n/a'} | mode=${status.proxyManaged === true ? 'proxy-managed' : 'standalone'}`,
    source: 'mcp-http-server'
  };
}
