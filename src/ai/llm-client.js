/**
 * llm-client.js
 * Cliente HTTP para comunicarse con servidores llama-server locales
 * Soporta múltiples servidores (GPU/CPU) en paralelo
 */

/**
 * Cliente para servidores LLM locales
 */
export class LLMClient {
  constructor(config) {
    this.config = config;
    this.servers = {
      gpu: {
        url: `http://127.0.0.1:${config.llm.gpu.port}`,
        available: false,
        activeRequests: 0,
        maxParallel: config.llm.gpu.parallel || 4
      },
      cpu: {
        url: `http://127.0.0.1:${config.llm.cpu.port}`,
        available: false,
        activeRequests: 0,
        maxParallel: config.llm.cpu.parallel || 4
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
   * @param {string} prompt - Prompt para el LLM
   * @param {string} mode - 'gpu' o 'cpu'
   * @returns {Promise<object>} - Respuesta del LLM
   */
  async analyze(prompt, mode = 'gpu') {
    const server = this.selectServer(mode);
    if (!server) {
      throw new Error('No LLM server available');
    }

    this.servers[server].activeRequests++;

    try {
      const response = await fetch(`${this.servers[server].url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'local-model', // llama-server ignora esto, usa el modelo cargado
          messages: [
            {
              role: 'system',
              content: this.config.prompts.systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.0, // Greedy decoding for LFM2-Extract
          max_tokens: 1000,
          stream: false
          // JSON Schema forzado a nivel de servidor con --json-schema-file
        }),
        signal: AbortSignal.timeout(this.config.performance.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ LLM HTTP ERROR ${response.status}: ${errorText.slice(0, 500)}`);
        throw new Error(`LLM server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from LLM server');
      }

      // ✅ DEBUGGING: Log raw LLM response
      console.log(`\n🤖 RAW LLM RESPONSE (length: ${content.length} chars):\n${content.slice(0, 1000)}\n...\n`);

      // Intentar parsear como JSON
      try {
        const parsed = JSON.parse(content);

        // Agregar defaults para campos opcionales (el LLM puede omitirlos para ahorrar tokens)
        return {
          sharedState: parsed.sharedState || [],
          events: parsed.events || [],
          hiddenConnections: parsed.hiddenConnections || [],
          suggestedConnections: parsed.suggestedConnections || [],
          subsystemStatus: parsed.subsystemStatus || 'unknown',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'No reasoning provided'
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
   * Procesa un batch de prompts con límite de concurrencia
   * @private
   */
  async analyzeBatch(prompts, mode) {
    const results = [];
    const limit = this.config.performance.maxConcurrentAnalyses;

    for (let i = 0; i < prompts.length; i += limit) {
      const batch = prompts.slice(i, i + limit);
      const batchResults = await Promise.all(
        batch.map((prompt, idx) => this.analyze(prompt, mode).catch(err => {
          console.error(`❌ LLM analyze error for prompt ${i + idx}:`, err.message);
          console.error(`Prompt preview: ${prompt.slice(0, 200)}...`);
          return { error: err.message };
        }))
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

/**
 * Carga la configuración de AI
 * @param {string} configPath - Ruta al archivo de configuración
 * @returns {Promise<object>} - Configuración cargada
 */
export async function loadAIConfig(configPath = 'src/ai/ai-config.json') {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    // Si es una ruta relativa, resolverla desde la raíz del proyecto
    let absolutePath = configPath;
    if (!path.isAbsolute(configPath)) {
      // Asumimos que estamos en src/ai/ y la config está en src/ai/ai-config.json
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      absolutePath = path.resolve(__dirname, '../../', configPath);
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load AI config:', error.message);
    // Retornar config por defecto con LLM deshabilitado
    return {
      llm: { enabled: false },
      analysis: {
        useStaticFirst: true,
        llmOnlyForComplex: true,
        complexityThreshold: 0.7,
        confidenceThreshold: 0.8
      },
      performance: {
        enableCPUFallback: false,
        maxConcurrentAnalyses: 4,
        timeout: 30000
      },
      prompts: {
        systemPrompt: "You are a semantic code analyzer.",
        analysisTemplate: ""
      }
    };
  }
}
