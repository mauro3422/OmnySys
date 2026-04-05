export function inferSystemKind(surface = {}) {
  const surfaceText = [
    surface.kind,
    surface.role,
    surface.status,
    surface.surface,
    surface.entrypoint,
    surface.domain,
    surface.scope,
    surface.summary,
    surface.backingSurface,
    surface.source
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (surface.sourceOfTruth === true || surface.status === 'canonical') {
    return 'canonical_like';
  }

  if (surfaceText.includes('db') || surfaceText.includes('sqlite') || surfaceText.includes('storage') || surfaceText.includes('persistence')) {
    return 'db_like';
  }

  if (surfaceText.includes('api') || surfaceText.includes('endpoint') || surfaceText.includes('route') || surfaceText.includes('tool')) {
    return 'api_like';
  }

  if (surfaceText.includes('guard') || surfaceText.includes('policy') || surfaceText.includes('drift') || surfaceText.includes('validation') || surfaceText.includes('watcher')) {
    return 'guard_like';
  }

  if (surfaceText.includes('bridge') || surfaceText.includes('wrapper') || surfaceText.includes('proxy') || surfaceText.includes('adaptor') || surfaceText.includes('adapter')) {
    return 'bridge_like';
  }

  if (surfaceText.includes('metric') || surfaceText.includes('health') || surfaceText.includes('status') || surfaceText.includes('dashboard') || surfaceText.includes('snapshot')) {
    return 'observability_like';
  }

  if (surfaceText.includes('inventory') || surfaceText.includes('contract') || surfaceText.includes('promotion') || surfaceText.includes('folderization')) {
    return 'governance_like';
  }

  return 'unknown';
}
