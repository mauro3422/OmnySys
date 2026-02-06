/**
 * @fileoverview prompt-builder.js
 * 
 * Construye prompts para el LLM usando el Prompt Engine
 * 
 * @module llm-analyzer/prompt-builder
 */

import promptEngine from '../prompt-engine/index.js';

/**
 * Construye el prompt para el LLM
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @param {object} staticAnalysis - Resultados del análisis estático
 * @param {object} projectContext - Contexto del proyecto
 * @param {object} metadata - Metadatos del archivo
 * @returns {Promise<{systemPrompt: string, userPrompt: string, analysisType: string}>} - Prompts
 */
export async function buildPrompt(code, filePath, staticAnalysis, projectContext, metadata = null) {
  try {
    // Usar el Prompt Engine para generar el prompt basado en metadatos
    const promptConfig = await promptEngine.generatePrompt(metadata || {}, code);
    
    // Validar el prompt generado
    promptEngine.validatePrompt(promptConfig);
    
    // Asegurar que los prompts sean strings válidos
    if (typeof promptConfig.systemPrompt !== 'string') {
      throw new Error(`Invalid systemPrompt type: ${typeof promptConfig.systemPrompt}`);
    }
    if (typeof promptConfig.userPrompt !== 'string') {
      throw new Error(`Invalid userPrompt type: ${typeof promptConfig.userPrompt}`);
    }
    
    return {
      systemPrompt: promptConfig.systemPrompt,
      userPrompt: promptConfig.userPrompt,
      analysisType: promptConfig.analysisType
    };
  } catch (error) {
    console.error(`Error building prompt for ${filePath}:`, error.message);
    // Fallback a prompts básicos
    return {
      systemPrompt: `You are a code analyzer. Return ONLY valid JSON.`,
      userPrompt: `<file_content>\n${code}\n</file_content>\n\nANALYZE: Extract patterns, functions, exports, imports. Return exact strings found.`,
      analysisType: 'default'
    };
  }
}
