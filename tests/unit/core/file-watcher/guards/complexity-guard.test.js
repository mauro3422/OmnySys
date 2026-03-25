/**
 * @fileoverview complexity-guard.test.js
 * 
 * Unit tests for complexity-guard.js and submodules
 * Tests complexity cyclomatic and function length monitoring
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
    classifyFileOperationalRole: vi.fn((filePath) => ({
        role: filePath.includes('orchestrator') ? 'orchestrator' : 'worker',
        confidence: 0.9,
        category: 'core'
    })),
    resolveArchitecturalRecommendation: vi.fn(() => null)
}));

// Import after mocks
const { detectHighComplexity } = await import('../../../../src/core/file-watcher/guards/complexity-guard.js');
const { collectComplexityIssues } = await import('../../../../src/core/file-watcher/guards/complexity-guard/analysis.js');
const { clearComplexityIssues, persistComplexityIssues } = await import('../../../../src/core/file-watcher/guards/complexity-guard/persistence.js');

describe('Complexity Guard', () => {
    const rootPath = '/test/project';
    const filePath = '/test/project/src/test/file.js';
    let EventEmitterContext;

    beforeEach(() => {
        vi.clearAllMocks();
        EventEmitterContext = new EventEmitter();
        EventEmitterContext.emit = vi.fn();
    });

    describe('detectHighComplexity', () => {
        it('should return empty array when no atoms provided', async () => {
            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, []);
            expect(result).toEqual([]);
            expect(EventEmitterContext.emit).not.toHaveBeenCalled();
        });

        it('should return empty array when atoms is null', async () => {
            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, null);
            expect(result).toEqual([]);
        });

        it('should detect high complexity function', async () => {
            const atoms = [
                {
                    id: 'src/file.js::complexFunction',
                    name: 'complexFunction',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 25,
                    linesOfCode: 150,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].severity).toBe('high');
            expect(result[0].atomName).toBe('complexFunction');
        });

        it('should detect medium complexity function', async () => {
            const atoms = [
                {
                    id: 'src/file.js::mediumFunction',
                    name: 'mediumFunction',
                    type: 'function',
                    purpose_type: 'INTERNAL_HELPER',
                    cyclomaticComplexity: 12,
                    linesOfCode: 80,
                    isDeadCode: false,
                    isExported: false
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].severity).toBe('medium');
        });

        it('should not report low complexity functions', async () => {
            const atoms = [
                {
                    id: 'src/file.js::simpleFunction',
                    name: 'simpleFunction',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    cyclomaticComplexity: 3,
                    linesOfCode: 15,
                    isDeadCode: false,
                    isExported: false
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
        });

        it('should handle async functions', async () => {
            const atoms = [
                {
                    id: 'src/file.js::asyncHandler',
                    name: 'asyncHandler',
                    type: 'arrow',
                    purpose_type: 'NETWORK_HANDLER',
                    cyclomaticComplexity: 18,
                    linesOfCode: 100,
                    isAsync: true,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].context.extraData.isAsync).toBe(true);
        });

        it('should emit code:complexity event when issues found', async () => {
            const atoms = [
                {
                    id: 'src/file.js::complexFunction',
                    name: 'complexFunction',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 20,
                    linesOfCode: 120,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(EventEmitterContext.emit).toHaveBeenCalledWith(
                'code:complexity',
                expect.objectContaining({
                    filePath: filePath,
                    totalIssues: expect.any(Number)
                })
            );
        });

        it('should use custom thresholds when provided', async () => {
            const atoms = [
                {
                    id: 'src/file.js::function',
                    name: 'function',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 8,
                    linesOfCode: 50,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, {
                complexityHigh: 5,
                complexityMedium: 3,
                verbose: false
            });

            expect(result.length).toBeGreaterThan(0);
        });

        it('should skip atoms without valid purpose', async () => {
            const atoms = [
                {
                    id: 'src/file.js::variable',
                    name: 'config',
                    type: 'variable',
                    purpose_type: 'CONFIG',
                    cyclomaticComplexity: 0,
                    linesOfCode: 5,
                    isDeadCode: false
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
        });

        it('should handle errors gracefully', async () => {
            const atoms = [
                {
                    id: 'src/file.js::function',
                    name: 'function',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 'invalid',
                    linesOfCode: 'invalid',
                    isDeadCode: false
                }
            ];

            const result = await detectHighComplexity(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
        });
    });

    describe('collectComplexityIssues', () => {
        it('should collect complexity issues from atoms', () => {
            const atoms = [
                {
                    id: 'src/file.js::complexFunction',
                    name: 'complexFunction',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 20,
                    linesOfCode: 100,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const issues = collectComplexityIssues(filePath, atoms, {
                complexityHigh: 15,
                complexityMedium: 10,
                linesHigh: 250,
                linesMedium: 100,
                operationalRole: { role: 'worker' }
            });

            expect(issues.length).toBeGreaterThan(0);
            expect(issues[0].atomName).toBe('complexFunction');
            expect(issues[0].metricType).toBe('complexity');
        });

        it('should collect function length issues', () => {
            const atoms = [
                {
                    id: 'src/file.js::longFunction',
                    name: 'longFunction',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    cyclomaticComplexity: 5,
                    linesOfCode: 300,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const issues = collectComplexityIssues(filePath, atoms, {
                complexityHigh: 15,
                complexityMedium: 10,
                linesHigh: 250,
                linesMedium: 100,
                operationalRole: { role: 'worker' }
            });

            const lengthIssues = issues.filter(i => i.metricType === 'lines');
            expect(lengthIssues.length).toBeGreaterThan(0);
            expect(lengthIssues[0].message).toContain('300 lines');
        });

        it('should skip atoms that are not valid guard targets', () => {
            const atoms = [
                {
                    id: 'src/file.js::variable',
                    name: 'config',
                    type: 'variable',
                    purpose_type: 'CONFIG',
                    cyclomaticComplexity: 0,
                    linesOfCode: 5
                }
            ];

            const issues = collectComplexityIssues(filePath, atoms, {
                complexityHigh: 15,
                complexityMedium: 10,
                linesHigh: 250,
                linesMedium: 100,
                operationalRole: { role: 'worker' }
            });

            expect(issues).toEqual([]);
        });

        it('should provide coordinator-specific suggestions for orchestrator role', () => {
            const atoms = [
                {
                    id: 'src/file.js::orchestratorFunction',
                    name: 'orchestratorFunction',
                    type: 'function',
                    purpose_type: 'ENTRY_POINT',
                    cyclomaticComplexity: 20,
                    linesOfCode: 150,
                    isDeadCode: false,
                    isExported: true
                }
            ];

            const issues = collectComplexityIssues(filePath, atoms, {
                complexityHigh: 15,
                complexityMedium: 10,
                linesHigh: 250,
                linesMedium: 100,
                operationalRole: { role: 'orchestrator' }
            });

            expect(issues.length).toBeGreaterThan(0);
        });
    });

    describe('persistComplexityIssues', () => {
        it('should persist high severity issues', async () => {
            const issues = [
                {
                    atomId: 'src/file.js::function',
                    atomName: 'function',
                    severity: 'high',
                    issueType: 'code_complexity_high',
                    metricType: 'complexity',
                    message: 'Function has high complexity',
                    context: {
                        guardName: 'complexity-guard',
                        severity: 'high',
                        suggestedAction: 'Refactor',
                        suggestedAlternatives: ['Alternative 1'],
                        extraData: {}
                    }
                }
            ];

            const result = await persistComplexityIssues(rootPath, filePath, issues);

            expect(result.highIssues).toHaveLength(1);
            expect(result.mediumIssues).toHaveLength(0);
        });

        it('should persist medium severity issues', async () => {
            const issues = [
                {
                    atomId: 'src/file.js::function',
                    atomName: 'function',
                    severity: 'medium',
                    issueType: 'code_complexity_medium',
                    metricType: 'complexity',
                    message: 'Function has medium complexity',
                    context: {
                        guardName: 'complexity-guard',
                        severity: 'medium',
                        suggestedAction: 'Refactor',
                        suggestedAlternatives: ['Alternative 1'],
                        extraData: {}
                    }
                }
            ];

            const result = await persistComplexityIssues(rootPath, filePath, issues);

            expect(result.highIssues).toHaveLength(0);
            expect(result.mediumIssues).toHaveLength(1);
        });

        it('should handle mixed severity issues', async () => {
            const issues = [
                {
                    atomId: 'src/file.js::function1',
                    atomName: 'function1',
                    severity: 'high',
                    issueType: 'code_complexity_high',
                    metricType: 'complexity',
                    message: 'High complexity',
                    context: {
                        guardName: 'complexity-guard',
                        severity: 'high',
                        suggestedAction: 'Refactor',
                        suggestedAlternatives: ['Alternative 1'],
                        extraData: {}
                    }
                },
                {
                    atomId: 'src/file.js::function2',
                    atomName: 'function2',
                    severity: 'medium',
                    issueType: 'code_complexity_medium',
                    metricType: 'complexity',
                    message: 'Medium complexity',
                    context: {
                        guardName: 'complexity-guard',
                        severity: 'medium',
                        suggestedAction: 'Refactor',
                        suggestedAlternatives: ['Alternative 1'],
                        extraData: {}
                    }
                }
            ];

            const result = await persistComplexityIssues(rootPath, filePath, issues);

            expect(result.highIssues).toHaveLength(1);
            expect(result.mediumIssues).toHaveLength(1);
        });

        it('should clear issues when no high/medium issues', async () => {
            const issues = [
                {
                    atomId: 'src/file.js::function',
                    atomName: 'function',
                    severity: 'low',
                    issueType: 'code_complexity_low',
                    metricType: 'complexity',
                    message: 'Low complexity',
                    context: {
                        guardName: 'complexity-guard',
                        severity: 'low',
                        suggestedAction: 'Refactor',
                        suggestedAlternatives: ['Alternative 1'],
                        extraData: {}
                    }
                }
            ];

            await persistComplexityIssues(rootPath, filePath, issues);

            expect(mockClearWatcherIssue).toHaveBeenCalled();
        });
    });

    describe('clearComplexityIssues', () => {
        it('should clear all complexity watcher issues', async () => {
            await clearComplexityIssues(rootPath, filePath);

            expect(mockClearWatcherIssue).toHaveBeenCalledWith(rootPath, filePath, 'code_complexity_high');
            expect(mockClearWatcherIssue).toHaveBeenCalledWith(rootPath, filePath, 'code_complexity_medium');
        });
    });
});
