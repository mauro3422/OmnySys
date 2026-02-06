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
