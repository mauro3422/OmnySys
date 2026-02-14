/**
 * @fileoverview Prompt Validator
 * 
 * Valida que los prompts generados cumplan con los requisitos.
 * Verifica campos requeridos y reglas anti-hallucination.
 * 
 * @module prompt-engine/validators/prompt-validator
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('prompt-engine:validator');

// Campos requeridos en la configuración de prompt
const REQUIRED_FIELDS = ['systemPrompt', 'userPrompt', 'jsonSchema', 'analysisType'];

// Reglas que debe contener el system prompt
const REQUIRED_RULES = [
  'Return ONLY valid JSON',
  'NEVER invent file names',
  'ONLY use files mentioned'
];

/**
 * Resultado de validación
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
  }
  
  addError(message) {
    this.valid = false;
    this.errors.push(message);
  }
  
  addWarning(message) {
    this.warnings.push(message);
  }
  
  toString() {
    if (this.valid && this.warnings.length === 0) {
      return 'Valid';
    }
    
    const parts = [];
    if (!this.valid) {
      parts.push(`Errors: ${this.errors.join(', ')}`);
    }
    if (this.warnings.length > 0) {
      parts.push(`Warnings: ${this.warnings.join(', ')}`);
    }
    return parts.join('; ');
  }
}

/**
 * Valida la configuración de un prompt
 * @param {Object} promptConfig - Configuración del prompt
 * @returns {ValidationResult} - Resultado de validación
 */
export function validatePrompt(promptConfig) {
  const result = new ValidationResult();
  
  // Verificar campos requeridos
  const missingFields = REQUIRED_FIELDS.filter(key => !promptConfig[key]);
  if (missingFields.length > 0) {
    result.addError(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Verificar system prompt
  if (promptConfig.systemPrompt) {
    validateSystemPrompt(promptConfig.systemPrompt, result);
  }
  
  // Verificar user prompt
  if (promptConfig.userPrompt) {
    validateUserPrompt(promptConfig.userPrompt, result);
  }
  
  // Log resultado
  if (!result.valid) {
    logger.warn(`Prompt validation failed: ${result.toString()}`);
  } else if (result.warnings.length > 0) {
    logger.debug(`Prompt validation warnings: ${result.toString()}`);
  }
  
  return result;
}

/**
 * Valida el system prompt
 * @private
 */
function validateSystemPrompt(systemPrompt, result) {
  // Verificar reglas requeridas
  for (const rule of REQUIRED_RULES) {
    if (!systemPrompt.includes(rule)) {
      result.addWarning(`System prompt missing rule: "${rule}"`);
    }
  }
  
  // Verificar que no esté vacío
  if (systemPrompt.trim().length < 50) {
    result.addWarning('System prompt seems too short');
  }
  
  // Verificar mención de JSON
  if (!systemPrompt.toLowerCase().includes('json')) {
    result.addWarning('System prompt should mention JSON format');
  }
}

/**
 * Valida el user prompt
 * @private
 */
function validateUserPrompt(userPrompt, result) {
  // Verificar que no esté vacío
  if (!userPrompt || userPrompt.trim().length === 0) {
    result.addError('User prompt is empty');
    return;
  }
  
  // Verificar placeholders sin reemplazar
  const unreplaced = userPrompt.match(/\{[a-zA-Z0-9_]+\}/g);
  if (unreplaced && unreplaced.length > 0) {
    // Filtrar placeholders intencionales (como __OMNY_FILE_CONTENT__)
    const invalid = unreplaced.filter(p => !p.startsWith('__'));
    if (invalid.length > 0) {
      result.addWarning(`Unreplaced placeholders: ${invalid.join(', ')}`);
    }
  }
  
  // Verificar longitud razonable
  if (userPrompt.length < 100) {
    result.addWarning('User prompt seems too short');
  }
}

/**
 * Valida que el template tenga la estructura correcta
 * @param {Object} template - Template a validar
 * @param {string} templateName - Nombre del template
 * @returns {ValidationResult} - Resultado de validación
 */
export function validateTemplate(template, templateName) {
  const result = new ValidationResult();
  
  if (!template) {
    result.addError(`Template "${templateName}" is null or undefined`);
    return result;
  }
  
  // Campos requeridos del template
  if (!template.systemPrompt) {
    result.addError(`Template "${templateName}" missing systemPrompt`);
  }
  
  if (!template.userPrompt) {
    result.addError(`Template "${templateName}" missing userPrompt`);
  }
  
  // Verificar schema si existe
  if (template.responseSchema) {
    validateResponseSchema(template.responseSchema, templateName, result);
  } else {
    result.addWarning(`Template "${templateName}" missing responseSchema`);
  }
  
  return result;
}

/**
 * Valida el schema de respuesta
 * @private
 */
function validateResponseSchema(schema, templateName, result) {
  if (typeof schema !== 'object') {
    result.addError(`Template "${templateName}" has invalid responseSchema`);
    return;
  }
  
  if (!schema.type) {
    result.addWarning(`Template "${templateName}" schema missing type`);
  }
  
  if (!schema.properties && !schema.items) {
    result.addWarning(`Template "${templateName}" schema missing properties/items`);
  }
}

/**
 * Lanza error si la validación falla
 * @param {Object} promptConfig - Configuración del prompt
 * @throws {Error} - Si la validación falla
 */
export function validatePromptOrThrow(promptConfig) {
  const result = validatePrompt(promptConfig);
  
  if (!result.valid) {
    throw new Error(`Prompt validation failed: ${result.errors.join(', ')}`);
  }
  
  return true;
}
