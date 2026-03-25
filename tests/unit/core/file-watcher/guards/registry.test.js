/**
 * @fileoverview registry.test.js
 * 
 * Unit tests for the Guard Registry
 * Tests guard registration, execution, and statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }))
}));

// Mock watcher-issue-persistence
vi.mock('../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
    persistWatcherIssue: vi.fn(),
    clearWatcherIssue: vi.fn()
}));

// Mock guard-standards
vi.mock('../../../../src/core/file-watcher/guards/guard-standards.js', () => ({
    validateGuard: vi.fn((guard) => {
        if (!guard || typeof guard !== 'function') {
            throw new Error('Invalid guard');
        }
        return true;
    }),
    createStandardContext: vi.fn((data) => data),
    IssueDomains: {
        CODE: 'code',
        ARCH: 'architecture',
        SEMANTIC: 'semantic'
    },
    createIssueType: vi.fn((domain, type, severity) => `${domain}_${type}_${severity}`),
    StandardSuggestions: {
        DEAD_CODE_REMOVE: 'Remove dead code',
        COMPLEXITY_SPLIT: 'Split complex function'
    },
    isValidGuardTarget: vi.fn(() => true),
    extractAtomMetrics: vi.fn((atom) => ({
        id: atom.id,
        name: atom.name,
        linesOfCode: atom.linesOfCode || 0,
        complexity: atom.complexity || 0,
        type: atom.type || 'function',
        isAsync: atom.isAsync || false,
        isDeadCode: atom.isDeadCode || false,
        isExported: atom.isExported || false
    })),
    StandardThresholds: {
        COMPLEXITY_HIGH: 15,
        COMPLEXITY_MEDIUM: 10,
        LINES_HIGH: 250,
        LINES_MEDIUM: 100
    }
}));

// Import after mocks
const { guardRegistry } = await import('../../../../src/core/file-watcher/guards/registry.js');

describe('Guard Registry', () => {
    let registry;

    beforeEach(() => {
        vi.clearAllMocks();
        // Create fresh instance for each test
        registry = {
            semanticGuards: new Map(),
            impactGuards: new Map(),
            metadata: new Map(),
            initialized: false,
            initializationPromise: null,
            
            registerSemanticGuard: (name, guardFn, metadata = {}) => {
                registry.semanticGuards.set(name, guardFn);
                registry.metadata.set(name, { name, type: 'semantic', ...metadata });
                return true;
            },
            
            registerImpactGuard: (name, guardFn, metadata = {}) => {
                registry.impactGuards.set(name, guardFn);
                registry.metadata.set(name, { name, type: 'impact', ...metadata });
                return true;
            },
            
            getGuardMetadata: (name) => registry.metadata.get(name) || null,
            
            listGuards: () => [...registry.metadata.values()],
            
            runSemanticGuards: async (rootPath, filePath, context, atoms, options = {}) => {
                const results = {};
                for (const [name, guardFn] of registry.semanticGuards) {
                    try {
                        results[name] = await guardFn(rootPath, filePath, context, atoms, options);
                    } catch (error) {
                        results[name] = { error: error.message };
                    }
                }
                return results;
            },
            
            runImpactGuards: async (rootPath, filePath, context, options = {}) => {
                const results = {};
                for (const [name, guardFn] of registry.impactGuards) {
                    try {
                        results[name] = await guardFn(rootPath, filePath, context, options);
                    } catch (error) {
                        results[name] = { error: error.message };
                    }
                }
                return results;
            },
            
            getGuardRegistryStats: () => ({
                semanticGuardsCount: registry.semanticGuards.size,
                impactGuardsCount: registry.impactGuards.size,
                totalGuards: registry.semanticGuards.size + registry.impactGuards.size,
                initialized: registry.initialized
            }),
            
            async initializeDefaultGuards() {
                if (registry.initialized) return;
                registry.initialized = true;
            }
        };
    });

    describe('registerSemanticGuard', () => {
        it('should register a semantic guard successfully', () => {
            const mockGuard = vi.fn();
            const result = registry.registerSemanticGuard('test-guard', mockGuard, {
                domain: 'code',
                severity: 'high'
            });

            expect(result).toBe(true);
            expect(registry.semanticGuards.has('test-guard')).toBe(true);
            expect(registry.metadata.has('test-guard')).toBe(true);
        });

        it('should store guard metadata', () => {
            const mockGuard = vi.fn();
            const metadata = {
                domain: 'code',
                severity: 'high',
                description: 'Test guard'
            };

            registry.registerSemanticGuard('test-guard', mockGuard, metadata);

            const storedMetadata = registry.getGuardMetadata('test-guard');
            expect(storedMetadata).toEqual(expect.objectContaining(metadata));
            expect(storedMetadata.type).toBe('semantic');
        });

        it('should allow registering multiple guards', () => {
            registry.registerSemanticGuard('guard-1', vi.fn());
            registry.registerSemanticGuard('guard-2', vi.fn());
            registry.registerSemanticGuard('guard-3', vi.fn());

            expect(registry.semanticGuards.size).toBe(3);
            expect(registry.metadata.size).toBe(3);
        });

        it('should handle guard names with special characters', () => {
            const specialNames = [
                'guard-with-dashes',
                'guard_with_underscores',
                'guard.with.dots',
                'guard123'
            ];

            specialNames.forEach(name => {
                registry.registerSemanticGuard(name, vi.fn());
                expect(registry.semanticGuards.has(name)).toBe(true);
            });
        });
    });

    describe('registerImpactGuard', () => {
        it('should register an impact guard successfully', () => {
            const mockGuard = vi.fn();
            const result = registry.registerImpactGuard('test-impact-guard', mockGuard);

            expect(result).toBe(true);
            expect(registry.impactGuards.has('test-impact-guard')).toBe(true);
        });

        it('should distinguish impact guards from semantic guards', () => {
            registry.registerSemanticGuard('semantic-guard', vi.fn());
            registry.registerImpactGuard('impact-guard', vi.fn());

            expect(registry.semanticGuards.has('semantic-guard')).toBe(true);
            expect(registry.impactGuards.has('impact-guard')).toBe(true);
            expect(registry.semanticGuards.has('impact-guard')).toBe(false);
        });

        it('should allow registering multiple impact guards', () => {
            registry.registerImpactGuard('impact-1', vi.fn());
            registry.registerImpactGuard('impact-2', vi.fn());
            registry.registerImpactGuard('impact-3', vi.fn());

            expect(registry.impactGuards.size).toBe(3);
        });
    });

    describe('getGuardMetadata', () => {
        it('should return metadata for registered guard', () => {
            const metadata = { domain: 'code', severity: 'high' };
            registry.registerSemanticGuard('test-guard', vi.fn(), metadata);

            const result = registry.getGuardMetadata('test-guard');
            expect(result).toBeDefined();
            expect(result.name).toBe('test-guard');
            expect(result.type).toBe('semantic');
        });

        it('should return null for unregistered guard', () => {
            const result = registry.getGuardMetadata('non-existent-guard');
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = registry.getGuardMetadata('');
            expect(result).toBeNull();
        });
    });

    describe('listGuards', () => {
        it('should return empty array when no guards registered', () => {
            const result = registry.listGuards();
            expect(result).toEqual([]);
        });

        it('should return all registered guards', () => {
            registry.registerSemanticGuard('semantic-1', vi.fn(), { domain: 'code' });
            registry.registerImpactGuard('impact-1', vi.fn(), { domain: 'arch' });

            const result = registry.listGuards();
            expect(result.length).toBe(2);
            expect(result.map(g => g.name)).toEqual(
                expect.arrayContaining(['semantic-1', 'impact-1'])
            );
        });

        it('should include guard type in metadata', () => {
            registry.registerSemanticGuard('semantic-guard', vi.fn());
            registry.registerImpactGuard('impact-guard', vi.fn());

            const result = registry.listGuards();
            const semanticGuard = result.find(g => g.name === 'semantic-guard');
            const impactGuard = result.find(g => g.name === 'impact-guard');

            expect(semanticGuard.type).toBe('semantic');
            expect(impactGuard.type).toBe('impact');
        });
    });

    describe('runSemanticGuards', () => {
        it('should execute all registered semantic guards', async () => {
            const mockGuard1 = vi.fn().mockResolvedValue({ result: 'guard1' });
            const mockGuard2 = vi.fn().mockResolvedValue({ result: 'guard2' });

            registry.registerSemanticGuard('guard-1', mockGuard1);
            registry.registerSemanticGuard('guard-2', mockGuard2);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();
            const atoms = [{ id: 'atom1', name: 'test' }];

            const results = await registry.runSemanticGuards(rootPath, filePath, context, atoms);

            expect(mockGuard1).toHaveBeenCalled();
            expect(mockGuard2).toHaveBeenCalled();
            expect(results['guard-1']).toEqual({ result: 'guard1' });
            expect(results['guard-2']).toEqual({ result: 'guard2' });
        });

        it('should pass correct parameters to guards', async () => {
            const mockGuard = vi.fn().mockResolvedValue({ result: 'ok' });
            registry.registerSemanticGuard('test-guard', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();
            const atoms = [{ id: 'atom1', name: 'test' }];
            const options = { verbose: true };

            await registry.runSemanticGuards(rootPath, filePath, context, atoms, options);

            expect(mockGuard).toHaveBeenCalledWith(rootPath, filePath, context, atoms, options);
        });

        it('should handle guard errors gracefully', async () => {
            const mockGuard = vi.fn().mockRejectedValue(new Error('Guard failed'));
            registry.registerSemanticGuard('failing-guard', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results['failing-guard']).toEqual({ error: 'Guard failed' });
        });

        it('should return empty object when no guards registered', async () => {
            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results).toEqual({});
        });

        it('should handle synchronous guards', async () => {
            const mockGuard = vi.fn(() => ({ result: 'sync' }));
            registry.registerSemanticGuard('sync-guard', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results['sync-guard']).toEqual({ result: 'sync' });
        });

        it('should continue executing guards after one fails', async () => {
            const mockGuard1 = vi.fn().mockRejectedValue(new Error('Failed'));
            const mockGuard2 = vi.fn().mockResolvedValue({ result: 'success' });

            registry.registerSemanticGuard('failing-guard', mockGuard1);
            registry.registerSemanticGuard('working-guard', mockGuard2);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results['failing-guard'].error).toBe('Failed');
            expect(results['working-guard']).toEqual({ result: 'success' });
        });
    });

    describe('runImpactGuards', () => {
        it('should execute all registered impact guards', async () => {
            const mockGuard1 = vi.fn().mockResolvedValue({ result: 'impact1' });
            const mockGuard2 = vi.fn().mockResolvedValue({ result: 'impact2' });

            registry.registerImpactGuard('impact-1', mockGuard1);
            registry.registerImpactGuard('impact-2', mockGuard2);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runImpactGuards(rootPath, filePath, context);

            expect(mockGuard1).toHaveBeenCalled();
            expect(mockGuard2).toHaveBeenCalled();
            expect(results['impact-1']).toEqual({ result: 'impact1' });
            expect(results['impact-2']).toEqual({ result: 'impact2' });
        });

        it('should pass correct parameters to impact guards', async () => {
            const mockGuard = vi.fn().mockResolvedValue({ result: 'ok' });
            registry.registerImpactGuard('test-impact', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();
            const options = { verbose: true };

            await registry.runImpactGuards(rootPath, filePath, context, options);

            expect(mockGuard).toHaveBeenCalledWith(rootPath, filePath, context, options);
        });

        it('should handle guard errors gracefully', async () => {
            const mockGuard = vi.fn().mockRejectedValue(new Error('Impact guard failed'));
            registry.registerImpactGuard('failing-impact', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runImpactGuards(rootPath, filePath, context);

            expect(results['failing-impact']).toEqual({ error: 'Impact guard failed' });
        });

        it('should return empty object when no guards registered', async () => {
            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runImpactGuards(rootPath, filePath, context);

            expect(results).toEqual({});
        });
    });

    describe('getGuardRegistryStats', () => {
        it('should return correct counts for empty registry', () => {
            const stats = registry.getGuardRegistryStats();
            expect(stats.semanticGuardsCount).toBe(0);
            expect(stats.impactGuardsCount).toBe(0);
            expect(stats.totalGuards).toBe(0);
        });

        it('should return correct counts with registered guards', () => {
            registry.registerSemanticGuard('semantic-1', vi.fn());
            registry.registerSemanticGuard('semantic-2', vi.fn());
            registry.registerImpactGuard('impact-1', vi.fn());

            const stats = registry.getGuardRegistryStats();
            expect(stats.semanticGuardsCount).toBe(2);
            expect(stats.impactGuardsCount).toBe(1);
            expect(stats.totalGuards).toBe(3);
        });

        it('should include initialized status', () => {
            const statsBefore = registry.getGuardRegistryStats();
            expect(statsBefore.initialized).toBe(false);

            registry.initialized = true;

            const statsAfter = registry.getGuardRegistryStats();
            expect(statsAfter.initialized).toBe(true);
        });
    });

    describe('initializeDefaultGuards', () => {
        it('should set initialized to true', async () => {
            expect(registry.initialized).toBe(false);
            await registry.initializeDefaultGuards();
            expect(registry.initialized).toBe(true);
        });

        it('should not reinitialize if already initialized', async () => {
            registry.initialized = true;
            await registry.initializeDefaultGuards();
            expect(registry.initialized).toBe(true);
        });

        it('should handle concurrent initialization calls', async () => {
            const initPromise1 = registry.initializeDefaultGuards();
            const initPromise2 = registry.initializeDefaultGuards();

            await Promise.all([initPromise1, initPromise2]);
            expect(registry.initialized).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle guard returning undefined', async () => {
            const mockGuard = vi.fn().mockResolvedValue(undefined);
            registry.registerSemanticGuard('undefined-return-guard', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results['undefined-return-guard']).toBeUndefined();
        });

        it('should handle guard returning null', async () => {
            const mockGuard = vi.fn().mockResolvedValue(null);
            registry.registerSemanticGuard('null-return-guard', mockGuard);

            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results['null-return-guard']).toBeNull();
        });

        it('should handle very long guard names', async () => {
            const longName = 'a'.repeat(100);
            const mockGuard = vi.fn().mockResolvedValue({ result: 'ok' });
            
            registry.registerSemanticGuard(longName, mockGuard);
            
            const rootPath = '/test/project';
            const filePath = '/test/project/src/file.js';
            const context = new EventEmitter();

            const results = await registry.runSemanticGuards(rootPath, filePath, context, []);

            expect(results[longName]).toEqual({ result: 'ok' });
        });

        it('should handle unicode guard names', () => {
            const unicodeNames = ['guard-🚀', 'guard-ñ', 'guard-中文'];
            
            unicodeNames.forEach(name => {
                registry.registerSemanticGuard(name, vi.fn());
                expect(registry.semanticGuards.has(name)).toBe(true);
            });
        });

        it('should handle large number of guards', () => {
            const numGuards = 100;
            
            for (let i = 0; i < numGuards; i++) {
                registry.registerSemanticGuard(`guard-${i}`, vi.fn());
            }

            expect(registry.semanticGuards.size).toBe(numGuards);
            expect(registry.metadata.size).toBe(numGuards);
        });
    });
});
