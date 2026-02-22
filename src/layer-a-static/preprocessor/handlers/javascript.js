/**
 * @fileoverview JavaScript Context Handler
 * 
 * Maneja las ambigüedades léxicas específicas de JavaScript/TypeScript:
 * - # como shebang (#!/usr/bin/env node)
 * - # como private field (#field)
 * - # como pipeline topic token (|> f(#))
 * 
 * También maneja otras ambigüedades de JS:
 * - / como división o regex
 * - < como comparación o inicio de JSX
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility.
 * Please import directly from the javascript/ directory:
 *   import { JavaScriptContextHandler } from './javascript/index.js';
 * 
 * @module preprocessor/handlers/javascript
 * @deprecated Use javascript/ directory modules instead
 */

import { JavaScriptContextHandler } from './javascript/index.js';

export { JavaScriptContextHandler };

export default JavaScriptContextHandler;
