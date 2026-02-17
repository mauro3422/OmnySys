import { describe, it, expect } from 'vitest';
import { needsLLMAnalysis } from '#layer-b/llm-analyzer/analysis-decider.js';

describe('llm-analyzer/analysis-decider', () => {
  describe('needsLLMAnalysis', () => {
    describe('basic behavior', () => {
      it('should return true when fileAnalysis is null', () => {
        const result = needsLLMAnalysis({}, null);
        expect(result).toBe(true);
      });

      it('should return true when fileAnalysis is undefined', () => {
        const result = needsLLMAnalysis({}, undefined);
        expect(result).toBe(true);
      });

      it('should return false for fully connected file', () => {
        const semanticAnalysis = {};
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [{ source: './consumer' }],
          semanticConnections: [{ type: 'import', confidence: 1.0 }]
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(false);
      });
    });

    describe('orphan detection', () => {
      it('should return true for orphan with no connections', () => {
        const semanticAnalysis = {};
        const fileAnalysis = {
          imports: [],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return false if has imports', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should return false if has usedBy', () => {
        const fileAnalysis = {
          imports: [],
          usedBy: [{ source: './consumer' }],
          semanticConnections: []
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should return false if has semanticConnections with high confidence', () => {
        const fileAnalysis = {
          imports: [],
          usedBy: [],
          semanticConnections: [{ type: 'event', confidence: 1.0 }]
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });
    });

    describe('dynamic code detection', () => {
      it('should return true when hasDynamicImports is true', () => {
        const semanticAnalysis = { hasDynamicImports: true };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return true when hasEval is true', () => {
        const semanticAnalysis = { hasEval: true };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return true when dynamicImports array is not empty', () => {
        const semanticAnalysis = { dynamicImports: ['./dynamic.js'] };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return true when sideEffects contains dynamic', () => {
        const semanticAnalysis = { sideEffects: ['dynamic import'] };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return true when sideEffects contains eval', () => {
        const semanticAnalysis = { sideEffects: ['eval usage'] };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });
    });

    describe('unresolved events', () => {
      it('should return true when events are not resolved', () => {
        const semanticAnalysis = {
          events: { all: [{ event: 'customEvent' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return false when events are resolved', () => {
        const semanticAnalysis = {
          events: { all: [{ event: 'resolvedEvent' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [
            { type: 'eventListener', event: 'resolvedEvent', confidence: 1.0 }
          ],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should return true for partially resolved events', () => {
        const semanticAnalysis = {
          events: { all: [{ event: 'event1' }, { event: 'event2' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [
            { type: 'eventListener', event: 'event1', confidence: 1.0 }
          ],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should handle events as strings', () => {
        const semanticAnalysis = {
          events: { all: ['stringEvent'] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });
    });

    describe('unresolved shared state', () => {
      it('should return true when localStorage is not resolved', () => {
        const semanticAnalysis = {
          localStorage: { all: [{ key: 'token' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return true when globals are not resolved', () => {
        const semanticAnalysis = {
          globals: { all: [{ property: 'window.config' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return false when shared state is resolved', () => {
        const semanticAnalysis = {
          localStorage: { all: [{ key: 'resolvedKey' }] }
        };
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [
            { type: 'localStorage', key: 'resolvedKey', confidence: 1.0 }
          ],
          semanticAnalysis
        };

        const result = needsLLMAnalysis(semanticAnalysis, fileAnalysis);
        expect(result).toBe(false);
      });
    });

    describe('low confidence connections', () => {
      it('should return true for low confidence connection', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [{ type: 'import', confidence: 0.5 }]
        };

        const result = needsLLMAnalysis({}, fileAnalysis, 0.7);
        expect(result).toBe(true);
      });

      it('should return false for high confidence connections', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [{ type: 'import', confidence: 0.9 }]
        };

        const result = needsLLMAnalysis({}, fileAnalysis, 0.7);
        expect(result).toBe(false);
      });

      it('should use default threshold of 0.7', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [{ type: 'import', confidence: 0.69 }]
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should accept connection at exact threshold', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [{ type: 'import', confidence: 0.7 }]
        };

        const result = needsLLMAnalysis({}, fileAnalysis, 0.7);
        expect(result).toBe(false);
      });
    });

    describe('unresolved network connections', () => {
      it('should return true for unresolved endpoints', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {
            sideEffects: {
              networkCalls: [{ code: 'fetch("/api/users")' }]
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return false when endpoints are resolved', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [
            { type: 'shared-route', route: '/api/users', confidence: 1.0 }
          ],
          metadata: {
            sideEffects: {
              networkCalls: [{ code: 'fetch("/api/users")' }]
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should return false when no network calls', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {
            sideEffects: {
              networkCalls: []
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });
    });

    describe('unresolved lifecycle hooks', () => {
      it('should return true for hooks without cleanup', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {
            temporal: {
              lifecycleHooks: ['useEffect'],
              cleanupPatterns: []
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(true);
      });

      it('should return false when all hooks have cleanup', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {
            temporal: {
              lifecycleHooks: ['useEffect'],
              cleanupPatterns: ['return cleanup']
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should return false when no lifecycle hooks', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {
            temporal: {
              lifecycleHooks: [],
              cleanupPatterns: []
            }
          }
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle missing semanticConnections array', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: []
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should handle missing metadata', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should handle missing temporal metadata', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {}
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should handle missing sideEffects metadata', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: [],
          metadata: {}
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should handle empty semanticAnalysis', () => {
        const fileAnalysis = {
          imports: [{ source: './other' }],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis({}, fileAnalysis);
        expect(result).toBe(false);
      });

      it('should prioritize orphan detection over other checks', () => {
        const fileAnalysis = {
          imports: [],
          usedBy: [],
          semanticConnections: []
        };

        const result = needsLLMAnalysis({ hasDynamicImports: true }, fileAnalysis);
        expect(result).toBe(true);
      });
    });
  });
});
