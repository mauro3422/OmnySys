/**
 * @fileoverview error-classifier/index.js
 * 
 * Error Classification System
 * 
 * Analyzes errors and determines their type, severity, and
 * potential solutions based on pattern matching.
 * 
 * @module core/error-guardian/handlers/error-classifier
 */

import { SEVERITY, ERROR_PATTERNS } from './patterns/constants.js';
import { ErrorClassifier } from './classifiers/base-classifier/base-classifier.js';
// Methods now integrated in the base class via base-classifier.js

export { SEVERITY, ERROR_PATTERNS, ErrorClassifier };
export default ErrorClassifier;
