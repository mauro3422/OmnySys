import { cleanLLMResponse, normalizeAnalysisResponse } from './response-cleaner.js';

/**
 * Cliente para servidores LLM locales
 */
export class LLMClient {
  constructor(config) {
    this.config = config || {};

    // Safety defaults
    this.config.prompts = this.config.prompts || {
      systemPrompt: "You are a semantic code analyzer. Return ONLY valid JSON.",
      analysisTemplate: ""
    };
    this.config.performance = this.config.performance || {};
    this.config.performance.timeout = this.config.performance.timeout || 120000;
    this.config.performance.maxConcurrentAnalyses = this.config.performance.maxConcurrentAnalyses || 4;

    this.servers = {
      gpu: {
        url: `http://127.0.0.1:${this.config.llm?.gpu?.port || 8000}`,
        available: false,
        activeRequests: 0,
        maxParallel: this.config.llm?.gpu?.parallel || 4
      },
      cpu: {
        url: `http://127.0.0.1:${this.config.llm?.cpu?.port || 8001}`,
        available: false,
        activeRequests: 0,
        maxParallel: this.config.llm?.cpu?.parallel || 4
      }
    };
  }

  /**
   * Verifica si los servidores están disponibles
   * @returns {Promise<{gpu: boolean, cpu: boolean}>}
   */
  async healthCheck() {
    const results = { gpu: false, cpu: false };

    // Check GPU server
    try {
      const response = await fetch(`${this.servers.gpu.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      results.gpu = response.ok;
      this.servers.gpu.available = response.ok;
    } catch (error) {
      this.servers.gpu.available = false;
    }

    // Check CPU server if enabled
    if (this.config.performance.enableCPUFallback) {
      try {
        const response = await fetch(`${this.servers.cpu.url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        results.cpu = response.ok;
        this.servers.cpu.available = response.ok;
      } catch (error) {
        this.servers.cpu.available = false;
      }
    }

    return results;
  }

  /**
   * Selecciona el mejor servidor disponible
   * @param {string} preferredMode - 'gpu' o 'cpu'
   * @returns {string|null} - 'gpu', 'cpu', o null si ninguno disponible
   */
  selectServer(preferredMode = 'gpu') {
    // Preferir el modo solicitado si está disponible y tiene slots libres
    if (
      this.servers[preferredMode]?.available &&
      this.servers[preferredMode].activeRequests < this.servers[preferredMode].maxParallel
    ) {
      return preferredMode;
    }

    // Fallback al otro servidor si está habilitado
    const fallbackMode = preferredMode === 'gpu' ? 'cpu' : 'gpu';
    if (
      this.config.performance.enableCPUFallback &&
      this.servers[fallbackMode]?.available &&
      this.servers[fallbackMode].activeRequests < this.servers[fallbackMode].maxParallel
    ) {
      return fallbackMode;
    }

    return null;
  }

  /**
   * Analiza código usando LLM
   * @param {string} prompt - Prompt para el LLM (user prompt)
   * @param {Object} options - Opciones adicionales
   * @param {string} options.mode - 'gpu' o 'cpu'
   * @param {string} options.systemPrompt - System prompt personalizado (opcional)
   * @returns {Promise<object>} - Respuesta del LLM
   */
  async analyze(prompt, options = {}) {
    const { mode = 'gpu', systemPrompt = null } = options;

    const server = this.selectServer(mode);
    if (!server) {
      throw new Error('No LLM server available');
    }

    this.servers[server].activeRequests++;

    try {
      // Validar que el prompt sea un string válido
      if (typeof prompt !== 'string') {
        throw new Error(`Invalid prompt type: ${typeof prompt}. Expected string.`);
      }

      // Usar system prompt personalizado si se proporciona, sino el de la config
      const finalSystemPrompt = systemPrompt || this.config.prompts?.systemPrompt || "You are a semantic code analyzer. Return ONLY valid JSON.";

      const timeoutMs = this.config.performance?.timeout || 120000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        console.log(`📡 [LLMClient] Sending request to ${this.servers[server].url} (timeout: ${timeoutMs}ms)`);

        response = await fetch(`${this.servers[server].url}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'local-model', // llama-server ignora esto, usa el modelo cargado
            messages: [
              {
                role: 'system',
                content: finalSystemPrompt
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1, // LFM2.5-Instruct recommended temperature
            max_tokens: 1000,
            stream: false
            // JSON Schema forzado a nivel de servidor con --json-schema-file
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`âŒ LLM HTTP ERROR ${response.status}: ${errorText.slice(0, 500)}`);
        throw new Error(`LLM server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from LLM server');
      }

      // ✅ DEBUGGING: Log raw LLM response
      console.log(`\nðŸ¤– RAW LLM RESPONSE (length: ${content.length} chars):\n${content.slice(0, 1000)}\n...\n`);

      // Intentar parsear como JSON (con limpieza de markdown)
      try {
        const cleanedContent = cleanLLMResponse(content);
        const parsed = JSON.parse(cleanedContent);

        // Normalizar estructura de respuesta
        const normalized = normalizeAnalysisResponse(parsed);

        // ✅ CORREGIDO: Preservar TODOS los campos del LLM, no solo los hardcodeados
        return {
          ...normalized,
          sharedState: normalized.sharedState || [],
          events: normalized.events || [],
          confidence: normalized.confidence || 0.5,
          reasoning: normalized.reasoning || 'No reasoning provided'
        };
      } catch (parseError) {
        // Si no es JSON válido, retornar estructura default
        console.warn('LLM response is not valid JSON:', content);
        return {
          sharedState: [],
          events: [],
          hiddenConnections: [],
          suggestedConnections: [],
          subsystemStatus: 'unknown',
          confidence: 0.0,
          reasoning: `Parse error: ${parseError.message}`
        };
      }
    } finally {
      this.servers[server].activeRequests--;
    }
  }

  /**
   * Analiza múltiples prompts en paralelo usando ambos servidores
   * @param {string[]} prompts - Array de prompts
   * @returns {Promise<object[]>} - Array de respuestas
   */
  async analyzeParallel(prompts) {
    if (!this.config.performance.enableCPUFallback) {
      // Solo GPU disponible, procesar secuencialmente con límite de concurrencia
      return this.analyzeBatch(prompts, 'gpu');
    }

    // Ambos servidores disponibles, distribuir carga
    const gpuPrompts = [];
    const cpuPrompts = [];

    // Distribuir: GPU para prompts pares, CPU para impares
    prompts.forEach((prompt, index) => {
      if (index % 2 === 0) {
        gpuPrompts.push({ prompt, index });
      } else {
        cpuPrompts.push({ prompt, index });
      }
    });

    // Ejecutar en paralelo
    const [gpuResults, cpuResults] = await Promise.all([
      this.analyzeBatch(gpuPrompts.map(p => p.prompt), 'gpu'),
      this.analyzeBatch(cpuPrompts.map(p => p.prompt), 'cpu')
    ]);

    // Re-ensamblar en orden original
    const results = new Array(prompts.length);
    gpuPrompts.forEach((p, i) => {
      results[p.index] = gpuResults[i];
    });
    cpuPrompts.forEach((p, i) => {
      results[p.index] = cpuResults[i];
    });

    return results;
  }

  /**
   * Analiza múltiples prompts con system prompts personalizados en paralelo
   * @param {string[]} userPrompts - Array de user prompts
   * @param {string[]} systemPrompts - Array de system prompts (mismo orden que userPrompts)
   * @returns {Promise<object[]>} - Array de respuestas
   */
  async analyzeParallelWithSystemPrompts(userPrompts, systemPrompts = []) {
    if (!this.config.performance.enableCPUFallback) {
      // Solo GPU disponible, procesar secuencialmente con límite de concurrencia
      return this.analyzeBatchWithPrompts(userPrompts, systemPrompts, 'gpu');
    }

    // Ambos servidores disponibles, distribuir carga
    const gpuPrompts = [];
    const cpuPrompts = [];
    const gpuSystem = [];
    const cpuSystem = [];

    // Distribuir: GPU para prompts pares, CPU para impares
    for (let i = 0; i < userPrompts.length; i++) {
      if (i % 2 === 0) {
        gpuPrompts.push(userPrompts[i]);
        gpuSystem.push(systemPrompts[i] || null);
      } else {
        cpuPrompts.push(userPrompts[i]);
        cpuSystem.push(systemPrompts[i] || null);
      }
    }

    // Ejecutar en paralelo
    const [gpuResults, cpuResults] = await Promise.all([
      this.analyzeBatchWithPrompts(gpuPrompts, gpuSystem, 'gpu'),
      this.analyzeBatchWithPrompts(cpuPrompts, cpuSystem, 'cpu')
    ]);

    // Re-ensamblar en orden original
    const results = new Array(userPrompts.length);
    let gpuIndex = 0;
    let cpuIndex = 0;

    for (let i = 0; i < userPrompts.length; i++) {
      if (i % 2 === 0) {
        results[i] = gpuResults[gpuIndex++];
      } else {
        results[i] = cpuResults[cpuIndex++];
      }
    }

    return results;
  }

  /**
   * Analiza múltiples prompts con límite de concurrencia
   * @private
   */
  async analyzeBatch(prompts, mode) {
    const results = [];
    const limit = this.config.performance.maxConcurrentAnalyses;

    for (let i = 0; i < prompts.length; i += limit) {
      const batchPrompts = prompts.slice(i, i + limit);

      const batchResults = await Promise.all(
        batchPrompts.map((prompt, idx) => this.analyze(prompt, { mode }).catch(err => {
          console.error(`âŒ LLM analyze error for prompt ${i + idx}:`, err.message);
          console.error(`Prompt preview: ${prompt.slice(0, 200)}...`);
          return { error: err.message };
        }))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Procesa un batch de prompts con system prompts personalizados con límite de concurrencia
   * @private
   */
  async analyzeBatchWithPrompts(userPrompts, systemPrompts = [], mode) {
    const results = [];
    const limit = this.config.performance.maxConcurrentAnalyses;

    for (let i = 0; i < userPrompts.length; i += limit) {
      const batchUserPrompts = userPrompts.slice(i, i + limit);
      const batchSystemPrompts = systemPrompts.slice(i, i + limit);

      const batchResults = await Promise.all(
        batchUserPrompts.map((prompt, idx) => {
          const systemPrompt = batchSystemPrompts[idx] || null;
          return this.analyze(prompt, { mode, systemPrompt }).catch(err => {
            console.error(`âŒ LLM analyze error for prompt ${i + idx}:`, err.message);
            console.error(`Prompt preview: ${prompt.slice(0, 200)}...`);
            return { error: err.message };
          });
        })
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Construye un prompt de análisis a partir de código
   * @param {string} code - Código a analizar
   * @param {string} filePath - Ruta del archivo
   * @returns {string} - Prompt formateado
   */
  buildAnalysisPrompt(code, filePath) {
    return this.config.prompts.analysisTemplate
      .replace('{filePath}', filePath)
      .replace('{code}', code);
  }
}
