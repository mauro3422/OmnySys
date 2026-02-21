/**
 * @fileoverview Project Data Builder
 * Builder for creating project metadata structures
 */

export class ProjectDataBuilder {
  constructor() {
    this.metadata = {
      version: '1.0.0',
      analyzedAt: new Date().toISOString(),
      projectRoot: '/test/project',
      config: {}
    };
    this.files = [];
    this.fileIndex = {};
    this.stats = {
      totalFiles: 0,
      totalAtoms: 0,
      totalConnections: 0
    };
  }

  static create() {
    return new ProjectDataBuilder();
  }

  withVersion(version) {
    this.metadata.version = version;
    return this;
  }

  withProjectRoot(root) {
    this.metadata.projectRoot = root;
    return this;
  }

  withAnalyzedAt(date) {
    this.metadata.analyzedAt = date instanceof Date ? date.toISOString() : date;
    return this;
  }

  withConfig(config) {
    this.metadata.config = { ...this.metadata.config, ...config };
    return this;
  }

  withFile(filePath, fileData = {}) {
    this.files.push(filePath);
    this.fileIndex[filePath] = {
      hash: fileData.hash || `hash-${Date.now()}`,
      lastModified: fileData.lastModified || new Date().toISOString(),
      size: fileData.size || 0,
      ...fileData
    };
    this.stats.totalFiles = this.files.length;
    return this;
  }

  withFiles(filePaths) {
    for (const path of filePaths) {
      this.withFile(path);
    }
    return this;
  }

  withStats(stats) {
    this.stats = { ...this.stats, ...stats };
    return this;
  }

  build() {
    return {
      metadata: this.metadata,
      files: this.files,
      fileIndex: this.fileIndex,
      stats: this.stats
    };
  }
}
