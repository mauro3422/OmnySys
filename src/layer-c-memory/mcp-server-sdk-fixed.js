  async autoStartLLM() {
    try {
      const aiConfig = await loadAIConfig();
      if (!aiConfig.llm.enabled) {
        console.error('   â„¹ï¸  LLM disabled in config');
        return false;
      }

      const client = new LLMClient(aiConfig);
      console.error('   ðŸ” Checking if LLM server is already running...');
      
      try {
        const health = await client.healthCheck();
        if (health.gpu || health.cpu) {
          console.error('   âœ“ LLM server already running on port 8000');
          return true;
        }
      } catch {}

      const lockFile = path.join(process.env.TEMP || '/tmp', 'omny_brain_gpu.lock');
      try { await fs.unlink(lockFile); } catch {}

      console.error('   ðŸš€ Starting LLM server in new terminal...');
      const OmnySysRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
      const gpuScript = path.join(OmnySysRoot, 'src/ai/scripts/brain_gpu.bat');

      const { exec } = await import('child_process');
      exec('start "CogniSystem LLM" cmd /c "' + gpuScript + '"', { cwd: OmnySysRoot });

      console.error('   âœ“ New terminal opened: "CogniSystem LLM"');
      console.error('   â³ Waiting 15s for startup...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      try {
        const health = await client.healthCheck();
        if (health.gpu || health.cpu) {
          console.error('   âœ… LLM server ready');
          return true;
        }
      } catch {}

      console.error('   â³ LLM still loading (may need more time)');
      return true;
      
    } catch (error) {
      console.error('   âŒ LLM start failed: ' + error.message);
      return false;
    }
  }

