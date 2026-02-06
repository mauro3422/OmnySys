/**
 * Test de Few-Shot Prompting para LFM2-Extract
 * Basado en la documentación oficial de LiquidAI
 */

const testCases = [
  {
    name: "Orphan Module - UserModule",
    code: `
/**
 * User profile management
 */
export function getUserProfile() {
  return { name: 'John', role: 'user' };
}

export function updateUser(user) {
  return fetch('/api/user', { method: 'POST', body: JSON.stringify(user) });
}
`,
    metadata: {
      filePath: 'src/modules/UserModule.js',
      exportCount: 2,
      dependentCount: 0,
      imports: [],
      exports: ['getUserProfile', 'updateUser']
    }
  },
  {
    name: "Dynamic Import - Router",
    code: `
const routeMap = {
  '/user': () => import('./modules/UserModule.js'),
  '/admin': () => import('./modules/AdminModule.js'),
  '/dashboard': () => import('./modules/DashboardModule.js')
};

export function navigateTo(route) {
  const loader = routeMap[route];
  if (loader) return loader();
}
`,
    metadata: {
      filePath: 'src/Router.js',
      exportCount: 1,
      dependentCount: 0,
      hasDynamicImports: true
    }
  }
];

// Few-shot examples según documentación LFM2-Extract
const fewShotExamples = {
  orphanModule: `<|im_start|>system
You are a specialized data extractor for orphan module analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "isOrphan": boolean,
  "potentialUsage": ["string"],
  "suggestedUsage": "string"
}

Examples:
Input: File with exports but no dependents
Output: {"confidence":0.9,"reasoning":"Module exports functions but has no dependents","isOrphan":true,"potentialUsage":["Import in main app","Use in tests"],"suggestedUsage":"Import getUserProfile in App.js"}

Input: File with many dependents  
Output: {"confidence":0.95,"reasoning":"Module has 5 dependents using its exports","isOrphan":false,"potentialUsage":[],"suggestedUsage":"Keep as is - actively used"}<|im_end|>`,

  dynamicImports: `<|im_start|>system
You are a specialized data extractor for dynamic import analysis. Return ONLY valid JSON.

Schema (root object, NO wrappers):
{
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "dynamicImports": [{"variable":"string","target":"string","route":"string"}],
  "routeMapAnalysis": {"hasVariableRoutes":boolean,"routes":["string"]}
}

Examples:
Input: import('./Module.js')
Output: {"confidence":0.95,"reasoning":"Static dynamic import path","dynamicImports":[{"variable":"none","target":"./Module.js","route":"/module"}],"routeMapAnalysis":{"hasVariableRoutes":false,"routes":["/module"]}}

Input: import(\`./\${moduleName}.js\`)
Output: {"confidence":0.7,"reasoning":"Variable dynamic import - cannot determine exact target","dynamicImports":[{"variable":"moduleName","target":"unknown","route":"variable"}],"routeMapAnalysis":{"hasVariableRoutes":true,"routes":["variable"]}}<|im_end|>`
};

async function testWithLLM() {
  console.log('🧪 Testing LFM2-Extract with Few-Shot Prompting\n');
  
  const config = {
    llm: {
      gpu: { port: 8000 },
      cpu: { port: 8002 }
    },
    performance: {
      timeout: 60000,
      enableCPUFallback: false
    }
  };
  
  // Importar LLMClient
  const { LLMClient } = await import('./src/ai/llm-client.js');
  const client = new LLMClient(config);
  
  // Check health
  const health = await client.healthCheck();
  console.log('Server health:', health);
  
  if (!health.gpu) {
    console.error('❌ GPU server not available');
    return;
  }
  
  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.name}`);
    console.log('='.repeat(60));
    
    const isDynamicImport = testCase.metadata.hasDynamicImports;
    const systemPrompt = isDynamicImport ? fewShotExamples.dynamicImports : fewShotExamples.orphanModule;
    
    const userPrompt = `<|im_start|>user
FILE: ${testCase.metadata.filePath}
EXPORTS: ${testCase.metadata.exportCount}
DEPENDENTS: ${testCase.metadata.dependentCount}

CODE:
${testCase.code}

Extract analysis as JSON.<|im_end|>
<|im_start|>assistant`;
    
    try {
      console.log('⏳ Sending request to LLM...');
      const response = await client.analyze(userPrompt, { 
        systemPrompt,
        mode: 'gpu'
      });
      
      console.log('\n✅ Response received:');
      console.log(JSON.stringify(response, null, 2));
      
      // Validate JSON structure
      const requiredFields = ['confidence', 'reasoning'];
      const missingFields = requiredFields.filter(f => !(f in response));
      
      if (missingFields.length > 0) {
        console.warn(`⚠️  Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All required fields present');
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

testWithLLM().catch(console.error);
