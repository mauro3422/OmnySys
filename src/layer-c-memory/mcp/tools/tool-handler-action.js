import { atomic_edit, atomic_write } from './atomic-edit.js';
import { move_file } from './move-file.js';
import { fix_imports } from './fix-imports.js';
import { execute_solid_split } from './execute-solid-split.js';
import { suggest_refactoring } from './suggest-refactoring.js';
import { validate_imports } from './validate-imports.js';
import { generate_tests, generate_batch_tests } from './generate-tests/index.js';
import { suggest_architecture } from './suggest-architecture.js';
import { consolidate_conceptual_cluster } from './consolidate-conceptual-cluster.js';
import { suggest_canonical_api } from './suggest-canonical-api.js';
import { validate_exports } from './validate-exports-tool.js';
import { performAction } from '../../../shared/compiler/actions/ActionEngine.js';

export const actionToolHandlers = {
  mcp_omnysystem_atomic_edit: (args, ctx) => performAction('atomic_edit', args, ctx),
  mcp_omnysystem_atomic_write: (args, ctx) => performAction('atomic_write', args, ctx),
  mcp_omnysystem_move_file: (args, ctx) => performAction('move_file', args, ctx),
  mcp_omnysystem_fix_imports: (args, ctx) => performAction('fix_imports', args, ctx),
  mcp_omnysystem_execute_solid_split: (args, ctx) => performAction('solid_split', args, ctx),
  mcp_omnysystem_suggest_refactoring: suggest_refactoring,
  mcp_omnysystem_suggest_architecture: suggest_architecture,
  mcp_omnysystem_validate_imports: validate_imports,
  mcp_omnysystem_generate_tests: (args, ctx) => performAction('generate_tests', args, ctx),
  mcp_omnysystem_generate_batch_tests: generate_batch_tests,
  mcp_omnysystem_consolidate_conceptual_cluster: (args, ctx) => performAction('consolidate_cluster', args, ctx),
  mcp_omnysystem_folderize_family: (args, ctx) => performAction('folderize_family', args, ctx),
  mcp_omnysystem_safe_edit: (args, ctx) => performAction('safe_edit', args, ctx),
  mcp_omnysystem_get_edit_context: (args, ctx) => performAction('get_edit_context', args, ctx),
  mcp_omnysystem_suggest_canonical_api: suggest_canonical_api,
  mcp_omnysystem_validate_exports: validate_exports
};
