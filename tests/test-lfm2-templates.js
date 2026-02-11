/**
 * Test de Few-Shot Prompting para LFM2-Extract - Templates Actualizados
 * Verifica que los nuevos templates con few-shot examples funcionan correctamente
 */

import promptEngine from './src/layer-b-semantic/prompt-engine/index.js';

const testCases = [
  {
    name: "Orphan Module - UserModule",
    metadata: {
      filePath: 'src/modules/UserModule.js',
      exportCount: 2,
      dependentCount: 0,
      importCount: 0,
      functionCount: 2,
      exports: ['getUserProfile', 'updateUser'],
      hasGlobalAccess: false,
      hasLocalStorage: false,
      hasEventListeners: false,
      localStorageKeys: [],
      eventNames: [],
      hasJSDoc: true
    },
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
`
  },
  {
    name: "Dynamic Import - Router",
    metadata: {
      filePath: 'src/Router.js',
      exportCount: 1,
      dependentCount: 0,
      importCount: 0,
      functionCount: 1,
      exports: ['navigateTo'],
      hasDynamicImports: true
    },
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
`
  }
];

async function testWithLLM() {
  console.log('🧪 Testing Updated Templates with LFM2-Extract\n');
  console.log('='.repeat(70));
  
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
    console.log('='.repeat(70));
    
    // Generar prompt usando el prompt engine
    const promptConfig = await promptEngine.generatePrompt(testCase.metadata, testCase.code);
    
    console.log('\n📝 Generated Prompt:');
    console.log('Analysis Type:', promptConfig.analysisType);
    console.log('System Prompt Length:', promptConfig.systemPrompt.length, 'chars');
    console.log('User Prompt Length:', promptConfig.userPrompt.length, 'chars');
    
    try {
      console.log('\n⏳ Sending request to LLM...');
      const response = await client.analyze(promptConfig.userPrompt, { 
        systemPrompt: promptConfig.systemPrompt,
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
      
      // Check for orphan-module specific fields
      if (promptConfig.analysisType === 'orphan-module') {
        const orphanFields = ['isOrphan', 'potentialUsage', 'suggestedUsage'];
        const missingOrphanFields = orphanFields.filter(f => !(f in response));
        if (missingOrphanFields.length > 0) {
          console.warn(`⚠️  Missing orphan-module fields: ${missingOrphanFields.join(', ')}`);
        } else {
          console.log('✅ All orphan-module fields present');
        }
      }
      
      // Check for dynamic-imports specific fields
      if (promptConfig.analysisType === 'dynamic-importer') {
        const dynamicFields = ['dynamicImports', 'routeMapAnalysis'];
        const missingDynamicFields = dynamicFields.filter(f => !(f in response));
        if (missingDynamicFields.length > 0) {
          console.warn(`⚠️  Missing dynamic-imports fields: ${missingDynamicFields.join(', ')}`);
        } else {
          console.log('✅ All dynamic-imports fields present');
          if (response.dynamicImports && response.dynamicImports.length > 0) {
            console.log(`✅ Found ${response.dynamicImports.length} dynamic imports`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
  }
  
  console.log('\n✅ Test completed!');
}

testWithLLM().catch(console.error);
