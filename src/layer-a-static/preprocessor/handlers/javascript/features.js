/**
 * @fileoverview JavaScript Handler - Feature Detection
 * 
 * Detección de features que requieren preprocesamiento.
 * 
 * @module preprocessor/handlers/javascript/features
 */

/**
 * Detecta si el código contiene features que requieren preprocesamiento
 * 
 * @param {string} code - Código a analizar
 * @returns {{ needsPreprocessing: boolean, features: string[] }}
 */
export function detectFeatures(code) {
  const features = [];
  
  // Detectar shebang
  if (code.startsWith('#!')) {
    features.push('shebang');
  }
  
  // Detectar private fields
  if (/#[a-zA-Z_$]/.test(code) && /class\s/.test(code)) {
    features.push('private_fields');
  }
  
  // Detectar pipeline operator
  if (/\|>/.test(code)) {
    features.push('pipeline_operator');
  }
  
  // Detectar JSX
  if (/<[A-Z][a-zA-Z]*[^>]*>/.test(code) || /<\/[A-Z][a-zA-Z]*>/.test(code)) {
    features.push('jsx');
  }
  
  return {
    needsPreprocessing: features.length > 0,
    features
  };
}
