/**
 * @fileoverview IssueBuilder - Builder for issues
 */

export class IssueBuilder {
  constructor() {
    this.issues = [];
  }

  addIssue(options = {}) {
    const {
      sourceFile = 'test.js',
      file = null,
      message = 'Test issue',
      severity = 'MEDIUM',
      line = 1
    } = options;

    this.issues.push({
      sourceFile,
      file,
      message,
      severity,
      line
    });
    return this;
  }

  withMultipleIssues(count, options = {}) {
    for (let i = 0; i < count; i++) {
      this.addIssue({ ...options, message: `Issue ${i + 1}` });
    }
    return this;
  }

  withMixedSeverities() {
    this.addIssue({ severity: 'HIGH', message: 'High severity issue' });
    this.addIssue({ severity: 'MEDIUM', message: 'Medium severity issue' });
    this.addIssue({ severity: 'LOW', message: 'Low severity issue' });
    return this;
  }

  build() {
    return this.issues;
  }

  static create() {
    return new IssueBuilder();
  }
}
