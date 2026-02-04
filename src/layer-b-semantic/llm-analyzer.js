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
        const prompt = this.buildPrompt(code, filePath, staticAnalysis, projectContext, metadata);

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
    const allPrompts = files.map(f => this.buildPrompt(f.code, f.filePath, f.staticAnalysis, f.projectContext, f.metadata));

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
   * Construye el prompt para el LLM con contexto LIMITADO y ENFOCADO
   * @private
   */
  buildPrompt(code, filePath, staticAnalysis, projectContext, metadata = null) {
    // =============================================================================
    // REGLA CRITICA DE ORO: SOLO PASAR CONTEXTO RELEVANTE AL LLM
    // =============================================================================
    // NUNCA pasar todo el system-map o archivos sin conexion al LLM.
    // El LLM tiene contexto LIMITADO (15K tokens por slot con 8GB VRAM).
    // Contexto irrelevante = ruido = alucinaciones = tokens desperdiciados.
    //
    // SOLO incluir en el prompt:
    //   1. Archivos con SHARED STATE común (localStorage, global vars)
    //   2. Archivos con EVENTOS comunes (addEventListener, emit)
    //   3. Imports DIRECTOS del archivo analizado
    //   4. Archivos del proyecto con patrones relevantes (limitado a 5)
    //
    // NUNCA incluir:
    //   - Archivos sin conexión semántica
    //   - Metadata vacía (JSDoc sin contratos, async sin patrones)
    //   - Todo el system-map completo
    //   - Funciones de archivos no relacionados
    //
    // CADA token debe tener proposito. Tokens irrelevantes = capacidad perdida.
    // =============================================================================
    // Construir lista de "sospechosos" (archivos que PODRÍAN estar conectados)
    let suspectsStr = 'No suspects identified';
    if (projectContext?.fileSpecific) {
      const suspects = [];

      // Archivos con shared state común (ALTA PRIORIDAD)
      if (projectContext.fileSpecific.relatedFiles.sharedStateWith?.length > 0) {
        suspects.push('\n### Files with SHARED STATE:');
        projectContext.fileSpecific.relatedFiles.sharedStateWith.forEach(f => {
          suspects.push(`- ${f.file}: ${f.reason}`);
          suspects.push(`  Properties: ${f.sharedProperties.join(', ')}`);
        });
      }

      // Archivos con eventos comunes (ALTA PRIORIDAD)
      if (projectContext.fileSpecific.relatedFiles.eventsConnectedTo?.length > 0) {
        suspects.push('\n### Files with SHARED EVENTS:');
        projectContext.fileSpecific.relatedFiles.eventsConnectedTo.forEach(f => {
          suspects.push(`- ${f.file}: ${f.reason}`);
          suspects.push(`  Events: ${f.sharedEvents.join(', ')}`);
        });
      }

      // TODOS los imports directos con metadatos (son criticos para entender dependencias)
      // Cada import incluye: exports, localStorage, eventos que maneja
      // Esto permite al LLM ver conexiones indirectas sin ver el codigo completo
      if (projectContext.fileSpecific.relatedFiles.imports?.length > 0) {
        suspects.push('\n### Direct Imports (with metadata):');
        projectContext.fileSpecific.relatedFiles.imports.forEach(imp => {
          const parts = [`- ${imp.file}`];
          
          // Solo mostrar info relevante (no todo)
          if (imp.exports?.length > 0) {
            parts.push(`  Exports: ${imp.exports.join(', ')}`);
          }
          if (imp.hasLocalStorage && imp.localStorageKeys?.length > 0) {
            parts.push(`  localStorage: [${imp.localStorageKeys.join(', ')}]`);
          }
          if (imp.eventEmitters?.length > 0) {
            parts.push(`  Emits: [${imp.eventEmitters.join(', ')}]`);
          }
          if (imp.eventListeners?.length > 0) {
            parts.push(`  Listens: [${imp.eventListeners.join(', ')}]`);
          }
          
          suspects.push(parts.join('\n'));
        });
      }

      // ✅ NUEVO: Si hay metadata de todos los archivos del proyecto, incluirla (LIMITADO)
      if (projectContext.fileSpecific.allProjectFiles?.length > 0) {
        // Priorizar archivos con localStorage, eventos, o shared state
        const relevantFiles = projectContext.fileSpecific.allProjectFiles.filter(f =>
          f.sharedState.reads.length > 0 ||
          f.sharedState.writes.length > 0 ||
          f.events.emits.length > 0 ||
          f.events.listens.length > 0
        );

        // Limitar a máximo 5 archivos más relevantes (era 10, reducido para ahorrar tokens)
        const filesToShow = relevantFiles.slice(0, 5);

        if (filesToShow.length > 0) {
          suspects.push('\n### RELEVANT PROJECT FILES (with localStorage/events):');
          filesToShow.forEach(file => {
            const parts = [];
            parts.push(`- ${file.path}`);

            if (file.sharedState.reads.length > 0) {
              parts.push(`  Reads: ${file.sharedState.reads.join(', ')}`);
            }

            if (file.sharedState.writes.length > 0) {
              parts.push(`  Writes: ${file.sharedState.writes.join(', ')}`);
            }

            if (file.events.emits.length > 0) {
              parts.push(`  Emits: ${file.events.emits.join(', ')}`);
            }

            if (file.events.listens.length > 0) {
              parts.push(`  Listens: ${file.events.listens.join(', ')}`);
            }

            suspects.push(parts.join('\n'));
          });

          if (relevantFiles.length > 10) {
            suspects.push(`\n... and ${relevantFiles.length - 10} more files with similar patterns`);
          }
        }
      }

      suspectsStr = suspects.length > 0 ? suspects.join('\n') : 'No obvious suspects';
    }

    // Construir contexto del análisis estático (ULTRA COMPACTO)
    let staticAnalysisStr = 'none';
    if (staticAnalysis) {
      const compact = [];
      const ss = staticAnalysis.sharedState || {};
      const ev = staticAnalysis.eventPatterns || {};
      
      if (ss.reads?.length) compact.push(`reads:[${ss.reads.slice(0,5).join(',')}]`);
      if (ss.writes?.length) compact.push(`writes:[${ss.writes.slice(0,5).join(',')}]`);
      if (ev.eventListeners?.length) compact.push(`listeners:[${ev.eventListeners.slice(0,5).join(',')}]`);
      if (ev.eventEmitters?.length) compact.push(`emitters:[${ev.eventEmitters.slice(0,5).join(',')}]`);
      
      staticAnalysisStr = compact.length ? compact.join('|') : 'none';
    }

    // Construir contexto de subsistemas
    const subsystemContext = projectContext?.fileSpecific?.subsystemContext || 'No subsystem information available';

    // Construir metadata adicional del archivo
    let metadataStr = 'No additional metadata';
    const fileMetadata = metadata || projectContext?.fileSpecific?.metadata;
    if (fileMetadata) {
      const metadataParts = [];
      
      // JSDoc contracts
      if (fileMetadata.jsdoc?.all?.length > 0) {
        metadataParts.push(`### JSDoc Contracts (${fileMetadata.jsdoc.all.length}):`);
        fileMetadata.jsdoc.all.slice(0, 5).forEach(contract => {
          metadataParts.push(`- @${contract.tag}${contract.name ? ` ${contract.name}` : ''}${contract.type ? ` {${contract.type}}` : ''}`);
        });
      }
      
      // Async patterns
      if (fileMetadata.async?.all?.length > 0) {
        metadataParts.push(`\n### Async Patterns (${fileMetadata.async.all.length}):`);
        fileMetadata.async.asyncFunctions?.slice(0, 3).forEach(fn => {
          metadataParts.push(`- async function ${fn.name}`);
        });
        fileMetadata.async.promiseAll?.slice(0, 2).forEach(p => {
          metadataParts.push(`- Promise.all with ${p.concurrentCalls} concurrent calls`);
        });
      }
      
      // Error handling
      if (fileMetadata.errors?.all?.length > 0) {
        metadataParts.push(`\n### Error Handling (${fileMetadata.errors.all.length} patterns):`);
        if (fileMetadata.errors.tryBlocks?.length > 0) {
          metadataParts.push(`- ${fileMetadata.errors.tryBlocks.length} try/catch blocks`);
        }
        if (fileMetadata.errors.customErrors?.length > 0) {
          metadataParts.push(`- Custom errors: ${fileMetadata.errors.customErrors.map(e => e.name).join(', ')}`);
        }
      }
      
      // Build flags
      if (fileMetadata.build?.envVars?.length > 0) {
        metadataParts.push(`\n### Build-time Flags:`);
        fileMetadata.build.envVars.forEach(env => {
          metadataParts.push(`- ${env.name}: ${env.values?.slice(0, 3).join(', ') || 'various'}`);
        });
      }
      
      // Nuevas conexiones (CSS-in-JS, TypeScript, Redux)
      const connections = projectContext?.fileSpecific?.connections;
      if (connections) {
        if (connections.cssInJS?.length > 0) {
          metadataParts.push(`\n### CSS-in-JS Connections (${connections.cssInJS.length}):`);
          connections.cssInJS.slice(0, 3).forEach(conn => {
            metadataParts.push(`- ${conn.type}: ${conn.component} uses ${conn.themeUsage?.slice(0, 2).join(', ') || 'theme'}`);
          });
        }
        if (connections.redux?.length > 0) {
          metadataParts.push(`\n### Redux/Context (${connections.redux.length}):`);
          connections.redux.slice(0, 3).forEach(conn => {
            metadataParts.push(`- ${conn.type}: ${conn.selector || conn.action || conn.context}`);
          });
        }
      }
      
      metadataStr = metadataParts.join('\n') || 'No significant metadata';
    }

    // Usar template del config
    const prompt = this.config.prompts.analysisTemplate
      .replace('{projectContext}', suspectsStr)
      .replace('{filePath}', filePath)
      .replace('{code}', code.slice(0, 15000)) // Limitar a 15KB (~3750 tokens) para evitar overflow
      .replace('{staticAnalysis}', staticAnalysisStr)
      .replace('{subsystemContext}', subsystemContext)
      .replace('{metadata}', metadataStr);

    return prompt;
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
