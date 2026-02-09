/**
 * @fileoverview core.js
 * 
 * Clase principal LLMAnalyzer
 * Analiza código complejo usando LLM local
 * 
 * @module llm-analyzer/core
 */

import { LLMClient } from '../../ai/llm-client.js';
import { UnifiedCacheManager } from '../../core/unified-cache-manager.js';
import { 
  validateLLMResponse, 
  calculateDynamicTimeout,
  sanitizeGlobalStateResponse
} from '../validators/index.js';

import { buildPrompt } from './prompt-builder.js';
import { 
  normalizeResponse, 
  extractValidFilePaths 
} from './response-normalizer.js';
import { needsLLMAnalysis } from './analysis-decider.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:core');



/**
 * Analizador semántico basado en LLM
 */
export class LLMAnalyzer {
  constructor(config, projectPath = process.cwd()) {
    this.config = config;
    this.projectPath = projectPath;
    this.client = new LLMClient(config);
    this.initialized = false;
    this.cache = null;
  }

  /**
   * Inicializa el cliente y verifica servidores
   * @returns {Promise<boolean>} - true si al menos un servidor está disponible
   */
  async initialize() {
    if (this.initialized) return true;

    const health = await this.client.healthCheck();
    this.initialized = health.gpu || health.cpu;

    if (!this.initialized) {
      logger.warn('⚠️  No LLM servers available. Falling back to static analysis only.');
      logger.warn('💡 Start servers with: src/ai/scripts/brain_gpu.bat');
    }

    // Inicializar caché unificado si está habilitado
    if (this.config.analysis.enableLLMCache) {
      this.cache = new UnifiedCacheManager(this.projectPath);
      await this.cache.initialize();
    }

    return this.initialized;
  }

  /**
   * Determina si un archivo necesita análisis LLM
   * @param {object} staticAnalysis - Resultados del análisis estático
   * @param {object} fileInfo - Info completa del archivo
   * @returns {boolean}
   */
  needsLLMAnalysis(staticAnalysis, fileInfo = null) {
    return needsLLMAnalysis(
      staticAnalysis, 
      fileInfo, 
      this.config.analysis.confidenceThreshold
    );
  }

  /**
   * Analiza código usando LLM con contexto del proyecto
   * @param {string} code - Código fuente
   * @param {string} filePath - Ruta del archivo
   * @param {object} staticAnalysis - Resultados del análisis estático
   * @param {object} projectContext - Contexto del proyecto
   * @param {object} metadata - Metadatos del archivo
   * @returns {Promise<object>} - Conexiones semánticas detectadas
   */
  async analyzeComplexCode(code, filePath, staticAnalysis, projectContext = null, metadata = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return null;
    }

    const validFilePaths = extractValidFilePaths(projectContext);
    const maxRetries = 3;
    let lastError = null;
    let promptConfig = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        promptConfig = await buildPrompt(code, filePath, staticAnalysis, projectContext, metadata);
        const { systemPrompt, userPrompt } = promptConfig;
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        // DEBUG: Contar tokens aproximados
        if (attempt === 1) {
          const approxTokens = Math.ceil(fullPrompt.length / 4);
          logger.info(`\n📊 Prompt Stats for ${filePath}:`);
          logger.info(`  - Characters: ${fullPrompt.length}`);
          logger.info(`  - Approx Tokens: ${approxTokens}`);
        }

        // Verificar caché
        if (this.cache && attempt === 1) {
          const cached = await this.cache.get(filePath, code, fullPrompt);
          if (cached) {
            logger.info(`  ✓ Cache hit for ${filePath}`);
            return cached;
          }
        }

        const dynamicTimeout = calculateDynamicTimeout(code);
        logger.info(`  🔄 Attempt ${attempt}/${maxRetries} (timeout: ${dynamicTimeout}ms)`);

        const response = await Promise.race([
          this.client.analyze(userPrompt, { systemPrompt }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('LLM timeout')), dynamicTimeout)
          )
        ]);

        const normalized = normalizeResponse(
          response, 
          filePath, 
          this.config.analysis.confidenceThreshold
        );
        
        if (!normalized) {
          logger.warn(`  ⚠️  Attempt ${attempt}: Invalid LLM response format`);
          lastError = new Error('Invalid response format');
          continue;
        }

        // Validar según tipo de análisis
        const analysisType = promptConfig?.analysisType || 'default';
        const typesRequiringValidation = ['semantic-connections', 'state-manager', 'event-hub'];
        
        let validated = normalized;
        if (analysisType === 'global-state') {
          validated = sanitizeGlobalStateResponse(normalized, code);
          if (!validated) {
            logger.warn(`  ⚠️  Attempt ${attempt}: Global-state response failed validation`);
            lastError = new Error('Global-state validation failed');
            continue;
          }
        } else if (typesRequiringValidation.includes(analysisType)) {
          validated = validateLLMResponse(normalized, code, validFilePaths);
          if (!validated) {
            logger.warn(`  ⚠️  Attempt ${attempt}: LLM response failed validation`);
            lastError = new Error('Validation failed');
            continue;
          }
        }

        validated.analysisType = analysisType;

        // Guardar en caché
        if (this.cache) {
          await this.cache.set(filePath, code, fullPrompt, validated);
        }

        return validated;

      } catch (error) {
        lastError = error;
        logger.error(`  ❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          logger.info(`  ⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    logger.error(`❌ LLM analysis failed for ${filePath} after ${maxRetries} attempts:`, lastError.message);
    return null;
  }

  /**
   * Analiza múltiples archivos en paralelo
   * @param {Array} files - Archivos a analizar
   * @returns {Promise<Array>} - Resultados
   */
  async analyzeMultiple(files) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return files.map(() => null);
    }

    const results = [];
    const filesToAnalyze = [];
    const fileIndices = [];

    // Construir prompts para todos
    const allPromptConfigs = await Promise.all(
      files.map(f => buildPrompt(f.code, f.filePath, f.staticAnalysis, f.projectContext, f.metadata))
    );

    // Verificar caché
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { systemPrompt, userPrompt } = allPromptConfigs[i];
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      if (this.cache) {
        const cached = await this.cache.get(file.filePath, file.code, fullPrompt);
        if (cached) {
          results[i] = cached;
          continue;
        }
      }

      filesToAnalyze.push({ ...file, systemPrompt, userPrompt, fullPrompt });
      fileIndices.push(i);
    }

    if (filesToAnalyze.length === 0) {
      logger.info('  ✓ All files found in cache');
      return results;
    }

    logger.info(`  📊 Cache hit: ${files.length - filesToAnalyze.length}/${files.length}, analyzing ${filesToAnalyze.length} files`);

    const userPrompts = filesToAnalyze.map(f => f.userPrompt);
    const responses = await this.client.analyzeParallelWithSystemPrompts(
      userPrompts, 
      filesToAnalyze.map(f => f.systemPrompt)
    );

    for (let i = 0; i < filesToAnalyze.length; i++) {
      const file = filesToAnalyze[i];
      const response = responses[i];
      const normalized = normalizeResponse(
        response, 
        file.filePath, 
        this.config.analysis.confidenceThreshold
      );

      if (normalized) {
        normalized.analysisType = file.analysisType || 'default';
      }

      results[fileIndices[i]] = normalized;

      if (normalized && this.cache) {
        await this.cache.set(file.filePath, file.code, file.fullPrompt, normalized);
      }
    }

    return results;
  }
}
