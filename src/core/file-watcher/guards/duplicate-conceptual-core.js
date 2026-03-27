import {
    loadConceptualLocalAtoms as loadConceptualLocalAtomsImpl,
    loadConceptualDuplicateRows as loadConceptualDuplicateRowsImpl,
    loadLocalStructuralHash as loadLocalStructuralHashImpl
} from './duplicate-conceptual-query.js';
import {
    shouldSkipConceptualAtom as shouldSkipConceptualAtomImpl,
    isActionableConceptualPeer as isActionableConceptualPeerImpl,
    isTrivialCanonicalDelegate as isTrivialCanonicalDelegateImpl
} from './duplicate-conceptual-filters.js';
import { buildConceptualFinding as buildConceptualFindingImpl } from './duplicate-conceptual-finding.js';
import { detectConceptualFindings as detectConceptualFindingsImpl } from './duplicate-conceptual-detect.js';
import { clearConceptualDuplicateIssues as clearConceptualDuplicateIssuesImpl } from './duplicate-conceptual-query.js';

export const clearConceptualDuplicateIssues = clearConceptualDuplicateIssuesImpl;
export const loadConceptualLocalAtoms = loadConceptualLocalAtomsImpl;
export const shouldSkipConceptualAtom = shouldSkipConceptualAtomImpl;
export const loadConceptualDuplicateRows = loadConceptualDuplicateRowsImpl;
export const loadLocalStructuralHash = loadLocalStructuralHashImpl;
export const isActionableConceptualPeer = isActionableConceptualPeerImpl;
export const isTrivialCanonicalDelegate = isTrivialCanonicalDelegateImpl;
export const buildConceptualFinding = buildConceptualFindingImpl;
export const detectConceptualFindings = detectConceptualFindingsImpl;

export default {
    clearConceptualDuplicateIssues,
    loadConceptualLocalAtoms,
    shouldSkipConceptualAtom,
    loadConceptualDuplicateRows,
    loadLocalStructuralHash,
    isActionableConceptualPeer,
    isTrivialCanonicalDelegate,
    buildConceptualFinding,
    detectConceptualFindings
};
