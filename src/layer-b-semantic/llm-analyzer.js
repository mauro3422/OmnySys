/**
 * llm-analyzer.js
 * Analiza cÃ³digo complejo usando LLM local
 *
 * Casos de uso (cuando regex/AST no es suficiente):
 * - IndirecciÃ³n: const state = window.gameState; state.score = 10;
 * - Propiedades dinÃ¡micas: window[propName] = value;
 * - Razonamiento contextual: Â¿QuÃ© archivos afecta este cambio?
 * - Patrones no obvios: callbacks, closures, event handlers indirectos
 */

import { LLMClient, loadAIConfig } from '../ai/llm-client.js';
import { UnifiedCacheManager } from '../core/unified-cache-manager.js';
import { 
  validateLLMResponse, 
  calculateDynamicTimeout,
  extractActualLocalStorageKeys,
  extractActualEventNames,
  sanitizeGlobalStateResponse
} from './llm-response-validator.js';
import promptEngine from './prompt-engine/index.js';

/**
 * Analizador semÃ¡ntico basado en LLM
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
   * @returns {Promise<boolean>} - true si al menos un servidor estÃ¡ disponible
   */
  async initialize() {
    if (this.initialized) return true;

    const health = await this.client.healthCheck();
    this.initialized = health.gpu || health.cpu;

    if (!this.initialized) {
      console.warn('âš ï¸  No LLM servers available. Falling back to static analysis only.');
      console.warn('ðŸ’¡ Start servers with: src/ai/scripts/brain_gpu.bat');
    }

    // Inicializar cachÃ© unificado si estÃ¡ habilitado
    if (this.config.analysis.enableLLMCache) {
      this.cache = new UnifiedCacheManager(this.projectPath);
      await this.cache.initialize();
    }

    return this.initialized;
  }

  /**
   * Determina si un archivo necesita anÃ¡lisis LLM
   *
   * ESTRATEGIA INTELIGENTE:
   * - NO analizar archivos ya conectados por imports (lo sabemos)
   * - SÃ analizar archivos DESCONECTADOS con indicios de conexiÃ³n oculta
   * - SÃ analizar archivos con shared state/eventos (conexiones no obvias)
   *
   * @param {object} staticAnalysis - Resultados del anÃ¡lisis estÃ¡tico
   * @param {object} fileInfo - Info completa del archivo (imports, usedBy, etc)
   * @returns {boolean} - true si necesita anÃ¡lisis LLM
   */
  needsLLMAnalysis(staticAnalysis, fileInfo = null) {
    // Criterio 1: Archivos HUÃ‰RFANOS o DESCONECTADOS (alta prioridad)
    const isOrphan = fileInfo &&
      (fileInfo.imports || []).length === 0 &&
      (fileInfo.usedBy || []).length === 0;

    // Criterio 2: Tiene SHARED STATE (conexiÃ³n oculta posible)
    const hasSharedState =
      (staticAnalysis.sharedState?.reads?.length > 0) ||
      (staticAnalysis.sharedState?.writes?.length > 0);

    // Criterio 3: Tiene EVENTOS (conexiÃ³n oculta posible)
    const hasEvents =
      (staticAnalysis.eventPatterns?.eventListeners?.length > 0) ||
      (staticAnalysis.eventPatterns?.eventEmitters?.length > 0);

    // Criterio 4: CÃ³digo DINÃMICO (necesita razonamiento)
    const hasDynamicCode = staticAnalysis.sideEffects?.some(
      effect => effect.includes('dynamic') || effect.includes('eval')
    );

    // Criterio 5: Baja CONFIANZA en conexiones detectadas
    const hasLowConfidence = staticAnalysis.semanticConnections?.some(
      conn => (conn.confidence || 1.0) < this.config.analysis.confidenceThreshold
    );

    // Criterio 6: Archivo AISLADO con side effects sospechosos
    const hasSuspiciousSideEffects =
      isOrphan &&
      (staticAnalysis.sideEffects?.hasGlobalAccess ||
       staticAnalysis.sideEffects?.usesLocalStorage);

    // Solo analizar si hay INDICIOS de conexiones ocultas
    return hasSharedState || hasEvents || hasDynamicCode ||
           hasLowConfidence || hasSuspiciousSideEffects;
  }

  /**
   * Analiza cÃ³digo usando LLM con contexto del proyecto
   * @param {string} code - CÃ³digo fuente
   * @param {string} filePath - Ruta del archivo
   * @param {object} staticAnalysis - Resultados del anÃ¡lisis estÃ¡tico
   * @param {object} projectContext - Contexto del proyecto (opcional)
   * @returns {Promise<object>} - Conexiones semÃ¡nticas detectadas por LLM
   */
  async analyzeComplexCode(code, filePath, staticAnalysis, projectContext = null, metadata = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return null; // No hay servidores disponibles
    }

    // Extraer paths vÃ¡lidos del proyecto para validaciÃ³n
    const validFilePaths = this.extractValidFilePaths(projectContext);

    // Configurar retry con backoff
    const maxRetries = 3;
    let lastError = null;
    let promptConfig = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Construir prompts con contexto del proyecto
        promptConfig = await this.buildPrompt(code, filePath, staticAnalysis, projectContext, metadata);
        const { systemPrompt, userPrompt } = promptConfig;
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        // âœ… DEBUGGING: Contar tokens aproximados (4 chars â‰ˆ 1 token)
        if (attempt === 1) { // Solo mostrar en primer intento
          const approxTokens = Math.ceil(fullPrompt.length / 4);
          console.log(`\nðŸ“Š Prompt Stats for ${filePath}:`);
          console.log(`  - Characters: ${fullPrompt.length}`);
          console.log(`  - Approx Tokens: ${approxTokens}`);
        }

        // Verificar cachÃ© usando el prompt completo
        if (this.cache && attempt === 1) {
          const cached = await this.cache.get(filePath, code, fullPrompt);
          if (cached) {
            console.log(`  âœ“ Cache hit for ${filePath}`);
            return cached;
          }
        }

        // Calcular timeout dinÃ¡mico basado en tamaÃ±o
        const dynamicTimeout = calculateDynamicTimeout(code);
        console.log(`  ðŸ”„ Attempt ${attempt}/${maxRetries} (timeout: ${dynamicTimeout}ms)`);

        // Llamar a LLM con timeout, pasando system prompt personalizado
        const response = await Promise.race([
          this.client.analyze(userPrompt, { systemPrompt }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('LLM timeout')), dynamicTimeout)
          )
        ]);

        // Normalizar respuesta
        const normalized = this.normalizeResponse(response, filePath);
        
        if (!normalized) {
          console.warn(`  âš ï¸  Attempt ${attempt}: Invalid LLM response format`);
          lastError = new Error('Invalid response format');
          continue; // Retry
        }

        // âœ… VALIDAR respuesta del LLM (solo para tipos que requieren validaciÃ³n especÃ­fica)
        const analysisType = promptConfig?.analysisType || 'default';
        const typesRequiringValidation = ['semantic-connections', 'state-manager', 'event-hub'];
        
        let validated = normalized;
        if (analysisType === 'global-state') {
          validated = sanitizeGlobalStateResponse(normalized, code);
          
          if (!validated) {
            console.warn(`  âš ï¸  Attempt ${attempt}: Global-state response failed validation`);
            lastError = new Error('Global-state validation failed');
            continue; // Retry
          }
          console.log(`  âœ“ Global-state validated: ${validated.globalVariables?.length || 0} globals`);
        } else if (typesRequiringValidation.includes(analysisType)) {
          validated = validateLLMResponse(normalized, code, validFilePaths);
          
          if (!validated) {
            console.warn(`  âš ï¸  Attempt ${attempt}: LLM response failed validation`);
            lastError = new Error('Validation failed');
            continue; // Retry
          }
          console.log(`  âœ“ Validated: ${validated.localStorageKeys?.length || 0} keys, ${validated.eventNames?.length || 0} events`);
        } else {
          console.log(`  âœ“ Analysis complete for ${analysisType}: ${filePath}`);
        }

        // Agregar analysisType al resultado para que el merger sepa cÃ³mo procesarlo
        validated.analysisType = analysisType;

        // Guardar en cachÃ©
        if (this.cache) {
          await this.cache.set(filePath, code, fullPrompt, validated);
        }

        return validated;

      } catch (error) {
        lastError = error;
        console.error(`  âŒ Attempt ${attempt} failed: ${error.message}`);
        
        // Backoff exponencial antes de reintentar
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`  â³ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    console.error(`âŒ LLM analysis failed for ${filePath} after ${maxRetries} attempts:`, lastError.message);
    return null;
  }

  /**
   * Extrae paths vÃ¡lidos de archivos del proyecto para validaciÃ³n
   * @private
   */
  extractValidFilePaths(projectContext) {
    const paths = [];
    
    if (!projectContext?.fileSpecific?.allProjectFiles) {
      return paths;
    }
    
    for (const file of projectContext.fileSpecific.allProjectFiles) {
      if (file.path) {
        paths.push(file.path);
      }
    }
    
    return paths;
  }

  /**
   * Analiza mÃºltiples archivos en paralelo
   * @param {Array<{code, filePath, staticAnalysis}>} files - Archivos a analizar
   * @returns {Promise<Array<object>>} - Resultados para cada archivo
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

    // Construir prompts para todos (ANTES de verificar cache)
    const allPromptConfigs = await Promise.all(files.map(f => this.buildPrompt(f.code, f.filePath, f.staticAnalysis, f.projectContext, f.metadata)));

    // Verificar cachÃ© para cada archivo usando el prompt completo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { systemPrompt, userPrompt } = allPromptConfigs[i];
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      let cached = null;

      if (this.cache) {
        cached = await this.cache.get(file.filePath, file.code, fullPrompt);
      }

      if (cached) {
        results[i] = cached;
      } else {
        filesToAnalyze.push({ ...file, systemPrompt, userPrompt, fullPrompt });
        fileIndices.push(i);
      }
    }

    // Si todos estÃ¡n en cachÃ©, retornar
    if (filesToAnalyze.length === 0) {
      console.log('  âœ“ All files found in cache');
      return results;
    }

    console.log(`  ðŸ“Š Cache hit: ${files.length - filesToAnalyze.length}/${files.length}, analyzing ${filesToAnalyze.length} files`);

    // Extraer solo los user prompts de archivos no cacheados
    const userPrompts = filesToAnalyze.map(f => f.userPrompt);

    // Analizar en paralelo pasando system prompts personalizados
    const responses = await this.client.analyzeParallelWithSystemPrompts(userPrompts, filesToAnalyze.map(f => f.systemPrompt));

    // Normalizar respuestas y guardar en cachÃ©
    for (let i = 0; i < filesToAnalyze.length; i++) {
      const file = filesToAnalyze[i];
      const response = responses[i];
      const normalized = this.normalizeResponse(response, file.filePath);

      // Agregar analysisType al resultado
      if (normalized) {
        normalized.analysisType = file.analysisType || 'default';
      }

      results[fileIndices[i]] = normalized;

      // Guardar en cachÃ© usando el prompt completo
      if (normalized && this.cache) {
        await this.cache.set(file.filePath, file.code, file.fullPrompt, normalized);
      }
    }

    return results;
  }

  /**
   * Construye el prompt para el LLM usando el Prompt Engine
   * @private
   * @returns {Promise<{systemPrompt: string, userPrompt: string}>} - Prompts separados
   */
  async buildPrompt(code, filePath, staticAnalysis, projectContext, metadata = null) {
    try {
      // Usar el Prompt Engine para generar el prompt basado en metadatos
      const promptConfig = await promptEngine.generatePrompt(metadata || {}, code);
      
      // Validar el prompt generado
      promptEngine.validatePrompt(promptConfig);
      
      // Asegurar que los prompts sean strings vÃ¡lidos
      if (typeof promptConfig.systemPrompt !== 'string') {
        throw new Error(`Invalid systemPrompt type: ${typeof promptConfig.systemPrompt}`);
      }
      if (typeof promptConfig.userPrompt !== 'string') {
        throw new Error(`Invalid userPrompt type: ${typeof promptConfig.userPrompt}`);
      }
      
      // Retornar prompts separados + analysisType
      return {
        systemPrompt: promptConfig.systemPrompt,
        userPrompt: promptConfig.userPrompt,
        analysisType: promptConfig.analysisType
      };
    } catch (error) {
      console.error(`Error building prompt for ${filePath}:`, error.message);
      // Fallback a prompts bÃ¡sicos
      return {
        systemPrompt: `You are a code analyzer. Return ONLY valid JSON.`,
        userPrompt: `<file_content>\n${code}\n</file_content>\n\nANALYZE: Extract patterns, functions, exports, imports. Return exact strings found.`,
        analysisType: 'default'
      };
    }
  }

  /**
   * Normaliza y valida la respuesta del LLM
   * @private
   */
  normalizeResponse(response, filePath) {
    console.log(`ðŸ” DEBUG normalizeResponse: ${filePath}`, JSON.stringify(response).substring(0, 200));

    if (!response || response.error) {
      console.warn(`âš ï¸  Invalid LLM response for ${filePath}`);
      return null;
    }

    // Si la respuesta no es JSON estructurado, intentar extraer informaciÃ³n
    if (response.rawResponse) {
      console.warn(`âš ï¸  LLM returned raw text for ${filePath}, expected JSON`);
      return null;
    }

    // Buscar campos en diferentes niveles del objeto response
    const baseResponse = response.analysisResult || response.analysisresult || response;
    const confidence = baseResponse.confidence || response.confidence || 0.8;
    const reasoning = baseResponse.reasoning || response.reasoning || 'No reasoning provided';

    // Schema simplificado para LFM2-Extract
    // Incluir TODOS los campos del response original, no solo los genÃ©ricos
    const normalized = {
      ...response,  // Spread primero para incluir todos los campos originales
      source: 'llm',
      confidence: confidence,
      reasoning: reasoning,
      affectedFiles: response.connectedFiles || response.potentialUsage || response.affectedFiles || [],
      suggestedConnections: response.suggestedConnections || [],
      hiddenConnections: response.hiddenConnections || [],
      // Campos nuevos del schema simplificado
      localStorageKeys: response.localStorageKeys || response.sharedState?.reads || [],
      eventNames: response.eventNames || response.events?.listens || response.events?.emits || [],
      connectionType: response.connectionType || 'none'
    };

    console.log(`ðŸ” DEBUG normalized: ${filePath}`, JSON.stringify(normalized).substring(0, 200));

    // Si tiene sharedState o events del nuevo formato, convertir al formato interno
    if (response.sharedState || response.events) {
      normalized.sharedState = response.sharedState;
      normalized.events = response.events;
    } else if (response.connectionType === 'shared-state' || response.connectionType === 'global') {
      // Convertir formatos legacy de shared state a formato interno
      normalized.sharedState = {
        reads: response.sharedState?.reads || [],
        writes: response.sharedState?.writes || []
      };
      normalized.events = {
        emits: response.events?.emits || [],
        listens: response.events?.listens || []
      };
    }

    // Filtrar por umbral de confianza
    if (normalized.confidence < this.config.analysis.confidenceThreshold) {
      console.warn(
        `âš ï¸  LLM confidence too low (${normalized.confidence}) for ${filePath}`
      );
      return null;
    }

    console.log(`âœ… Validated: ${filePath}, confidence=${normalized.confidence}`);
    return normalized;
  }

  /**
   * Convierte el formato simplificado de localStorage al formato interno
   * @private
   */
  normalizeSharedStateFromSimple(keys, connectionType) {
    if (!keys || keys.length === 0) return { reads: [], writes: [] };
    
    // Asumimos que son todas lecturas/escrituras segÃºn el contexto
    // El extractor estÃ¡tico ya determinÃ³ eso con precisiÃ³n
    return {
      reads: connectionType === 'localStorage' ? keys : [],
      writes: connectionType === 'localStorage' ? keys : []
    };
  }

  /**
   * Convierte el formato simplificado de eventos al formato interno
   * @private
   */
  normalizeEventsFromSimple(events, connectionType) {
    if (!events || events.length === 0) return { emits: [], listens: [] };
    
    return {
      emits: connectionType === 'event' ? events : [],
      listens: connectionType === 'event' ? events : []
    };
  }

  /**
   * Normaliza detecciones de estado compartido
   * @private
   */
  normalizeSharedState(sharedState) {
    return {
      reads: sharedState
        .filter(s => s.type === 'read')
        .map(s => s.property),
      writes: sharedState
        .filter(s => s.type === 'write')
        .map(s => s.property)
    };
  }

  /**
   * Normaliza detecciones de eventos
   * @private
   */
  normalizeEvents(events) {
    return {
      emits: events
        .filter(e => e.type === 'emit')
        .map(e => e.name),
      listens: events
        .filter(e => e.type === 'listen')
        .map(e => e.name)
    };
  }
}

/**
 * Factory function para crear LLMAnalyzer con configuraciÃ³n cargada
 * @param {string} projectPath - Ruta del proyecto (opcional)
 * @returns {Promise<LLMAnalyzer>}
 */
export async function createLLMAnalyzer(projectPath = process.cwd()) {
  const config = await loadAIConfig();
  return new LLMAnalyzer(config, projectPath);
}

