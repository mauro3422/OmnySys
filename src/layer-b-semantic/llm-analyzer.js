/**
 * llm-analyzer.js
 * Analiza código complejo usando LLM local
 *
 * Casos de uso (cuando regex/AST no es suficiente):
 * - Indirección: const state = window.gameState; state.score = 10;
 * - Propiedades dinámicas: window[propName] = value;
 * - Razonamiento contextual: ¿Qué archivos afecta este cambio?
 * - Patrones no obvios: callbacks, closures, event handlers indirectos
 */

import { LLMClient, loadAIConfig } from '../ai/llm-client.js';
import { UnifiedCacheManager } from '../core/unified-cache-manager.js';
import { 
  validateLLMResponse, 
  calculateDynamicTimeout,
  extractActualLocalStorageKeys,
  extractActualEventNames 
} from './llm-response-validator.js';
import promptEngine from './prompt-engine/index.js';

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
      console.warn('⚠️  No LLM servers available. Falling back to static analysis only.');
      console.warn('💡 Start servers with: src/ai/scripts/start_brain_gpu.bat');
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
   *
   * ESTRATEGIA INTELIGENTE:
   * - NO analizar archivos ya conectados por imports (lo sabemos)
   * - SÍ analizar archivos DESCONECTADOS con indicios de conexión oculta
   * - SÍ analizar archivos con shared state/eventos (conexiones no obvias)
   *
   * @param {object} staticAnalysis - Resultados del análisis estático
   * @param {object} fileInfo - Info completa del archivo (imports, usedBy, etc)
   * @returns {boolean} - true si necesita análisis LLM
   */
  needsLLMAnalysis(staticAnalysis, fileInfo = null) {
    // Criterio 1: Archivos HUÉRFANOS o DESCONECTADOS (alta prioridad)
    const isOrphan = fileInfo &&
      (fileInfo.imports || []).length === 0 &&
      (fileInfo.usedBy || []).length === 0;

    // Criterio 2: Tiene SHARED STATE (conexión oculta posible)
    const hasSharedState =
      (staticAnalysis.sharedState?.reads?.length > 0) ||
      (staticAnalysis.sharedState?.writes?.length > 0);

    // Criterio 3: Tiene EVENTOS (conexión oculta posible)
    const hasEvents =
      (staticAnalysis.eventPatterns?.eventListeners?.length > 0) ||
      (staticAnalysis.eventPatterns?.eventEmitters?.length > 0);

    // Criterio 4: Código DINÁMICO (necesita razonamiento)
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
   * Analiza código usando LLM con contexto del proyecto
   * @param {string} code - Código fuente
   * @param {string} filePath - Ruta del archivo
   * @param {object} staticAnalysis - Resultados del análisis estático
   * @param {object} projectContext - Contexto del proyecto (opcional)
   * @returns {Promise<object>} - Conexiones semánticas detectadas por LLM
   */
  async analyzeComplexCode(code, filePath, staticAnalysis, projectContext = null, metadata = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      return null; // No hay servidores disponibles
    }

    // Extraer paths válidos del proyecto para validación
    const validFilePaths = this.extractValidFilePaths(projectContext);

    // Configurar retry con backoff
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Construir prompt con contexto del proyecto
        const prompt = await this.buildPrompt(code, filePath, staticAnalysis, projectContext, metadata);

        // ✅ DEBUGGING: Contar tokens aproximados (4 chars ≈ 1 token)
        if (attempt === 1) { // Solo mostrar en primer intento
          const approxTokens = Math.ceil(prompt.length / 4);
          console.log(`\n📊 Prompt Stats for ${filePath}:`);
          console.log(`  - Characters: ${prompt.length}`);
          console.log(`  - Approx Tokens: ${approxTokens}`);
        }

        // Verificar caché usando el prompt completo
        if (this.cache && attempt === 1) {
          const cached = await this.cache.get(filePath, code, prompt);
          if (cached) {
            console.log(`  ✓ Cache hit for ${filePath}`);
            return cached;
          }
        }

        // Calcular timeout dinámico basado en tamaño
        const dynamicTimeout = calculateDynamicTimeout(code);
        console.log(`  🔄 Attempt ${attempt}/${maxRetries} (timeout: ${dynamicTimeout}ms)`);

        // Llamar a LLM con timeout
        const response = await Promise.race([
          this.client.analyze(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('LLM timeout')), dynamicTimeout)
          )
        ]);

        // Normalizar respuesta
        const normalized = this.normalizeResponse(response, filePath);
        
        if (!normalized) {
          console.warn(`  ⚠️  Attempt ${attempt}: Invalid LLM response format`);
          lastError = new Error('Invalid response format');
          continue; // Retry
        }

        // ✅ VALIDAR respuesta del LLM
        const validated = validateLLMResponse(normalized, code, validFilePaths);
        
        if (!validated) {
          console.warn(`  ⚠️  Attempt ${attempt}: LLM response failed validation`);
          lastError = new Error('Validation failed');
          continue; // Retry
        }

        console.log(`  ✓ Validated: ${validated.localStorageKeys.length} keys, ${validated.eventNames.length} events`);

        // Guardar en caché
        if (this.cache) {
          await this.cache.set(filePath, code, prompt, validated);
        }

        return validated;

      } catch (error) {
        lastError = error;
        console.error(`  ❌ Attempt ${attempt} failed: ${error.message}`);
        
        // Backoff exponencial antes de reintentar
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`  ⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    console.error(`❌ LLM analysis failed for ${filePath} after ${maxRetries} attempts:`, lastError.message);
    return null;
  }

  /**
   * Extrae paths válidos de archivos del proyecto para validación
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
   * Analiza múltiples archivos en paralelo
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
    const allPrompts = await Promise.all(files.map(f => this.buildPrompt(f.code, f.filePath, f.staticAnalysis, f.projectContext, f.metadata)));

    // Verificar caché para cada archivo usando el prompt completo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const prompt = allPrompts[i];
      let cached = null;

      if (this.cache) {
        cached = await this.cache.get(file.filePath, file.code, prompt);
      }

      if (cached) {
        results[i] = cached;
      } else {
        filesToAnalyze.push({ ...file, prompt });
        fileIndices.push(i);
      }
    }

    // Si todos están en caché, retornar
    if (filesToAnalyze.length === 0) {
      console.log('  ✓ All files found in cache');
      return results;
    }

    console.log(`  📊 Cache hit: ${files.length - filesToAnalyze.length}/${files.length}, analyzing ${filesToAnalyze.length} files`);

    // Extraer solo los prompts de archivos no cacheados
    const prompts = filesToAnalyze.map(f => f.prompt);

    // Analizar en paralelo
    const responses = await this.client.analyzeParallel(prompts);

    // Normalizar respuestas y guardar en caché
    for (let i = 0; i < filesToAnalyze.length; i++) {
      const file = filesToAnalyze[i];
      const response = responses[i];
      const normalized = this.normalizeResponse(response, file.filePath);

      results[fileIndices[i]] = normalized;

      // Guardar en caché usando el prompt completo
      if (normalized && this.cache) {
        await this.cache.set(file.filePath, file.code, file.prompt, normalized);
      }
    }

    return results;
  }

  /**
   * Construye el prompt para el LLM usando el Prompt Engine
   * @private
   */
  async buildPrompt(code, filePath, staticAnalysis, projectContext, metadata = null) {
    try {
      // Usar el Prompt Engine para generar el prompt basado en metadatos
      const promptConfig = await promptEngine.generatePrompt(metadata || {}, code);
      
      // Validar el prompt generado
      promptEngine.validatePrompt(promptConfig);
      
      // Asegurar que el userPrompt sea un string válido
      if (typeof promptConfig.userPrompt !== 'string') {
        throw new Error(`Invalid userPrompt type: ${typeof promptConfig.userPrompt}`);
      }
      
      return promptConfig.userPrompt;
    } catch (error) {
      console.error(`Error building prompt for ${filePath}:`, error.message);
      // Fallback a prompt básico
      return `<file_content>\n${code}\n</file_content>\n\nANALYZE: Extract patterns, functions, exports, imports. Return exact strings found.`;
    }
  }

  /**
   * Normaliza y valida la respuesta del LLM (schema simplificado para LFM2)
   * @private
   */
  normalizeResponse(response, filePath) {
    if (!response || response.error) {
      console.warn(`⚠️  Invalid LLM response for ${filePath}`);
      return null;
    }

    // Si la respuesta no es JSON estructurado, intentar extraer información
    if (response.rawResponse) {
      console.warn(`⚠️  LLM returned raw text for ${filePath}, expected JSON`);
      return null;
    }

    // NUEVO: Schema simplificado para LFM2-Extract
    // El nuevo formato es más plano y fácil de parsear
    const normalized = {
      source: 'llm',
      confidence: response.confidence || 0.8,
      // Convertir nuevo formato al formato interno
      sharedState: this.normalizeSharedStateFromSimple(response.localStorageKeys || [], response.connectionType),
      events: this.normalizeEventsFromSimple(response.eventNames || [], response.connectionType),
      sideEffects: [],
      affectedFiles: response.connectedFiles || [],
      suggestedConnections: [],
      hiddenConnections: [],
      reasoning: response.reasoning || 'No reasoning provided',
      // Campos nuevos del schema simplificado
      localStorageKeys: response.localStorageKeys || [],
      eventNames: response.eventNames || [],
      connectionType: response.connectionType || 'none'
    };

    // Filtrar por umbral de confianza
    if (normalized.confidence < this.config.analysis.confidenceThreshold) {
      console.warn(
        `⚠️  LLM confidence too low (${normalized.confidence}) for ${filePath}`
      );
      return null;
    }

    return normalized;
  }

  /**
   * Convierte el formato simplificado de localStorage al formato interno
   * @private
   */
  normalizeSharedStateFromSimple(keys, connectionType) {
    if (!keys || keys.length === 0) return { reads: [], writes: [] };
    
    // Asumimos que son todas lecturas/escrituras según el contexto
    // El extractor estático ya determinó eso con precisión
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
 * Factory function para crear LLMAnalyzer con configuración cargada
 * @param {string} projectPath - Ruta del proyecto (opcional)
 * @returns {Promise<LLMAnalyzer>}
 */
export async function createLLMAnalyzer(projectPath = process.cwd()) {
  const config = await loadAIConfig();
  return new LLMAnalyzer(config, projectPath);
}
