/**
 * @fileoverview index.js
 * 
 * [DEPRECATED] Servicios de aplicación.
 * Todos los servicios de LLM locales han sido reemplazados por endpoints MCP unificados.
 */

export function isLLMAvailable() { return false; }
export async function analyzeWithLLM() { throw new Error("Deprecated"); }
export async function waitForLLM() { return false; }
