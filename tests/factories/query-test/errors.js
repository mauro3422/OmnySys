/**
 * @fileoverview Query Test Factory - Error Scenarios
 */

/**
 * Error scenarios for testing error handling
 */
export class ErrorScenarios {
  static fileNotFound(path) {
    return new Error(`ENOENT: no such file or directory, open '${path}'`);
  }

  static invalidJSON(path) {
    return new Error(`Failed to read ${path}: Unexpected token`);
  }

  static permissionDenied(path) {
    return new Error(`EACCES: permission denied, open '${path}'`);
  }

  static circularDependency(path) {
    return new Error(`Circular dependency detected at ${path}`);
  }
}

