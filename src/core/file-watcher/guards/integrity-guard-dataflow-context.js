import { DataFlowAnalyzer } from '../../../layer-a-static/extractors/data-flow/core/data-flow-analyzer.js';
import {
    classifyAtomOperationalRole,
    classifyFileOperationalRole,
    isLikelyToolWrapperAtom
} from '../../../shared/compiler/index.js';

function isLikelyInfrastructureLeafAtom(atom, isEmptyFlow) {
    if (!isEmptyFlow) {
        return false;
    }

    const name = String(atom?.name || '');
    const filePath = String(atom?.file_path || atom?.filePath || '').replace(/\\/g, '/').toLowerCase();
    const semanticFingerprint = String(
        atom?.semanticFingerprint
        || atom?.dna?.semanticFingerprint
        || atom?.dnaJson?.semanticFingerprint
        || ''
    ).toLowerCase();
    const purpose = String(atom?.purpose || '').toUpperCase();
    const riskLevel = String(atom?.riskLevel || '').toUpperCase();
    const centrality = String(atom?.centralityClassification || '').toUpperCase();
    const atomType = String(atom?.type || atom?.functionType || '').toLowerCase();
    const callersCount = Number(atom?.callersCount || 0);
    const calleesCount = Number(atom?.calleesCount || 0);
    const infraName = /(Operation|Operations|Factory|Transaction)$/i.test(name);
    const infraPath = /\/(cache|storage|repository|adapters)\//.test(filePath);
    const infraFingerprint = semanticFingerprint.startsWith('process:storage:core:')
        || semanticFingerprint.startsWith('process:logic:core:');

    if (atomType !== 'class') {
        return false;
    }

    if (
        purpose !== 'API_EXPORT' &&
        purpose !== 'FACTORY' &&
        !infraName &&
        !infraPath &&
        !infraFingerprint
    ) {
        return false;
    }

    return riskLevel === 'LOW' &&
        (centrality === 'LEAF' || centrality === 'BRIDGE') &&
        callersCount === 0 &&
        calleesCount === 0;
}

export function getAtomDataFlowContext(atom) {
    if (isLikelyToolWrapperAtom(atom) || !atom.dataFlow) {
        return null;
    }

    const filePath = atom.file_path || atom.filePath || '';
    const analyzer = new DataFlowAnalyzer(
        atom.dataFlow.inputs || [],
        atom.dataFlow.transformations || [],
        atom.dataFlow.outputs || []
    );

    return {
        analysis: analyzer.analyze(),
        filePath,
        role: classifyAtomOperationalRole(atom, { filePath }),
        fileRole: classifyFileOperationalRole(filePath),
        isInfrastructureLeafAtom: (isEmptyFlow) => isLikelyInfrastructureLeafAtom(atom, isEmptyFlow)
    };
}
