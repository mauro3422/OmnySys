/**
 * @fileoverview Validation Engine
 * 
 * Motor orquestador de validaciones.
 * 
 * @module ground-truth-validator/validation-engine
 * @version 1.0.0
 */

import { createLogger } from '../logger-system.js';
import { ValidationContext } from './utils/validation-context.js';
import { ValidationResult, ReportGenerator } from './reports/validation-report.js';
import { AtomValidator } from './validators/atom-validator.js';
import { CallGraphValidator } from './validators/call-graph-validator.js';

const logger = createLogger('OmnySys:validator:engine');

/**
 * Motor de validación Ground Truth
 */
export class ValidationEngine {
  constructor(projectPath, omnysysPath) {
    this.context = new ValidationContext(projectPath, omnysysPath);
    this.validators = [];
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(new AtomValidator());
    this.register(new CallGraphValidator());
  }

  register(validator) {
    this.validators.push(validator);
  }

  async validate() {
    const startTime = Date.now();
    logger.info('Starting Ground Truth Validation...');

    const result = new ValidationResult();

    for (const validator of this.validators) {
      if (!validator.canValidate(this.context)) continue;

      try {
        logger.info(`Running ${validator.name}...`);
        const phaseResult = await validator.validate(this.context);
        result.addPhase(phaseResult);
      } catch (error) {
        logger.error(`Validator ${validator.name} failed:`, error);
        result.addPhase({
          phase: validator.name,
          valid: false,
          mismatches: [{ type: 'VALIDATOR_ERROR', message: error.message }]
        });
      }
    }

    result.duration = Date.now() - startTime;
    ReportGenerator.log(result);
    
    return result;
  }
}

export async function validateGroundTruth(projectPath, omnysysPath) {
  const engine = new ValidationEngine(projectPath, omnysysPath);
  return engine.validate();
}

export default { ValidationEngine, validateGroundTruth };
