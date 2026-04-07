/**
 * @fileoverview Barrel for split-large-file-helpers.
 * Re-exports all public APIs from the folderized family.
 * @module shared/compiler/split-large-file-helpers
 */

// Grouping strategies
export {
    groupAtomsByResponsibility,
    groupByClass,
    groupByExports,
    groupByDNA,
    groupByImports,
    buildGroupsFromArray
} from './grouping-strategies.js';

// Import utilities
export {
    extractImports,
    findImportsForGroup,
    extractImportSymbols,
    adjustImportPath
} from './import-utils.js';

// Code extraction
export {
    extractRealAtomCode,
    buildFileContent
} from './code-extraction.js';

// Barrel builder
export {
    buildBarrelContent
} from './barrel-builder.js';

// Split plan builder
export {
    buildSplitPlan
} from './split-plan-builder.js';

// Coupling analysis
export {
    analyzeCoupling,
    generateSuggestions
} from './coupling-analysis.js';
