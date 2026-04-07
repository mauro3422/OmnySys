/**
 * @fileoverview Thin barrel — delegates to split-large-file-helpers/index.js
 * Maintains backward compatibility for existing imports.
 */
export {
  groupAtomsByResponsibility,
  groupByClass,
  groupByExports,
  groupByDNA,
  groupByImports,
  buildGroupsFromArray,
  extractImports,
  buildSplitPlan,
  buildFileContent,
  buildBarrelContent,
  analyzeCoupling,
  generateSuggestions
} from './split-large-file-helpers/index.js';
