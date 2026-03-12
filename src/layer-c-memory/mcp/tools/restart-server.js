/**
 * @fileoverview MCP Restart Server Tool
 *
 * Use the shared runtime restart coordinator instead of embedding restart
 * orchestration inside the tool file itself.
 */

export async function restart_server(args, context) {
  const { handleRuntimeRestart } = await import('../restart-runtime.js');
  return handleRuntimeRestart(args, context);
}
