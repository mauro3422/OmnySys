/**
 * @fileoverview Pipeline Test Factory - Helpers
 */

export function createMockFileSystem(files = {}) {
  const fileMap = new Map(Object.entries(files));
  
  return {
    readFile: vi.fn(async (path) => {
      if (fileMap.has(path)) {
        return fileMap.get(path);
      }
      throw new Error(`ENOENT: ${path}`);
    }),
    writeFile: vi.fn(async (path, content) => {
      fileMap.set(path, content);
    }),
    mkdir: vi.fn(async () => {}),
    access: vi.fn(async (path) => {
      if (!fileMap.has(path)) {
        throw new Error(`ENOENT: ${path}`);
      }
    }),
    stat: vi.fn(async (path) => ({
      isFile: () => fileMap.has(path),
      isDirectory: () => false,
      mtime: new Date()
    })),
    readdir: vi.fn(async () => []),
    _files: fileMap
  };
}

export function createMockLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  };
}

export function createMockPhase(name = 'MockPhase', canExecute = true) {
  return {
    name,
    canExecute: vi.fn(() => canExecute),
    execute: vi.fn(async (context) => context),
    handleError: vi.fn((error, context) => context)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

export function createValidParsedFile(overrides = {}) {
  return {
    filePath: 'src/test.js',
    imports: [],
    exports: [],
    definitions: [],
    source: '',
    ...overrides
  };
}

export function createValidSystemMap(overrides = {}) {
  return {
    metadata: {
      totalFiles: 0,
      totalFunctions: 0,
      totalDependencies: 0,
      totalFunctionLinks: 0,
      cyclesDetected: [],
      ...overrides.metadata
    },
    files: {},
    ...overrides
  };
}

export function createValidAtom(overrides = {}) {
  return {
    id: 'atom-1',
    name: 'testFunction',
    type: 'function',
    filePath: 'src/test.js',
    startLine: 1,
    endLine: 10,
    complexity: 1,
    linesOfCode: 10,
    isExported: false,
    calls: [],
    calledBy: [],
    ...overrides
  };
}

export function createValidConnection(overrides = {}) {
  return {
    sourceFile: 'src/a.js',
    targetFile: 'src/b.js',
    type: 'import',
    confidence: 1,
    ...overrides
  };
}


