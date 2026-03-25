/**
 * @fileoverview circular-guard.test.js
 * 
 * Unit tests for circular-guard.js
 * Tests circular dependency detection at module and function level
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';

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

// Mock circular-issue-service
vi.mock('../../../../src/core/file-watcher/guards/circular-issue-service.js', () => ({
    persistCircularIssue: mockPersistWatcherIssue,
    clearCircularIssues: mockClearWatcherIssue
}));

// Mock shared compiler utilities
vi.mock('../../../../src/shared/compiler/index.js', () => ({
    safeArray: vi.fn((arr) => Array.isArray(arr) ? arr : []),
    classifyCircularCycle: vi.fn((filePath, cycle, names) => {
        if (names.some(n => n.includes('init') || n.includes('start'))) {
            return 'lifecycle';
        }
        if (names.some(n => n.match(/^[A-Z]/))) {
            return 'algorithmic';
        }
        return 'functional';
    })
}));

// Mock path
vi.mock('path', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: {
            ...actual.default,
            relative: vi.fn((from, to) => to.replace(from, '').replace(/^\\/, '').replace(/^\//, ''))
        }
    };
});

// Mock normalizePath
vi.mock('../../../../src/shared/utils/path-utils.js', () => ({
    normalizePath: vi.fn((p) => p.replace(/\\/g, '/'))
}));

// Mock cycle detector
vi.mock('../../../../src/layer-graph/algorithms/cycle-detector.js', () => ({
    detectCycles: vi.fn((graph) => {
        // Simple cycle detection for testing
        const cycles = [];
        const visited = new Set();
        const recStack = new Set();

        function dfs(node, path) {
            if (recStack.has(node)) {
                const cycleStart = path.indexOf(node);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart));
                }
                return;
            }
            if (visited.has(node)) return;

            visited.add(node);
            recStack.add(node);
            path.push(node);

            const deps = graph[node]?.dependsOn || [];
            for (const dep of deps) {
                dfs(dep, [...path]);
            }

            recStack.delete(node);
        }

        for (const node of Object.keys(graph)) {
            dfs(node, []);
        }

        return cycles;
    })
}));

// Import after mocks
const { detectCircularDependencies, detectCircularImportsForFile } = await import('../../../../src/core/file-watcher/guards/circular-guard.js');

describe('Circular Guard', () => {
    const rootPath = '/test/project';
    const filePath = '/test/project/src/test/file.js';
    let mockDb;
    let EventEmitterContext;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockDb = new Database(':memory:');
        mockDb.exec(`
            CREATE TABLE files (
                path TEXT PRIMARY KEY,
                imports_json TEXT
            );
            CREATE TABLE atoms (
                id TEXT PRIMARY KEY,
                name TEXT,
                file_path TEXT,
                calls_json TEXT,
                called_by_json TEXT
            );
            CREATE TABLE atom_calls (
                source_id TEXT,
                target_id TEXT
            );
        `);

        EventEmitterContext = new EventEmitter();
        EventEmitterContext.emit = vi.fn();
    });

    afterEach(() => {
        if (mockDb) {
            mockDb.close();
        }
    });

    describe('detectCircularDependencies', () => {
        it('should return null when no repo provided', async () => {
            const result = await detectCircularDependencies(rootPath, filePath, null);
            expect(result).toBeNull();
        });

        it('should return null when no db connection', async () => {
            const mockRepo = { db: null };
            const result = await detectCircularDependencies(rootPath, filePath, mockRepo);
            expect(result).toBeNull();
        });

        it('should detect file-level circular dependency', async () => {
            // Insert test data
            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[{"type": "local", "resolved": "src/test/file2.js"}]'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file1.js"}]')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file1.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result).toBeDefined();
            expect(result.fileCycle).toBeDefined();
            expect(result.fileCycle.length).toBeGreaterThan(0);
        });

        it('should return null when no circular dependencies', async () => {
            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[{"type": "local", "resolved": "src/test/file2.js"}]'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file3.js"}]'),
                    ('src/test/file3.js', '[]')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file1.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result.fileCycle).toBeNull();
        });

        it('should detect functional recursion', async () => {
            mockDb.exec(`
                INSERT INTO atoms (id, name, file_path, calls_json, called_by_json) VALUES
                    ('src/test/file.js::functionA', 'functionA', 'src/test/file.js', 
                     '["src/test/file.js::functionB"]', '["src/test/file.js::functionB"]'),
                    ('src/test/file.js::functionB', 'functionB', 'src/test/file.js',
                     '["src/test/file.js::functionA"]', '["src/test/file.js::functionA"]')
            `);

            mockDb.exec(`
                INSERT INTO atom_calls (source_id, target_id) VALUES
                    ('src/test/file.js::functionA', 'src/test/file.js::functionB'),
                    ('src/test/file.js::functionB', 'src/test/file.js::functionA')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result).toBeDefined();
        });

        it('should ignore algorithmic recursion (intentional)', async () => {
            mockDb.exec(`
                INSERT INTO atoms (id, name, file_path, calls_json, called_by_json) VALUES
                    ('src/test/file.js::recursiveSort', 'recursiveSort', 'src/test/file.js',
                     '["src/test/file.js::recursiveSort"]', '["src/test/file.js::recursiveSort"]')
            `);

            mockDb.exec(`
                INSERT INTO atom_calls (source_id, target_id) VALUES
                    ('src/test/file.js::recursiveSort', 'src/test/file.js::recursiveSort')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            // Should detect but classify as algorithmic (ignored)
            expect(mockClearWatcherIssue).toHaveBeenCalled();
        });

        it('should handle lifecycle loops', async () => {
            mockDb.exec(`
                INSERT INTO atoms (id, name, file_path, calls_json, called_by_json) VALUES
                    ('src/test/file.js::initConnection', 'initConnection', 'src/test/file.js',
                     '["src/test/file.js::startConnection"]', '["src/test/file.js::startConnection"]'),
                    ('src/test/file.js::startConnection', 'startConnection', 'src/test/file.js',
                     '["src/test/file.js::initConnection"]', '["src/test/file.js::initConnection"]')
            `);

            mockDb.exec(`
                INSERT INTO atom_calls (source_id, target_id) VALUES
                    ('src/test/file.js::initConnection', 'src/test/file.js::startConnection'),
                    ('src/test/file.js::startConnection', 'src/test/file.js::initConnection')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result).toBeDefined();
            expect(result.atomCycle).toBeDefined();
        });

        it('should ignore infrastructure leaf cycles', async () => {
            mockDb.exec(`
                INSERT INTO atoms (id, name, file_path, calls_json, called_by_json, 
                                   type, purpose_type, risk_level, centrality_classification, 
                                   callers_count, callees_count) VALUES
                    ('src/storage/cache/CacheOperation.class', 'CacheOperation', 
                     'src/storage/cache/CacheOperation.class', '[]', '[]',
                     'class', 'FACTORY', 'LOW', 'LEAF', 0, 0)
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/storage/cache/CacheOperation.class';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result).toBeDefined();
        });

        it('should handle malformed imports_json gracefully', async () => {
            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', 'invalid json'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file1.js"}]')
            `);

            const mockRepo = { db: mockDb };
            const testFilePath = '/test/project/src/test/file1.js';

            const result = await detectCircularDependencies(rootPath, testFilePath, mockRepo);

            expect(result).toBeDefined();
        });
    });

    describe('detectCircularImportsForFile', () => {
        it('should return null when no repo provided', async () => {
            const result = await detectCircularImportsForFile(rootPath, filePath, EventEmitterContext);
            expect(result).toBeNull();
        });

        it('should return empty array when no circular imports', async () => {
            const mockGetRepository = vi.fn(() => ({
                db: mockDb
            }));

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[{"type": "local", "resolved": "src/test/file2.js"}]'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file3.js"}]'),
                    ('src/test/file3.js', '[]')
            `);

            const { detectCircularImportsForFile: detectFn } = await import('../../../src/core/file-watcher/guards/circular-guard.js');
            const result = await detectFn(rootPath, '/test/project/src/test/file1.js', EventEmitterContext);

            expect(result).toEqual([]);
        });

        it('should detect circular imports', async () => {
            const mockGetRepository = vi.fn(() => ({
                db: mockDb
            }));

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[{"type": "local", "resolved": "src/test/file2.js"}]'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file1.js"}]')
            `);

            const { detectCircularImportsForFile: detectFn } = await import('../../../src/core/file-watcher/guards/circular-guard.js');
            const result = await detectFn(rootPath, '/test/project/src/test/file1.js', EventEmitterContext);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(EventEmitterContext.emit).toHaveBeenCalledWith(
                'arch:circular',
                expect.objectContaining({
                    filePath: '/test/project/src/test/file1.js'
                })
            );
        });

        it('should respect maxDepth option', async () => {
            const mockGetRepository = vi.fn(() => ({
                db: mockDb
            }));

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[{"type": "local", "resolved": "src/test/file2.js"}]'),
                    ('src/test/file2.js', '[{"type": "local", "resolved": "src/test/file3.js"}]'),
                    ('src/test/file3.js', '[{"type": "local", "resolved": "src/test/file4.js"}]'),
                    ('src/test/file4.js', '[{"type": "local", "resolved": "src/test/file1.js"}]')
            `);

            const { detectCircularImportsForFile: detectFn } = await import('../../../src/core/file-watcher/guards/circular-guard.js');
            const result = await detectFn(rootPath, '/test/project/src/test/file1.js', EventEmitterContext, { maxDepth: 2 });

            // Should not find cycle because it's deeper than maxDepth
            expect(result).toEqual([]);
        });

        it('should clear issues when no cycles found', async () => {
            const mockGetRepository = vi.fn(() => ({
                db: mockDb
            }));

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            mockDb.exec(`
                INSERT INTO files (path, imports_json) VALUES 
                    ('src/test/file1.js', '[]')
            `);

            const { detectCircularImportsForFile: detectFn } = await import('../../../src/core/file-watcher/guards/circular-guard.js');
            await detectFn(rootPath, '/test/project/src/test/file1.js', EventEmitterContext);

            expect(mockClearWatcherIssue).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const mockGetRepository = vi.fn(() => ({
                db: mockDb
            }));

            vi.doMock('#layer-c/storage/repository/index.js', () => ({
                getRepository: mockGetRepository
            }));

            const { detectCircularImportsForFile: detectFn } = await import('../../../src/core/file-watcher/guards/circular-guard.js');
            const result = await detectFn(rootPath, '/test/project/src/test/file1.js', EventEmitterContext);

            expect(result).toBeNull();
        });
    });
});
