/**
 * @fileoverview Parser Test Factory - Mocks
 */

export class MockFactory {
  static createMockFileSystem(files) {
    return {
      readFile: async (path) => {
        if (files[path]) {
          return files[path];
        }
        throw new Error('ENOENT: no such file or directory, open ' + path);
      },
      exists: async (path) => path in files
    };
  }

  static createMockParserOptions(overrides = {}) {
    return {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: ['jsx', 'typescript'],
      ...overrides
    };
  }
}

