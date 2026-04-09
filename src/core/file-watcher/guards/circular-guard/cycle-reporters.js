import { createLogger } from '../../../../utils/logger.js';
import { buildCircularContext, buildCircularPropagation } from './context.js';
import { persistCircularIssue, clearCircularIssues } from './issue-service.js';

const logger = createLogger('OmnySys:file-watcher:guards:circular');

export async function persistModuleCycleIssue(rootPath, filePath, fileCycle) {
  try {
    const message = `Circular module dependency detected: ${fileCycle.join(' -> ')}`;
    const propagation = buildCircularPropagation({
      scopePath: rootPath,
      focusPath: filePath,
      severity: 'high',
      cycleType: 'module',
      candidateNames: fileCycle,
      cycleLength: fileCycle.length,
      reason: message
    });
    const context = buildCircularContext({
      severity: 'high',
      suggestedAction: 'Break the circular dependency by extracting shared code to a separate module',
      suggestedAlternatives: [
        'Extract common functionality to a third module',
        'Use dependency injection to break the cycle',
        'Consider if the modules have too many responsibilities'
      ],
      extraData: {
        cycleType: 'module',
        cyclePath: fileCycle,
        cycleLength: fileCycle.length,
        propagation
      }
    });

    logger.warn(`[CIRCULAR GUARD] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'high', message, context);
    return { message, context };
  } catch (error) {
    logger.warn(`[CIRCULAR GUARD] persistModuleCycleIssue failed: ${error.message}`);
    return { message: null, context: null, error: error.message };
  }
}

export async function persistLifecycleCycleIssue(rootPath, filePath, atom, atomCycle, atomNames) {
  try {
    const message = `Event-driven lifecycle loop detected: ${atomNames.join(' -> ')}`;
    const propagation = buildCircularPropagation({
      scopePath: rootPath,
      focusPath: filePath,
      severity: 'low',
      cycleType: 'lifecycle',
      candidateNames: atomNames,
      cycleLength: atomCycle.length,
      reason: message
    });
    const context = buildCircularContext({
      severity: 'low',
      atomId: atom.id,
      atomName: atomNames[0],
      suggestedAction: 'Verify that the lifecycle loop is event-driven and guarded by restart/connection state checks.',
      suggestedAlternatives: [
        'Keep lifecycle loops behind event/timer boundaries',
        'Document why the control loop is intentional',
        'Avoid direct synchronous recursion inside runtime ownership code'
      ],
      extraData: {
        cycleType: 'lifecycle',
        cyclePath: atomCycle,
        cycleLength: atomCycle.length,
        atomNames,
        propagation
      }
    });

    logger.info(`[CIRCULAR FUNCTION GUARD][LIFECYCLE] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'low', message, context);
    await clearCircularIssues(rootPath, filePath);
    return context;
  } catch (error) {
    logger.warn(`[CIRCULAR FUNCTION GUARD][LIFECYCLE] persist failed: ${error.message}`);
    return null;
  }
}

export async function persistFunctionalCycleIssue(rootPath, filePath, atom, atomCycle, atomNames) {
  try {
    const message = `Cross-file functional recursion detected: ${atomNames.join(' -> ')}`;
    const propagation = buildCircularPropagation({
      scopePath: rootPath,
      focusPath: filePath,
      severity: 'high',
      cycleType: 'function',
      candidateNames: atomNames,
      cycleLength: atomCycle.length,
      reason: message
    });
    const context = buildCircularContext({
      severity: 'high',
      atomId: atom.id,
      atomName: atomNames[0],
      suggestedAction: 'Review the call chain for potential infinite recursion. Consider using iteration or adding base case guards.',
      suggestedAlternatives: [
        'Convert recursive calls to iterative loops',
        'Add termination condition checks',
        'Use memoization to prevent repeated calls',
        'Break the cycle by restructuring the logic'
      ],
      extraData: {
        cycleType: 'function',
        cyclePath: atomCycle,
        cycleLength: atomCycle.length,
        atomNames,
        propagation
      }
    });

    logger.warn(`[CIRCULAR FUNCTION GUARD] ${message}`);
    await persistCircularIssue(rootPath, filePath, 'high', message, context);
    return context;
  } catch (error) {
    logger.warn(`[CIRCULAR FUNCTION GUARD] persist failed: ${error.message}`);
    return null;
  }
}
