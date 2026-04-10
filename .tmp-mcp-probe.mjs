import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:9999/mcp'));
const client = new Client(
  { name: 'codex-mcp-probe', version: '1.0.0' },
  { capabilities: { roots: {} } }
);

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const toolNames = (tools.tools || []).map((tool) => tool.name);
  console.log('TOOL_COUNT', toolNames.length);
  console.log('TOOL_NAMES', toolNames.slice(0, 10).join(', '));
  const toolName = toolNames.find((name) => /health|status/i.test(name)) || toolNames[0];
  if (!toolName) throw new Error('No tools returned by server');
  const result = await client.callTool({ name: toolName, arguments: {} });
  console.log('CALL_TOOL', toolName);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('MCP_PROBE_ERROR', error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  try { await transport.close(); } catch {}
  try { await client.close(); } catch {}
}
