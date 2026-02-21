/**
 * @fileoverview Mock FileSystem
 * Mock factory for filesystem operations
 */

export class MockFileSystem {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
  }

  static create() {
    return new MockFileSystem();
  }

  withFile(path, content) {
    this.files.set(path, typeof content === 'string' ? content : JSON.stringify(content));
    return this;
  }

  withDirectory(path) {
    this.directories.add(path);
    return this;
  }

  withJSON(path, data) {
    return this.withFile(path, JSON.stringify(data, null, 2));
  }

  exists(path) {
    return this.files.has(path) || this.directories.has(path);
  }

  readFile(path) {
    return this.files.get(path) || null;
  }

  readJSON(path) {
    const content = this.readFile(path);
    return content ? JSON.parse(content) : null;
  }

  build() {
    return {
      exists: (path) => this.exists(path),
      readFile: (path) => this.readFile(path),
      readJSON: (path) => this.readJSON(path),
      files: Object.fromEntries(this.files),
      directories: Array.from(this.directories)
    };
  }
}
