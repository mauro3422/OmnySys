import {
    loadConceptualLocalAtoms as loadConceptualLocalAtomsImpl,
    loadConceptualDuplicateRows as loadConceptualDuplicateRowsImpl,
    loadLocalStructuralHash as loadLocalStructuralHashImpl
} from './query.js';
import {
    shouldSkipConceptualAtom as shouldSkipConceptualAtomImpl,
    isActionableConceptualPeer as isActionableConceptualPeerImpl,
    isTrivialCanonicalDelegate as isTrivialCanonicalDelegateImpl
} from './filters.js';
import { buildConceptualFinding as buildConceptualFindingImpl } from './finding.js';
import { detectConceptualFindings as detectConceptualFindingsImpl } from './detect.js';
import { clearConceptualDuplicateIssues as clearConceptualDuplicateIssuesImpl } from './query.js';

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
