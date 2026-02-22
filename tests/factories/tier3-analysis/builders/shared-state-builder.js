/**
 * @fileoverview SharedStateBuilder - Builder for shared state data
 */

export class SharedStateBuilder {
  constructor() {
    this.globalAccess = [];
    this.readProperties = [];
    this.writeProperties = [];
  }

  addRead(property, objectName = 'window', options = {}) {
    const { filePath = 'test.js', line = 1, column = 1, functionContext = null } = options;

    this.globalAccess.push({
      objectName,
      propName: property,
      type: 'read',
      fullReference: `${objectName}.${property}`,
      filePath,
      line,
      column,
      functionContext
    });
    this.readProperties.push(property);
    return this;
  }

  addWrite(property, objectName = 'window', options = {}) {
    const { filePath = 'test.js', line = 1, column = 1, functionContext = null } = options;

    this.globalAccess.push({
      objectName,
      propName: property,
      type: 'write',
      fullReference: `${objectName}.${property}`,
      filePath,
      line,
      column,
      functionContext
    });
    this.writeProperties.push(property);
    return this;
  }

  withMultipleReads(properties, objectName = 'window') {
    properties.forEach(prop => this.addRead(prop, objectName));
    return this;
  }

  withMultipleWrites(properties, objectName = 'window') {
    properties.forEach(prop => this.addWrite(prop, objectName));
    return this;
  }

  build() {
    const propertyAccessMap = {};
    
    [...this.readProperties, ...this.writeProperties].forEach(prop => {
      if (!propertyAccessMap[prop]) {
        propertyAccessMap[prop] = { reads: [], writes: [] };
      }
    });

    this.globalAccess.forEach(access => {
      if (access.type === 'read') {
        propertyAccessMap[access.propName].reads.push(access);
      } else {
        propertyAccessMap[access.propName].writes.push(access);
      }
    });

    return {
      globalAccess: this.globalAccess,
      readProperties: [...new Set(this.readProperties)],
      writeProperties: [...new Set(this.writeProperties)],
      propertyAccessMap
    };
  }

  static create() {
    return new SharedStateBuilder();
  }
}
