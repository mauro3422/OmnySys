import { atomic_edit, atomic_write } from './atomic-edit.js';
import { move_file } from './move-file.js';
import { fix_imports } from './fix-imports.js';
import { execute_solid_split } from './execute-solid-split.js';
import { suggest_refactoring } from './suggest-refactoring.js';
import { validate_imports } from './validate-imports.js';
import { generate_tests, generate_batch_tests } from './generate-tests/index.js';
import { suggest_architecture } from './suggest-architecture.js';
import { consolidate_conceptual_cluster } from './consolidate-conceptual-cluster.js';

export const actionToolHandlers = {
  mcp_omnysystem_atomic_edit: atomic_edit,
  mcp_omnysystem_atomic_write: atomic_write,
  mcp_omnysystem_move_file: move_file,
  mcp_omnysystem_fix_imports: fix_imports,
  mcp_omnysystem_execute_solid_split: execute_solid_split,
  mcp_omnysystem_suggest_refactoring: suggest_refactoring,
  mcp_omnysystem_suggest_architecture: suggest_architecture,
  mcp_omnysystem_validate_imports: validate_imports,
  mcp_omnysystem_generate_tests: generate_tests,
  mcp_omnysystem_generate_batch_tests: generate_batch_tests,
  mcp_omnysystem_consolidate_conceptual_cluster: consolidate_conceptual_cluster
};
