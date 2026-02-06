/**
 * llm-client.js
 * Cliente HTTP para comunicarse con servidores llama-server locales
 * Soporta múltiples servidores (GPU/CPU) en paralelo
 */

/**
 * Limpia una respuesta de LLM para extraer JSON válido
 * Elimina markdown, comentarios y otros artefactos
 * Maneja casos edge: comillas simples, comillas escapadas, JSON incompleto
 * @param {string} response - Respuesta cruda del LLM
 * @returns {string} - JSON limpio
 */
function cleanLLMResponse(response) {
  if (!response || typeof response !== 'string') {
    return response;
  }

  let cleaned = response;

  // 1. Eliminar bloques de código markdown (```json ... ```)
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/```/g, '');

  // 2. Eliminar comentarios de una línea
  cleaned = cleaned.replace(/\/\/.*$/gm, '');

  // 3. Eliminar comentarios multilínea
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 4. Eliminar trailing commas (comas al final de objetos/arrays)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 5. Normalizar comillas: reemplazar comillas simples por dobles
  // PERO preservar comillas dentro de strings ya existentes
  // Estrategia: primero encontrar todos los strings con comillas dobles
  const stringPattern = /"(?:[^"\\]|\\.)*"/g;
  const strings = [];
  let match;
  while ((match = stringPattern.exec(cleaned)) !== null) {
    strings.push({ text: match[0], index: match.index });
  }
  
  // Reemplazar comillas simples por dobles, excepto dentro de strings ya protegidos
  let result = '';
  let lastIndex = 0;
  for (const str of strings) {
    // Procesar texto antes del string
    const before = cleaned.slice(lastIndex, str.index);
    result += before.replace(/'/g, '"');
    // Agregar el string original sin cambios
    result += str.text;
    lastIndex = str.index + str.text.length;
  }
  // Procesar resto del texto
  result += cleaned.slice(lastIndex).replace(/'/g, '"');
  cleaned = result;

  // 6. Eliminar espacios en blanco al inicio y final
  cleaned = cleaned.trim();

  // 7. Si la respuesta empieza con texto antes del JSON, intentar encontrar el inicio del JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonArrayStart = cleaned.indexOf('[');
  
  if (jsonStart !== -1 || jsonArrayStart !== -1) {
    const startIndex = jsonStart !== -1 && jsonArrayStart !== -1 
      ? Math.min(jsonStart, jsonArrayStart)
      : Math.max(jsonStart, jsonArrayStart);
    
    if (startIndex > 0) {
      cleaned = cleaned.substring(startIndex);
    }
  }

  // 8. Si hay texto después del JSON válido, eliminarlo
  // Encontrar el último } o ] balanceado
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidIndex = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !inString) {
      inString = true;
    } else if (char === '"' && inString) {
      inString = false;
    } else if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
    
    // Si estamos balanceados, marcar esta posición como válida
    if (!inString && braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
      lastValidIndex = i;
    }
  }

  if (lastValidIndex !== -1 && lastValidIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastValidIndex + 1);
  }

  // 9. Última limpieza: eliminar caracteres no válidos al inicio/final
  cleaned = cleaned.trim();
  
  // 10. Verificar que empieza con { o [
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    // Intentar encontrar el primer { o [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const firstValid = Math.min(
      firstBrace !== -1 ? firstBrace : Infinity,
      firstBracket !== -1 ? firstBracket : Infinity
    );
    if (firstValid !== Infinity) {
      cleaned = cleaned.substring(firstValid);
    }
  }

  return cleaned.trim();
}

/**
 * Normaliza la respuesta del análisis para manejar diferentes estructuras
 * El LLM a veces devuelve orphan como boolean directo o como objeto anidado
 * @param {object} parsed - Respuesta parseada del LLM
 * @returns {object} - Respuesta normalizada con estructura consistente
 */
function normalizeAnalysisResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const normalized = { ...parsed };

  // Normalizar estructura de orphan
  // Caso 1: parsed.orphan es boolean directo (incorrecto)
  // Caso 2: parsed.analysis.orphan.isOrphan es boolean (correcto)
  if (typeof parsed.orphan === 'boolean') {
    // El LLM puso orphan: false/true directamente, mover a estructura anidada
    normalized.analysis = normalized.analysis || {};
    normalized.analysis.orphan = {
      isOrphan: parsed.orphan,
      dependentCount: parsed.analysis?.orphan?.dependentCount || 0,
      suggestions: parsed.analysis?.orphan?.suggestions || []
    };
    delete normalized.orphan; // Eliminar el campo plano
  }

  // Asegurar que analysis.orphan existe
  if (!normalized.analysis) {
    normalized.analysis = {};
  }
  if (!normalized.analysis.orphan) {
    normalized.analysis.orphan = {
      isOrphan: false,
      dependentCount: 0,
      suggestions: []
    };
  }

  // Normalizar estructura de semantic
  if (!normalized.analysis.semantic) {
    normalized.analysis.semantic = {
      sharedState: [],
      events: { emits: [], listens: [] },
      connections: []
    };
  }

  // Asegurar que semantic.sharedState es array
  if (!Array.isArray(normalized.analysis.semantic.sharedState)) {
    normalized.analysis.semantic.sharedState = [];
  }

  // Asegurar que semantic.events existe
  if (!normalized.analysis.semantic.events) {
    normalized.analysis.semantic.events = { emits: [], listens: [] };
  }

  // Normalizar estructura de patterns
  if (!normalized.analysis.patterns) {
    normalized.analysis.patterns = {
      isStateManager: false,
      isSingleton: false,
      isGodObject: false,
      hasSideEffects: false
    };
  }

  return normalized;
}

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
      const finalSystemPrompt = systemPrompt || this.config.prompts.systemPrompt;

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
            console.error(`❌ LLM analyze error for prompt ${i + idx}:`, err.message);
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
    // Retornar config por defecto con LLM habilitado (auto-detect)
    // El sistema usará IA cuando los metadatos indiquen casos complejos
    return {
      llm: { enabled: true },
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
