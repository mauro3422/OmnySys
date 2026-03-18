/**
 * @fileoverview error-formatter.js
 * Utilidad compartida para formatear errores en MCP tools
 */

export function formatError(code, message, details = {}) {
  return {
    success: false,
    error: { code, message },
    ...details,
    severity: details.severity || 'high'
  };
}
