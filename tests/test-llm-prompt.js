#!/usr/bin/env node
/**
 * Script de prueba rápida para prompts de LLM
 * Permite probar diferentes prompts con metadatos reales sin ejecutar todo el sistema
 * 
 * Uso: node test-llm-prompt.js <archivo-test>
 * Ejemplo: node test-llm-prompt.js test-cases/scenario-6-god-object/src/Core.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============ CONFIGURACIÓN ============
const LLM_SERVER_URL = 'http://localhost:8000/v1/chat/completions';
const TIMEOUT = 60000;

// ============ TEMPLATES DE PRUEBA ============
const TEST_TEMPLATES = {
  'god-object-v1': {
    name: 'God Object - XML Fencing v1',
    systemPrompt: `You are a specialized data extractor. Return ONLY valid JSON.

<schema>
REQUIRED OUTPUT FORMAT (root object, NO wrappers):
{
  "confidence": 0.0,
  "riskLevel": "high|medium|low|none",
  "responsibilities": ["string"],
  "couplingAnalysis": {"impactScore": 0.0},
  "reasoning": "string"
}

FIELD DEFINITIONS:
- confidence: number 0.0-1.0 based on pattern clarity
- riskLevel: "high" (>10 deps), "medium" (5-10), "low" (single resp), "none"
- responsibilities: Extract from function names: ["logging", "config", "data-access"]
- couplingAnalysis.impactScore: 0.0-1.0 architectural risk
- reasoning: 1 sentence explanation
</schema>

<rules>
COGNITIVE VACCINES:
- Extract ONLY from the <target_file>
- DO NOT invent responsibilities
- DO NOT wrap response in extra objects
- Return riskLevel:"none" if not a God Object
- COPY exact function names
</rules>`,

    userPrompt: `<target_file path="{filePath}">
<coupling_metadata>
- Export count: {exportCount}
- Dependent count: {dependentCount}
- Export names: {exports}
</coupling_metadata>

<code>
{fileContent}
</code>
</target_file>

Extract God Object pattern data following the <schema>. Return ONLY valid JSON (root object, no wrappers).`
  },

  'god-object-v2': {
    name: 'God Object - Simple Schema v2',
    systemPrompt: `Extract God Object data as JSON. Return root object directly.

FORMAT:
{
  "confidence": 0.0-1.0,
  "riskLevel": "high|medium|low|none",
  "responsibilities": ["string"],
  "impactScore": 0.0-1.0,
  "reasoning": "string"
}

RULES:
- Extract from code: responsibilities = purposes of exported functions
- riskLevel: high if >10 dependents with mixed purposes
- NO wrappers, NO extra objects
- Return "none" if not God Object`,

    userPrompt: `FILE: {filePath}
EXPORTS: {exports}
DEPENDENTS: {dependentCount}

CODE:
{fileContent}

Extract God Object data as JSON.`
  },

  'god-object-v3': {
    name: 'God Object - ChatML v3',
    systemPrompt: `<|im_start|>system
Extract structured data and return JSON.

Schema:
{
  "confidence": number,
  "riskLevel": "high|medium|low|none", 
  "responsibilities": string[],
  "impactScore": number,
  "reasoning": string
}

Instructions:
- Analyze exports and their purposes
- riskLevel based on coupling + responsibility mixing
- Responsibilities from: export names, function purposes
- Be objective: high usage ≠ God Object if single purpose
<|im_end|>`,

    userPrompt: `<|im_start|>user
File: {filePath}
Exports: {exportCount} ({exports})
Dependents: {dependentCount}

Code:
{fileCode}

Extract God Object analysis.<|im_end|>
<|im_start|>assistant`
  }
};

// ============ FUNCIONES ============

async function analyzeWithLLM(promptConfig) {
  console.log('📤 Enviando a LLM...');
  
  const response = await fetch(LLM_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
    body: JSON.stringify({
      model: 'local-model',
      messages: [
        { role: 'system', content: promptConfig.systemPrompt },
        { role: 'user', content: promptConfig.userPrompt }
      ],
      temperature: 0.0,
      max_tokens: 1000,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

function parseLLMResponse(content) {
  try {
    // Intentar parsear directamente
    return JSON.parse(content);
  } catch (e) {
    // Buscar JSON en markdown
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function validateGodObjectResponse(response) {
  const checks = {
    hasConfidence: typeof response.confidence === 'number',
    hasRiskLevel: ['high', 'medium', 'low', 'none'].includes(response.riskLevel),
    hasResponsibilities: Array.isArray(response.responsibilities),
    responsibilitiesCount: response.responsibilities?.length || 0,
    hasImpactScore: typeof (response.couplingAnalysis?.impactScore || response.impactScore) === 'number',
    hasReasoning: typeof response.reasoning === 'string',
    noWrapper: !response.couplingAnalysis?.responsibilities && !response.godObjectPattern,
    isRootObject: Object.keys(response).every(k => 
      ['confidence', 'riskLevel', 'responsibilities', 'couplingAnalysis', 'impactScore', 'reasoning'].includes(k)
    )
  };
  
  checks.valid = checks.hasConfidence && checks.hasRiskLevel && 
                 checks.hasResponsibilities && checks.hasImpactScore;
  
  return checks;
}

// ============ MAIN ============

async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Uso: node test-llm-prompt.js <archivo>');
    console.log('Ejemplo: node test-llm-prompt.js test-cases/scenario-6-god-object/src/Core.js');
    console.log('\nTemplates disponibles:');
    Object.entries(TEST_TEMPLATES).forEach(([key, t]) => {
      console.log(`  - ${key}: ${t.name}`);
    });
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  // Leer archivo
  const fileContent = readFileSync(filePath, 'utf-8');
  const fileName = basename(filePath);
  
  // Extraer exports simple (regex básica)
  const exportMatches = fileContent.match(/export\s+(?:function|const|class)\s+(\w+)/g) || [];
  const exports = exportMatches.map(m => m.replace(/export\s+(?:function|const|class)\s+/, ''));
  
  // Para Core.js, sabemos que tiene 10 dependientes
  const isCore = fileName === 'Core.js';
  const dependentCount = isCore ? 10 : 0;
  const exportCount = exports.length;

  console.log('='.repeat(70));
  console.log(`🧪 TEST RÁPIDO DE PROMPTS - ${fileName}`);
  console.log('='.repeat(70));
  console.log(`📊 Metadatos:`);
  console.log(`   Exports: ${exportCount} (${exports.join(', ')})`);
  console.log(`   Dependents: ${dependentCount}`);
  console.log('='.repeat(70));

  // Probar cada template
  for (const [templateKey, template] of Object.entries(TEST_TEMPLATES)) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📋 Template: ${template.name}`);
    console.log(`${'─'.repeat(70)}`);
    
    // Reemplazar variables
    const userPrompt = template.userPrompt
      .replace(/{filePath}/g, filePath)
      .replace(/{fileContent}/g, fileContent)
      .replace(/{fileCode}/g, fileContent)
      .replace(/{exportCount}/g, exportCount)
      .replace(/{dependentCount}/g, dependentCount)
      .replace(/{exports}/g, exports.join(', '));

    try {
      const startTime = Date.now();
      const llmResponse = await analyzeWithLLM({
        systemPrompt: template.systemPrompt,
        userPrompt
      });
      const duration = Date.now() - startTime;

      console.log(`⏱️  Tiempo: ${duration}ms`);
      console.log(`📄 Respuesta RAW (${llmResponse.length} chars):`);
      console.log(llmResponse.substring(0, 500) + (llmResponse.length > 500 ? '...' : ''));
      
      // Parsear y validar
      const parsed = parseLLMResponse(llmResponse);
      
      if (parsed) {
        console.log('\n✅ JSON Parseado:');
        console.log(JSON.stringify(parsed, null, 2).substring(0, 800));
        
        const validation = validateGodObjectResponse(parsed);
        console.log('\n🔍 Validación:');
        Object.entries(validation).forEach(([key, value]) => {
          const icon = value === true ? '✅' : value === false ? '❌' : 'ℹ️';
          console.log(`   ${icon} ${key}: ${value}`);
        });
      } else {
        console.log('\n❌ No se pudo parsear JSON');
      }
      
    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Tests completados');
  console.log('='.repeat(70));
}

main().catch(console.error);
