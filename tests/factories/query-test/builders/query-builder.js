/**
 * @fileoverview Query Builder
 * Builder for creating query test scenarios
 */

import { ProjectDataBuilder } from './project-data-builder.js';
import { FileDataBuilder } from './file-data-builder.js';
import { ConnectionBuilder } from './connection-builder.js';

export class QueryBuilder {
  constructor() {
    this.projectRoot = '/test/project';
    this.files = new Map();
    this.connections = { sharedState: [], eventListeners: [], total: 0 };
    this.risks = {
      report: {
        summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 0 },
        criticalRiskFiles: [],
        highRiskFiles: [],
        mediumRiskFiles: []
      },
      scores: {}
    };
    this.metadata = null;
  }

  static create() {
    return new QueryBuilder();
  }

  atProjectRoot(root) {
    this.projectRoot = root;
    return this;
  }

  withFile(filePath, fileData) {
    const builder = fileData instanceof FileDataBuilder 
      ? fileData 
      : FileDataBuilder.create(filePath).withMetadata(fileData || {});
    this.files.set(filePath, builder.build());
    return this;
  }

  withFiles(fileMap) {
    for (const [path, data] of Object.entries(fileMap)) {
      this.withFile(path, data);
    }
    return this;
  }

  withConnections(connectionBuilder) {
    if (connectionBuilder instanceof ConnectionBuilder) {
      this.connections = connectionBuilder.build();
    } else {
      this.connections = connectionBuilder;
    }
    return this;
  }

  withRisks(risks) {
    this.risks = { ...this.risks, ...risks };
    return this;
  }

  withMetadata(metadata) {
    this.metadata = metadata;
    return this;
  }

  build() {
    return {
      projectRoot: this.projectRoot,
      files: Object.fromEntries(this.files),
      connections: this.connections,
      risks: this.risks,
      metadata: this.metadata || ProjectDataBuilder.create()
        .withProjectRoot(this.projectRoot)
        .withFiles(Array.from(this.files.keys()))
        .build()
    };
  }
}
