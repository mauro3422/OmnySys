/**
 * @fileoverview semantic-queries.js
 *
 * Modulo coordinador de queries SQL para analisis semantico.
 *
 * @module mcp/tools/semantic/semantic-queries
 */

export {
    DEFAULT_DUPLICATE_ATOM_TYPES,
    DUPLICATE_MODES,
    runAtomHistoryQuery as queryAtomHistory,
    runDuplicatesQuery as queryDuplicates,
    runIsomorphicDuplicatesQuery as queryIsomorphicDuplicates
} from './semantic-queries/duplicate-queries.js';
export {
    runAsyncAtomsQuery as queryAsyncAtoms,
    runDnaCoverageQuery as queryDnaCoverage,
    runEventPatternsQuery as queryEventPatterns,
    runRaceConditionsQuery as queryRaceConditions,
    runSocietiesQuery as querySocieties
} from './semantic-queries/runtime-queries.js';
