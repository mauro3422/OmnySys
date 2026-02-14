/**
 * @fileoverview Operations Index
 * 
 * Exports all operation classes and factory functions.
 * 
 * @module atomic-editor/operations
 */

export { BaseOperation } from './base-operation.js';
export { InsertOperation, createInsertOperation } from './insert-operation.js';
export { DeleteOperation, createDeleteOperation } from './delete-operation.js';
export { ModifyOperation, createModifyOperation } from './modify-operation.js';
