/**
 * @fileoverview index.js
 * 
 * Barrel export for Parser Test Factory Builders
 * 
 * @module tests/factories/parser-test
 */

import { CodeSampleBuilder } from './code.builder.js';
import { ASTBuilder } from './ast.builder.js';
import { ImportBuilder } from './import.builder.js';
import { ExportBuilder } from './export.builder.js';
import { FunctionBuilder } from './function.builder.js';
import { TSBuilder } from './ts.builder.js';

export {
    CodeSampleBuilder,
    ASTBuilder,
    ImportBuilder,
    ExportBuilder,
    FunctionBuilder,
    TSBuilder
};

// Default export acting as old monolith
export default {
    CodeSampleBuilder,
    ASTBuilder,
    ImportBuilder,
    ExportBuilder
};
