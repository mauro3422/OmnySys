/**
 * @fileoverview Base Builder
 * 
 * Provides standard builder methods like `withFile` to reduce conceptual duplicates
 * across the test factory ecosystem.
 */

export class BaseBuilder {
  constructor() {
    this.files = {};
  }

  /**
   * Adds a file to the builder's file registry.
   * Can be overridden by subclasses if they need different storage (e.g. Array vs Object).
   * 
   * @param {string} filePath - Path of the file
   * @param {Object|string} contentOrOptions - File content or options object
   * @returns {this}
   */
  withFile(filePath, contentOrOptions = {}) {
    const options = typeof contentOrOptions === 'string' 
      ? { content: contentOrOptions } 
      : contentOrOptions;

    if (Array.isArray(this.files)) {
      this.files.push({ path: filePath, ...options });
    } else {
      this.files[filePath] = { 
        path: filePath, 
        imports: [],
        exports: [],
        usedBy: [],
        dependsOn: [],
        calls: [],
        identifierRefs: [],
        ...options 
      };
    }
    
    return this;
  }
}
