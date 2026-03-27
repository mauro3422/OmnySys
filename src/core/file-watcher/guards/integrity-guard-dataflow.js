import { DataFlowAnalyzer } from '../../../layer-a-static/extractors/data-flow/core/data-flow-analyzer.js';
import {
  createStandardContext,
  StandardThresholds,
  isValidGuardTarget
} from './guard-standards.js';
import {
  getActionableUnusedInputs,
  isLikelyToolWrapperAtom,
  isLikelyBoundaryContainerAtom,
  classifyAtomOperationalRole,
  classifyFileOperationalRole
} from '../../../shared/compiler/index.js';

function buildLowCoherenceViolation(atom, analysis) {
  const severity = analysis.coherence < 0.1 ? 'high' : 'medium';

  return {
    atomId: atom.id,
    atomName: atom.name,
    type: 'LOW_COHERENCE',
    severity,
    message: `Atom '${atom.name}' has low data-flow coherence (${Math.round(analysis.coherence * 100)}%). Possible broken logic.`,
    context: createStandardContext({
      guardName: 'integrity-guard',
      atomId: atom.id,
      atomName: atom.name,
      metricValue: analysis.coherence,
      threshold: StandardThresholds.COHERENCE_MIN,
      severity,
      suggestedAction: 'Review data-flow logic for disconnected inputs/outputs',
      suggestedAlternatives: [
        'Remove unused inputs',
        'Connect dangling outputs to appropriate destinations',
        'Refactor into smaller, coherent functions'
      ],
      extraData: {
        coherence: analysis.coherence,
        inputs: analysis.inputs?.length || 0,
        outputs: analysis.outputs?.length || 0,
        transformationCount: analysis.transformations?.length || 0
      }
    })
  };
}

function buildUnusedInputsViolation(atom, analysis, inputNames) {
  return {
    atomId: atom.id,
    atomName: atom.name,
    type: 'UNUSED_INPUTS',
    severity: 'low',
    message: `Atom '${atom.name}' has unused inputs: ${inputNames.join(', ')}.`,
    context: createStandardContext({
      guardName: 'integrity-guard',
      atomId: atom.id,
      atomName: atom.name,
      severity: 'low',
      suggestedAction: 'Remove unused parameters or use them in the function logic',
      suggestedAlternatives: [
        'Remove unused parameters',
        'Use the parameters in the function body',
        'Mark optional parameters as such'
      ],
      extraData: {
        unusedInputs: inputNames,
        inputCount: analysis.inputs?.length || 0
      }
    })
  };
}

function getAtomDataFlowContext(atom) {
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
    fileRole: classifyFileOperationalRole(filePath)
  };
}

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

function shouldSkipDataFlowViolation(atom, resolvedRole, inputsCount, outputsCount, transformationCount) {
  const isEmptyFlow = inputsCount === 0 && outputsCount === 0 && transformationCount === 0;
  const isCoordinatorLike = (
    resolvedRole.role === 'orchestrator' ||
    resolvedRole.role === 'resolver' ||
    resolvedRole.role === 'builder' ||
    resolvedRole.role === 'analyzer' ||
    resolvedRole.role === 'bridge' ||
    resolvedRole.role === 'policy'
  );
  const isInfrastructureLeaf = isLikelyInfrastructureLeafAtom(atom, isEmptyFlow);

  return (isLikelyBoundaryContainerAtom(atom) && isEmptyFlow) ||
    (isCoordinatorLike && isEmptyFlow) ||
    isInfrastructureLeaf;
}

export function analyzeAtomDataFlow(atom) {
  const flowContext = getAtomDataFlowContext(atom);
  if (!flowContext) {
    return [];
  }

  const { analysis, role, fileRole } = flowContext;
  const violations = [];
  const resolvedRole = role.role === 'standard' ? fileRole : role;
  const inputsCount = analysis.inputs?.length || 0;
  const outputsCount = analysis.outputs?.length || 0;
  const transformationCount = analysis.transformations?.length || 0;

  if (!shouldSkipDataFlowViolation(atom, resolvedRole, inputsCount, outputsCount, transformationCount) &&
      analysis.coherence < StandardThresholds.COHERENCE_MIN) {
    violations.push(buildLowCoherenceViolation(atom, analysis));
  }

  const inputNames = getActionableUnusedInputs(analysis);
  if (inputNames.length > 0) {
    violations.push(buildUnusedInputsViolation(atom, analysis, inputNames));
  }

  return violations;
}

export { buildLowCoherenceViolation, buildUnusedInputsViolation };
