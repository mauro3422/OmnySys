/**
 * @fileoverview unified-duplicate-guard.test.js
 * 
 * Unit tests for unified-duplicate-guard.js
 * Tests unified detection of structural (DNA) and conceptual duplicates
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
const mockPersistWatcherIssue = vi.fn();
const mockClearWatcherIssue = vi.fn();

vi.mock('../../../../src/core/file-watcher/watcher-issue-persistence.js', () => ({
    persistWatcherIssue: mockPersistWatcherIssue,
    clearWatcherIssue: mockClearWatcherIssue
}));

// Mock shared compiler utilities
vi.mock('../../../../src/shared/compiler/index.js', () => ({
    isCanonicalDuplicateSignalPolicyFile: vi.fn((filePath) => {
        return filePath.includes('.omnysysdata') || filePath.includes('duplicate-signal');
    }),
    summarizeAtomTestability: vi.fn((atoms) => ({
        severity: atoms.length > 5 ? 'high' : 'medium',
        coverage: 0.8
    }))
}));

// Mock guard-standards
vi.mock('../../../../src/core/file-watcher/guards/guard-standards.js', () => ({
    isLowSignalName: vi.fn((name) => name.startsWith('_') || name.startsWith('util'))
}));

// Mock structural core
vi.mock('../../../../src/core/file-watcher/guards/duplicate-structural-core.js', () => ({
    buildStructuralFindings: vi.fn((localAtoms, duplicateRows, filePath, maxFindings) => {
        return localAtoms.map(atom => ({
            type: 'structural',
            atomId: atom.id,
            atomName: atom.name,
            severity: 'high',
            duplicates: duplicateRows.length
        }));
    }),
    collectCandidateDnas: vi.fn((localAtoms, filePath, isLowSignalName) => {
        return localAtoms
            .filter(atom => atom.dna && !isLowSignalName(atom.name))
            .map(atom => atom.dna);
    }),
    loadStructuralDuplicateRows: vi.fn((repo, candidateDnas, filePath, duplicateKeySql) => {
        return candidateDnas.map(dna => ({
            dna: dna,
            matching_atoms: [{ id: 'other::atom', name: 'similarAtom' }]
        }));
    }),
    loadStructuralLocalAtoms: vi.fn(({ repo, normalizedFilePath, providedAtoms, minLinesOfCode, maxFindings }) => {
        if (providedAtoms) {
            return providedAtoms.filter(atom => atom.linesOfCode >= minLinesOfCode);
        }
        return [];
    })
}));

// Mock conceptual core
vi.mock('../../../../src/core/file-watcher/guards/duplicate-conceptual-core.js', () => ({
    loadConceptualLocalAtoms: vi.fn((repo, normalizedFilePath, minLinesOfCode) => {
        return [];
    }),
    detectConceptualFindings: vi.fn(async (repo, filePath, localAtoms, maxFindings, isLowSignalName, testabilitySeverity, rootPath) => {
        return localAtoms
            .filter(atom => atom.semanticFingerprint)
            .map(atom => ({
                type: 'conceptual',
                atomId: atom.id,
                atomName: atom.name,
                severity: testabilitySeverity,
                semanticFingerprint: atom.semanticFingerprint
            }));
    })
}));

// Mock persistence
vi.mock('../../../../src/core/file-watcher/guards/unified-duplicate-guard-persistence.js', () => ({
    persistUnifiedFinding: vi.fn()
}));

// Mock helpers
vi.mock('../../../../src/core/file-watcher/guards/unified-duplicate-guard-helpers.js', () => ({
    clearUnifiedDuplicateIssues: vi.fn(),
    normalizeUnifiedDuplicateFilePath: vi.fn((filePath) => filePath.replace(/\\/g, '/')),
    loadUnifiedPreviousFindings: vi.fn((repo, filePath) => []),
    buildUnifiedDebtHistory: vi.fn((filePath, findings, previous) => ({
        newFindings: findings.length,
        resolvedFindings: 0,
        totalDebt: findings.length
    })),
    coordinateUnifiedDuplicateFindings: vi.fn((structural, conceptual) => ({
        totalFindings: structural.length + conceptual.length,
        structuralCount: structural.length,
        conceptualCount: conceptual.length,
        priority: structural.length > 0 ? 'structural' : 'conceptual'
    }))
}));

// Import after mocks
const { detectUnifiedDuplicateRisk } = await import('../../../../src/core/file-watcher/guards/unified-duplicate-guard.js');

describe('Unified Duplicate Guard', () => {
    const rootPath = '/test/project';
    const filePath = '/test/project/src/test/file.js';
    let EventEmitterContext;
    let mockRepo;

    beforeEach(() => {
        vi.clearAllMocks();
        EventEmitterContext = new EventEmitter();
        EventEmitterContext.emit = vi.fn();
        
        mockRepo = {
            db: {},
            projectPath: rootPath
        };
    });

    describe('detectUnifiedDuplicateRisk', () => {
        it('should return empty results when no atoms provided', async () => {
            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: vi.fn(() => mockRepo)
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {});

            expect(result).toEqual({
                structural: [],
                conceptual: [],
                coordinated: null
            });
        });

        it('should skip canonical duplicate signal policy files', async () => {
            const policyFilePath = '/test/project/.omnysysdata/duplicate-signal.json';

            const result = await detectUnifiedDuplicateRisk(rootPath, policyFilePath, EventEmitterContext, {});

            expect(result).toEqual({
                structural: [],
                conceptual: [],
                coordinated: null
            });
            expect(mockClearWatcherIssue).not.toHaveBeenCalled();
        });

        it('should return empty when no repo available', async () => {
            const mockGetRepository = vi.fn(() => null);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {});

            expect(result).toEqual({
                structural: [],
                conceptual: [],
                coordinated: null
            });
        });

        it('should detect structural duplicates', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                },
                {
                    id: 'src/file.js::functionB',
                    name: 'functionB',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: false
            });

            expect(result.structural.length).toBeGreaterThan(0);
        });

        it('should detect conceptual duplicates', async () => {
            const atoms = [
                {
                    id: 'src/file.js::handler1',
                    name: 'handler1',
                    semanticFingerprint: 'handle:request:validate',
                    linesOfCode: 30
                },
                {
                    id: 'src/file.js::handler2',
                    name: 'handler2',
                    semanticFingerprint: 'handle:request:validate',
                    linesOfCode: 35
                }
            ];

            const { loadConceptualLocalAtoms } = await import('../../../src/core/file-watcher/guards/duplicate-conceptual-core.js');
            loadConceptualLocalAtoms.mockReturnValue(atoms);

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: false,
                enableConceptual: true
            });

            expect(result.conceptual.length).toBeGreaterThan(0);
        });

        it('should detect both structural and conceptual duplicates', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    semanticFingerprint: 'process:data:transform',
                    linesOfCode: 25
                }
            ];

            const { loadConceptualLocalAtoms } = await import('../../../src/core/file-watcher/guards/duplicate-conceptual-core.js');
            loadConceptualLocalAtoms.mockReturnValue(atoms);

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: true
            });

            expect(result.structural.length).toBeGreaterThan(0);
            expect(result.conceptual.length).toBeGreaterThan(0);
            expect(result.totalFindings).toBeGreaterThan(0);
        });

        it('should respect enableStructural option', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: false,
                enableConceptual: false
            });

            expect(result.structural).toEqual([]);
            expect(result.conceptual).toEqual([]);
        });

        it('should respect maxFindings option', async () => {
            const atoms = Array(20).fill(null).map((_, i) => ({
                id: `src/file.js::function${i}`,
                name: `function${i}`,
                dna: `{"type":"function","complexity":${i}}`,
                linesOfCode: 20
            }));

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                maxFindings: 5,
                enableStructural: true,
                enableConceptual: false
            });

            expect(result.structural.length).toBeLessThanOrEqual(5);
        });

        it('should respect minLinesOfCode option', async () => {
            const atoms = [
                {
                    id: 'src/file.js::smallFunction',
                    name: 'smallFunction',
                    dna: '{"type":"function","complexity":2}',
                    linesOfCode: 3
                },
                {
                    id: 'src/file.js::largeFunction',
                    name: 'largeFunction',
                    dna: '{"type":"function","complexity":10}',
                    linesOfCode: 50
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                minLinesOfCode: 10,
                enableStructural: true,
                enableConceptual: false
            });

            expect(result.structural.length).toBeLessThan(atoms.length);
        });

        it('should handle errors gracefully', async () => {
            const mockGetRepository = vi.fn(() => {
                throw new Error('Database error');
            });

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {});

            expect(result.error).toBeDefined();
            expect(result.structural).toEqual([]);
            expect(result.conceptual).toEqual([]);
        });

        it('should persist findings when duplicates found', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: false
            });

            const { persistUnifiedFinding } = await import('../../../src/core/file-watcher/guards/unified-duplicate-guard-persistence.js');
            expect(persistUnifiedFinding).toHaveBeenCalled();
        });

        it('should clear issues when no duplicates found', async () => {
            const atoms = [
                {
                    id: 'src/file.js::uniqueFunction',
                    name: 'uniqueFunction',
                    dna: '{"type":"function","complexity":1}',
                    linesOfCode: 10
                }
            ];

            const { loadStructuralLocalAtoms } = await import('../../../src/core/file-watcher/guards/duplicate-structural-core.js');
            loadStructuralLocalAtoms.mockReturnValue([]);

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: false
            });

            expect(mockClearWatcherIssue).toHaveBeenCalled();
        });

        it('should build debt history', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: false
            });

            expect(result.debtHistory).toBeDefined();
            expect(result.debtHistory.newFindings).toBeGreaterThan(0);
        });

        it('should handle Windows file paths', async () => {
            const windowsFilePath = 'C:\\test\\project\\src\\file.js';
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    linesOfCode: 20
                }
            ];

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, windowsFilePath, EventEmitterContext, {
                atoms,
                enableStructural: true
            });

            expect(result).toBeDefined();
        });

        it('should coordinate findings priority', async () => {
            const atoms = [
                {
                    id: 'src/file.js::functionA',
                    name: 'functionA',
                    dna: '{"type":"function","complexity":5}',
                    semanticFingerprint: 'process:data:transform',
                    linesOfCode: 25
                }
            ];

            const { loadConceptualLocalAtoms } = await import('../../../src/core/file-watcher/guards/duplicate-conceptual-core.js');
            loadConceptualLocalAtoms.mockReturnValue(atoms);

            const mockGetRepository = vi.fn(() => mockRepo);

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const result = await detectUnifiedDuplicateRisk(rootPath, filePath, EventEmitterContext, {
                atoms,
                enableStructural: true,
                enableConceptual: true
            });

            expect(result.coordinated).toBeDefined();
            expect(result.coordinated.priority).toBe('structural');
        });
    });
});
