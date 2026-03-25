/**
 * @fileoverview dead-code-guard.test.js
 * 
 * Unit tests for dead-code-guard.js
 * Tests dead code detection for functions without callers
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
    buildDeadCodeRemediation: vi.fn((atom) => ({
        recommendedActions: ['Remove dead code', 'Verify missing wiring'],
        severity: 'medium'
    })),
    isSuspiciousDeadCodeAtom: vi.fn((atom) => {
        return !atom.isExported && (!atom.callersCount || atom.callersCount === 0);
    }),
    normalizeDeadCodeAtom: vi.fn((atom) => ({
        isExported: atom.isExported || false,
        calledBy: atom.callersCount || 0,
        calls: atom.calleesCount || 0,
        purpose: atom.purpose_type || 'UNKNOWN'
    }))
}));

// Import after mocks
const { detectDeadCode } = await import('../../../../src/core/file-watcher/guards/dead-code-guard.js');

describe('Dead Code Guard', () => {
    const rootPath = '/test/project';
    const filePath = '/test/project/src/test/file.js';
    let EventEmitterContext;

    beforeEach(() => {
        vi.clearAllMocks();
        EventEmitterContext = new EventEmitter();
        EventEmitterContext.emit = vi.fn();
    });

    describe('detectDeadCode', () => {
        it('should return empty array when no atoms provided', async () => {
            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, []);
            expect(result).toEqual([]);
            expect(EventEmitterContext.emit).not.toHaveBeenCalled();
        });

        it('should return empty array when atoms is null', async () => {
            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, null);
            expect(result).toEqual([]);
        });

        it('should detect dead code - non-exported function without callers', async () => {
            const atoms = [
                {
                    id: 'src/file.js::unusedFunction',
                    name: 'unusedFunction',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 25,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('low');
            expect(result[0].atomName).toBe('unusedFunction');
        });

        it('should detect dead code - exported but unused function', async () => {
            const atoms = [
                {
                    id: 'src/file.js::exportedButUnused',
                    name: 'exportedButUnused',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    linesOfCode: 30,
                    isExported: true,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].context.extraData.isExported).toBe(true);
        });

        it('should classify severity as medium for functions > 20 lines', async () => {
            const atoms = [
                {
                    id: 'src/file.js::largeDeadFunction',
                    name: 'largeDeadFunction',
                    type: 'function',
                    purpose_type: 'INTERNAL_HELPER',
                    linesOfCode: 35,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('medium');
        });

        it('should classify severity as low for functions <= 20 lines', async () => {
            const atoms = [
                {
                    id: 'src/file.js::smallDeadFunction',
                    name: 'smallDeadFunction',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 10,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].severity).toBe('low');
        });

        it('should not report functions with callers', async () => {
            const atoms = [
                {
                    id: 'src/file.js::usedFunction',
                    name: 'usedFunction',
                    type: 'function',
                    purpose_type: 'INTERNAL_HELPER',
                    linesOfCode: 20,
                    isExported: false,
                    callersCount: 3,
                    calleesCount: 1
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
        });

        it('should respect minLines threshold', async () => {
            const atoms = [
                {
                    id: 'src/file.js::tinyDeadFunction',
                    name: 'tinyDeadFunction',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 3,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { 
                verbose: false,
                minLines: 5
            });

            expect(result).toEqual([]);
        });

        it('should emit code:dead-code event when issues found', async () => {
            const atoms = [
                {
                    id: 'src/file.js::deadFunction',
                    name: 'deadFunction',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 25,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(EventEmitterContext.emit).toHaveBeenCalledWith(
                'code:dead-code',
                expect.objectContaining({
                    filePath: filePath,
                    totalIssues: 1,
                    low: 1
                })
            );
        });

        it('should handle multiple dead code atoms', async () => {
            const atoms = [
                {
                    id: 'src/file.js::deadFunction1',
                    name: 'deadFunction1',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 25,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                },
                {
                    id: 'src/file.js::deadFunction2',
                    name: 'deadFunction2',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 30,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(2);
            expect(EventEmitterContext.emit).toHaveBeenCalledWith(
                'code:dead-code',
                expect.objectContaining({
                    totalIssues: 2,
                    medium: 1,
                    low: 1
                })
            );
        });

        it('should clear issues when no dead code found', async () => {
            const atoms = [
                {
                    id: 'src/file.js::usedFunction',
                    name: 'usedFunction',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    linesOfCode: 20,
                    isExported: true,
                    callersCount: 5,
                    calleesCount: 2
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
            expect(mockClearWatcherIssue).toHaveBeenCalledWith(rootPath, filePath, 'code_dead_code_medium');
            expect(mockClearWatcherIssue).toHaveBeenCalledWith(rootPath, filePath, 'code_dead_code_low');
        });

        it('should handle arrow functions', async () => {
            const atoms = [
                {
                    id: 'src/file.js::unusedArrow',
                    name: 'unusedArrow',
                    type: 'arrow',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 15,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].context.extraData.functionType).toBe('arrow');
        });

        it('should handle class methods', async () => {
            const atoms = [
                {
                    id: 'src/file.js::Class#unusedMethod',
                    name: 'Class#unusedMethod',
                    type: 'method',
                    purpose_type: 'CLASS_METHOD',
                    linesOfCode: 20,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
            expect(result[0].context.extraData.functionType).toBe('method');
        });

        it('should handle async functions', async () => {
            const atoms = [
                {
                    id: 'src/file.js::unusedAsync',
                    name: 'unusedAsync',
                    type: 'function',
                    purpose_type: 'PRIVATE_HELPER',
                    linesOfCode: 25,
                    isAsync: true,
                    isExported: false,
                    callersCount: 0,
                    calleesCount: 0
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toHaveLength(1);
        });

        it('should handle errors gracefully', async () => {
            const atoms = [
                {
                    id: 'src/file.js::function',
                    name: 'function',
                    type: 'function',
                    purpose_type: 'API_EXPORT',
                    linesOfCode: 'invalid',
                    isExported: false
                }
            ];

            const result = await detectDeadCode(rootPath, filePath, EventEmitterContext, atoms, { verbose: false });

            expect(result).toEqual([]);
        });
    });
});
