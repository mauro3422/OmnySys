const STEP_RETRY_AFTER_MS = {
  'instance-detection': 500,
  'layer-a-analysis': 2000,
  'cache-init': 1000,
  'llm-setup': 500,
  'orchestrator-init': 1000,
  'mcp-setup': 500,
  ready: 750
};

const DEFAULT_RETRY_AFTER_MS = 1000;

function getInitializationStepNames(server = null) {
  if (!Array.isArray(server?.pipeline?.steps)) {
    return [];
  }

  return server.pipeline.steps
    .filter((step) => {
      if (!step) {
        return false;
      }
      if (typeof step.canExecute !== 'function') {
        return true;
      }
      try {
        return step.canExecute(server);
      } catch {
        return true;
      }
    })
    .map((step) => step.name)
    .filter(Boolean);
}

function resolveRetryAfterMs(currentStep = null, retryAfterMs = null) {
  if (retryAfterMs !== null && retryAfterMs !== undefined && Number.isFinite(Number(retryAfterMs)) && Number(retryAfterMs) >= 0) {
    return Number(retryAfterMs);
  }

  return STEP_RETRY_AFTER_MS[currentStep] || DEFAULT_RETRY_AFTER_MS;
}

export function buildInitializationProgress(server = null, options = {}) {
  const initialized = Boolean(server?.initialized);
  const steps = getInitializationStepNames(server);
  const totalSteps = steps.length || 0;
  const completedSteps = Array.isArray(server?.initializationTimings)
    ? server.initializationTimings.length
    : 0;
  const currentStep = initialized
    ? null
    : (server?.currentInitializationStep || null);
  const detail = initialized
    ? null
    : (server?.currentInitializationDetail || null);
  const stepIndex = currentStep
    ? Math.max(1, steps.indexOf(currentStep) + 1)
    : (initialized ? totalSteps : Math.min(totalSteps || 1, completedSteps + 1));
  const progressRatio = initialized
    ? 1
    : (totalSteps > 0
      ? Math.min(0.95, Math.max(completedSteps, stepIndex - 0.5) / totalSteps)
      : 0);
  const progressPercent = Math.max(0, Math.min(100, Math.round(progressRatio * 100)));
  const retryAfterMs = resolveRetryAfterMs(currentStep, options.retryAfterMs);
  const estimatedReadyAt = initialized
    ? new Date().toISOString()
    : new Date(Date.now() + retryAfterMs).toISOString();

  return {
    status: initialized ? 'ready' : 'starting',
    initialized,
    currentStep,
    currentDetail: detail,
    stepIndex: totalSteps > 0 ? stepIndex : null,
    totalSteps: totalSteps || null,
    completedSteps,
    progressPercent,
    retryAfterMs,
    estimatedReadyAt,
    acceptingMcpSessions: options.acceptingMcpSessions !== false,
    summary: initialized
      ? 'Initialization complete.'
      : `Startup in progress${currentStep ? ` (${currentStep})` : ''}.`
  };
}

export function buildInitializationPendingToolResult({
  server = null,
  initError = null,
  projectPath = null,
  retryAfterMs = null
} = {}) {
  const initialization = buildInitializationProgress(server, {
    retryAfterMs,
    acceptingMcpSessions: true
  });
  const failed = Boolean(initError);
  const payload = {
    success: false,
    ready: false,
    loading: !failed,
    retryable: !failed,
    message: failed
      ? `OmnySys initialization failed: ${initError.message}`
      : `OmnySys is still initializing${initialization.currentStep ? ` (${initialization.currentStep})` : ''}. Retry soon.`,
    projectPath: projectPath || server?.projectPath || null,
    initialization,
    suggestedPollingTools: failed
      ? []
      : ['get_server_status', 'get_health_panel'],
    timestamp: new Date().toISOString()
  };

  return {
    structuredContent: payload,
    content: [
      {
        type: 'text',
        text: failed
          ? payload.message
          : `${payload.message} Retry in about ${Math.max(1, Math.ceil(initialization.retryAfterMs / 1000))}s.`
      }
    ]
  };
}
