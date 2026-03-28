/**
 * @fileoverview Single Source of Truth (SSOT) for executing system actions.
 * Centralizes the logic for mutations, refactorings, and test generation.
 *
 * @module shared/compiler/actions/ActionEngine
 */

import { atomic_edit, atomic_write } from '../../../layer-c-memory/mcp/tools/atomic-edit.js';
import { move_file } from '../../../layer-c-memory/mcp/tools/move-file.js';
import { fix_imports } from '../../../layer-c-memory/mcp/tools/fix-imports.js';
import { execute_solid_split } from '../../../layer-c-memory/mcp/tools/execute-solid-split.js';
import { consolidate_conceptual_cluster } from '../../../layer-c-memory/mcp/tools/consolidate-conceptual-cluster.js';
import { folderize_family } from '../../../layer-c-memory/mcp/tools/folderize-family.js';
import { rename_folderized_family } from '../../../layer-c-memory/mcp/tools/rename-folderized-family.js';
import { generate_tests } from '../../../layer-c-memory/mcp/tools/generate-tests/index.js';
import { safe_edit, get_safe_edit_context } from '../../../layer-c-memory/mcp/tools/safe-edit/index.js';
import { withFile } from '../helpers/FileProcessingHelper.js';

/**
 * Registry of canonical action handlers.
 */
const ACTION_HANDLERS = {
  atomic_edit: async (args, context) => atomic_edit(args, context),
  atomic_write: async (args, context) => atomic_write(args, context),
  move_file: async (args, context) => move_file(args, context),
  fix_imports: async (args, context) => fix_imports(args, context),
  solid_split: async (args, context) => execute_solid_split(args, context),
  consolidate_cluster: async (args, context) => consolidate_conceptual_cluster(args, context),
  folderize_family: async (args, context) => folderize_family(args, context),
  rename_folderized_family: async (args, context) => rename_folderized_family(args, context),
  generate_tests: async (args, context) => generate_tests(args, context),
  safe_edit: async (args, context) => safe_edit(args, context),
  get_edit_context: async (args, context) => get_safe_edit_context(args, context),
  process_file: async (args) => withFile(args.filePath, args.processor, args.options)
};

/**
 * Executes a canonical action by type.
 * 
 * @param {string} type - The action type (e.g., 'atomic_edit')
 * @param {Object} args - Arguments for the action
 * @param {Object} [context] - Optional execution context
 * @returns {Promise<Object>} The action result
 */
export async function performAction(type, args, context = {}) {
  const handler = ACTION_HANDLERS[type];
  
  if (!handler) {
    throw new Error(`Unknown action type: ${type}`);
  }

  try {
    return await handler(args, context);
  } catch (error) {
    return {
      success: false,
      error: 'ACTION_EXECUTION_FAILED',
      message: error.message,
      type
    };
  }
}

/**
 * Returns available action types.
 * @returns {string[]}
 */
export function getAvailableActions() {
  return Object.keys(ACTION_HANDLERS);
}
