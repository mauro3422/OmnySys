/**
 * @fileoverview safe-edit - Entry Point
 *
 * MCP Tool: safe_edit
 * Edita archivos con contexto automático, backup y validación extendida.
 * Wrapper de alto nivel sobre atomic_edit.
 */

import { safe_edit, get_safe_edit_context } from './safe-edit-tool.js';

export { safe_edit, get_safe_edit_context };
export default { safe_edit, get_safe_edit_context };
