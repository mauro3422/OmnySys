/**
 * @fileoverview Module System Test Factory - Helpers
 */

export function createMockModules(count = 3) {
  return Array.from({ length: count }, (_, i) => 
    ModuleBuilder.create(`module-${i + 1}`)
      .withFile(`src/module-${i + 1}/index.js`)
      .withExport('main', { file: 'index.js' })
      .build()
  );
}

export function createMockMolecule(filePath, atoms = []) {
  return {
    filePath,
    atomCount: atoms.length,
    atoms: atoms.map(a => typeof a === 'string' ? { name: a } : a)
  };
}

export function createMockAtom(name, options = {}) {
  return {
    name,
    isExported: options.isExported || false,
    isAsync: options.isAsync || false,
    hasSideEffects: options.hasSideEffects || false,
    hasNetworkCalls: options.hasNetworkCalls || false,
    hasDomManipulation: options.hasDomManipulation || false,
    hasStorageAccess: options.hasStorageAccess || false,
    hasLogging: options.hasLogging || false,
    filePath: options.filePath || 'unknown.js',
    calls: options.calls || [],
    dataFlow: options.dataFlow || { outputs: [] },
    ...options
  };
}

export function createMockEntryPoint(type, overrides = {}) {
  const base = {
    type,
    handler: { module: 'test', file: 'test.js', function: 'handler' }
  };

  switch (type) {
    case 'api':
      base.path = overrides.path || '/test';
      base.method = overrides.method || 'GET';
      break;
    case 'cli':
      base.command = overrides.command || 'test-command';
      break;
    case 'event':
      base.event = overrides.event || 'test-event';
      break;
    case 'scheduled':
      base.name = overrides.name || 'test-job';
      base.schedule = overrides.schedule || '0 0 * * *';
      break;
    case 'library':
      base.name = overrides.name || 'test-export';
      base.module = overrides.module || 'test';
      break;
  }

  return { ...base, ...overrides };
}

