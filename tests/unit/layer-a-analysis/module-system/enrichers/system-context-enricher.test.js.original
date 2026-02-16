import { describe, it, expect } from 'vitest';
import { enrichMoleculesWithSystemContext, createEmptyContext } from '../../../../../src/layer-a-static/module-system/enrichers/system-context-enricher.js';

describe('module-system/enrichers/system-context-enricher.js', () => {
  it('returns original molecule when module is not found', () => {
    const molecules = [{ filePath: '/proj/src/a.js', atoms: [] }];
    const out = enrichMoleculesWithSystemContext(molecules, { modules: [], system: { businessFlows: [], entryPoints: [], patterns: [] } });
    expect(out).toEqual(molecules);
  });

  it('adds moduleContext and systemContext for matched module file', () => {
    const molecules = [{ filePath: '/proj/src/auth/login.js', atoms: [{ name: 'login', isExported: true }], _meta: {} }];
    const out = enrichMoleculesWithSystemContext(molecules, {
      modules: [{
        moduleName: 'auth',
        modulePath: '/proj/src/auth',
        files: [{ path: '/proj/src/auth/login.js' }],
        internalChains: [{ id: 'c1', steps: [{ file: 'login.js' }] }],
        crossFileConnections: [{ from: { file: 'login.js', function: 'login' }, to: { file: 'x.js', function: 'x' } }],
        metrics: { totalFiles: 1 },
        imports: [{ module: 'db' }],
        exports: [{ name: 'login' }]
      }],
      system: {
        businessFlows: [{ name: 'auth-flow', type: 'request', steps: [{ module: 'auth', file: 'login.js', order: 1 }] }],
        entryPoints: [{ handler: { file: 'login.js', module: 'auth' } }],
        patterns: ['modular']
      }
    });

    expect(out[0].moduleContext.moduleName).toBe('auth');
    expect(out[0].systemContext.businessFlows[0].name).toBe('auth-flow');
  });

  it('creates empty context contract', () => {
    expect(createEmptyContext()).toEqual({ moduleContext: null, systemContext: null });
  });
});

