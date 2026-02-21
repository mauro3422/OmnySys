/**
 * @fileoverview Extractor Factory - Core Builders (Barrel Export)
 * 
 * Este archivo ahora re-exporta desde módulos especializados.
 * Mantiene compatibilidad hacia atrás con el API anterior.
 * 
 * @module tests/factories/extractor-test/core-builders
 * @deprecated Usar imports específicos desde los submódulos
 */

// Re-exportar todo desde los módulos especializados
export { PARSER_CONFIG, BaseBuilder } from './base-builder.js';
export { CodeSampleBuilder } from './code-sample-builder.js';
export { FunctionBuilder, ArrowFunctionBuilder } from './function-builders.js';
export { ClassBuilder } from './class-builder.js';