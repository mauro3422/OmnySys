/**
 * @fileoverview Core Atomic Editor Factory
 * 
 * Builders para testing del sistema AtomicEditor
 * 
 * @module tests/factories/core-atomic-editor
 */

/**
 * Builder para crear operaciones de edición (ModifyOperation)
 */
export class EditOperationBuilder {
  constructor() {
    this.operation = {
      type: 'modify',
      filePath: 'src/test.js',
      options: {
        oldString: 'old code',
        newString: 'new code'
      },
      valid: true,
      validationError: null
    };
  }

  withFile(filePath) {
    this.operation.filePath = filePath;
    return this;
  }

  withOldString(str) {
    this.operation.options.oldString = str;
    return this;
  }

  withNewString(str) {
    this.operation.options.newString = str;
    return this;
  }

  asValid() {
    this.operation.valid = true;
    this.operation.validationError = null;
    return this;
  }

  asInvalid() {
    this.operation.valid = false;
    this.operation.validationError = 'Validation failed';
    return this;
  }

  withValidationError(error) {
    this.operation.valid = false;
    this.operation.validationError = error;
    return this;
  }

  build() {
    return { ...this.operation };
  }

  static create() {
    return new EditOperationBuilder();
  }
}

/**
 * Builder para crear operaciones de inserción (InsertOperation)
 */
export class InsertOperationBuilder {
  constructor() {
    this.operation = {
      type: 'insert',
      filePath: 'src/test.js',
      options: {
        content: 'inserted content',
        line: 1,
        position: 'after'
      }
    };
  }

  withFile(filePath) {
    this.operation.filePath = filePath;
    return this;
  }

  withContent(content) {
    this.operation.options.content = content;
    return this;
  }

  atLine(lineNumber) {
    this.operation.options.line = lineNumber;
    return this;
  }

  withPosition(position) {
    this.operation.options.position = position;
    return this;
  }

  atStart() {
    this.operation.options.position = 'before';
    this.operation.options.line = 1;
    return this;
  }

  atEnd() {
    this.operation.options.position = 'after';
    this.operation.options.line = -1;
    return this;
  }

  build() {
    return { ...this.operation };
  }

  static create() {
    return new InsertOperationBuilder();
  }
}

/**
 * Builder para crear operaciones de eliminación (DeleteOperation)
 */
export class DeleteOperationBuilder {
  constructor() {
    this.operation = {
      type: 'delete',
      filePath: 'src/test.js',
      options: {
        startLine: 1,
        endLine: 5
      }
    };
  }

  withFile(filePath) {
    this.operation.filePath = filePath;
    return this;
  }

  withRange(start, end) {
    this.operation.options.startLine = start;
    this.operation.options.endLine = end;
    return this;
  }

  withStartLine(line) {
    this.operation.options.startLine = line;
    return this;
  }

  withEndLine(line) {
    this.operation.options.endLine = line;
    return this;
  }

  singleLine(line) {
    this.operation.options.startLine = line;
    this.operation.options.endLine = line;
    return this;
  }

  entireFile() {
    this.operation.options.startLine = 1;
    this.operation.options.endLine = -1;
    return this;
  }

  build() {
    return { ...this.operation };
  }

  static create() {
    return new DeleteOperationBuilder();
  }
}

/**
 * Builder para crear resultados de operaciones (EditResult)
 */
export class EditResultBuilder {
  constructor() {
    this.result = {
      success: true,
      file: 'src/test.js',
      affectedFiles: ['src/test.js'],
      undoData: null,
      validationError: null
    };
  }

  asSuccess() {
    this.result.success = true;
    this.result.validationError = null;
    return this;
  }

  asFailure() {
    this.result.success = false;
    this.result.validationError = 'Operation failed';
    return this;
  }

  withUndoData(undoData) {
    this.result.undoData = undoData;
    return this;
  }

  withAffectedFiles(files) {
    this.result.affectedFiles = Array.isArray(files) ? files : [files];
    return this;
  }

  withValidationError(error) {
    this.result.success = false;
    this.result.validationError = error;
    return this;
  }

  withFile(filePath) {
    this.result.file = filePath;
    return this;
  }

  build() {
    return { ...this.result };
  }

  static create() {
    return new EditResultBuilder();
  }
}

/**
 * Builder para crear entradas de historial (HistoryEntry)
 */
export class HistoryEntryBuilder {
  constructor() {
    this.entry = {
      operation: {
        type: 'modify',
        filePath: 'src/test.js'
      },
      timestamp: Date.now(),
      undoData: null,
      canUndo: true,
      canRedo: false
    };
  }

  withOperation(operation) {
    this.entry.operation = operation;
    return this;
  }

  withTimestamp(timestamp) {
    this.entry.timestamp = timestamp;
    return this;
  }

  withUndoData(undoData) {
    this.entry.undoData = undoData;
    this.entry.canUndo = true;
    return this;
  }

  canUndo(value = true) {
    this.entry.canUndo = value;
    return this;
  }

  canRedo(value = true) {
    this.entry.canRedo = value;
    return this;
  }

  asModifyOperation() {
    this.entry.operation = { type: 'modify', filePath: 'src/test.js' };
    return this;
  }

  asInsertOperation() {
    this.entry.operation = { type: 'insert', filePath: 'src/test.js' };
    return this;
  }

  asDeleteOperation() {
    this.entry.operation = { type: 'delete', filePath: 'src/test.js' };
    return this;
  }

  withRecentTimestamp() {
    this.entry.timestamp = Date.now();
    return this;
  }

  withOldTimestamp() {
    this.entry.timestamp = Date.now() - 3600000;
    return this;
  }

  build() {
    return { ...this.entry };
  }

  static create() {
    return new HistoryEntryBuilder();
  }
}

/**
 * Builder para crear resultados de validación (ValidationResult)
 */
export class ValidationResultBuilder {
  constructor() {
    this.validation = {
      valid: true,
      error: null,
      line: null,
      column: null,
      errorType: null
    };
  }

  asValid() {
    this.validation.valid = true;
    this.validation.error = null;
    this.validation.errorType = null;
    return this;
  }

  asInvalid() {
    this.validation.valid = false;
    this.validation.error = 'Validation error';
    return this;
  }

  withError(error) {
    this.validation.valid = false;
    this.validation.error = error;
    return this;
  }

  withLine(line) {
    this.validation.line = line;
    return this;
  }

  withColumn(column) {
    this.validation.column = column;
    return this;
  }

  asSyntaxError() {
    this.validation.valid = false;
    this.validation.error = 'Syntax error: unexpected token';
    this.validation.errorType = 'syntax';
    this.validation.line = 10;
    this.validation.column = 5;
    return this;
  }

  asSafetyError() {
    this.validation.valid = false;
    this.validation.error = 'Safety check failed: potentially dangerous operation';
    this.validation.errorType = 'safety';
    return this;
  }

  atPosition(line, column) {
    this.validation.line = line;
    this.validation.column = column;
    return this;
  }

  build() {
    return { ...this.validation };
  }

  static create() {
    return new ValidationResultBuilder();
  }
}

export default {
  EditOperationBuilder,
  InsertOperationBuilder,
  DeleteOperationBuilder,
  EditResultBuilder,
  HistoryEntryBuilder,
  ValidationResultBuilder
};
