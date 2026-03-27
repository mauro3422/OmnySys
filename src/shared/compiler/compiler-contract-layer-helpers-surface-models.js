function buildSurface({
  id,
  kind,
  status,
  sourceOfTruth = false,
  scope,
  surface,
  backingSurface = null,
  trustworthy = true,
  healthy = true,
  summary,
  evidence = {}
} = {}) {
  return {
    id,
    kind,
    status,
    sourceOfTruth,
    scope,
    surface,
    backingSurface,
    trustworthy,
    healthy,
    summary,
    evidence
  };
}

function buildInvariant({
  id,
  status,
  severity = 'medium',
  message,
  recommendedAction,
  evidence = {}
} = {}) {
  return {
    id,
    status,
    severity,
    message,
    recommendedAction,
    evidence
  };
}

export {
  buildInvariant,
  buildSurface
};
