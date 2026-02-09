/**
 * Test del Detector de Race Conditions
 * 
 * Prueba el detector con casos de ejemplo
 */

import { RaceConditionDetector } from './src/layer-a-static/race-detector/index.js';
import { detectRaceConditions } from './src/layer-a-static/pipeline/molecular-extractor.js';

// Datos de prueba con races conocidos
const mockProjectData = {
  modules: [
    {
      moduleName: 'auth',
      modulePath: '/src/auth',
      files: [
        {
          filePath: '/src/auth/session.js',
          atoms: [
            {
              id: 'auth::getSession',
              name: 'getSession',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_READ', variable: 'global.sessions', line: 10 }
                ]
              },
              calls: []
            },
            {
              id: 'auth::createSession',
              name: 'createSession',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_WRITE', variable: 'global.sessions', line: 25 }
                ]
              },
              calls: []
            }
          ]
        }
      ]
    },
    {
      moduleName: 'cache',
      modulePath: '/src/cache',
      files: [
        {
          filePath: '/src/cache/store.js',
          atoms: [
            {
              id: 'cache::getOrSet',
              name: 'getOrSet',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_READ', variable: 'cache.store', line: 5 },
                  { type: 'STATE_WRITE', variable: 'cache.store', line: 12 }
                ]
              },
              calls: []
            },
            {
              id: 'cache::clear',
              name: 'clear',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_WRITE', variable: 'cache.store', line: 20 }
                ]
              },
              calls: []
            }
          ]
        }
      ]
    },
    {
      moduleName: 'counter',
      modulePath: '/src/counter',
      files: [
        {
          filePath: '/src/counter/increment.js',
          atoms: [
            {
              id: 'counter::increment',
              name: 'increment',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_WRITE', variable: 'global.counter', line: 5 }
                ]
              },
              code: `
                async function increment() {
                  await delay(10);
                  global.counter = global.counter + 1;
                }
              `
            },
            {
              id: 'counter::decrement',
              name: 'decrement',
              isAsync: true,
              isExported: true,
              dataFlow: {
                sideEffects: [
                  { type: 'STATE_WRITE', variable: 'global.counter', line: 5 }
                ]
              },
              code: `
                async function decrement() {
                  await delay(10);
                  global.counter = global.counter - 1;
                }
              `
            }
          ]
        }
      ]
    }
  ],
  system: {
    businessFlows: [
      {
        name: 'user-login',
        steps: [
          { function: 'auth::getSession', module: 'auth' },
          { function: 'auth::createSession', module: 'auth' }
        ]
      }
    ],
    entryPoints: [
      { type: 'api', module: 'auth', handler: { function: 'getSession' } }
    ]
  }
};

async function testRaceDetector() {
  console.log('🧪 Testing Race Condition Detector\n');
  console.log('=' .repeat(50));
  
  try {
    const detector = new RaceConditionDetector(mockProjectData);
    const results = detector.detect();
    
    console.log('\n📊 Results:');
    console.log(`  Total Races: ${results.summary.totalRaces}`);
    console.log(`  Total Warnings: ${results.summary.totalWarnings}`);
    console.log(`  Shared State Items: ${results.summary.sharedStateItems}`);
    
    console.log('\n📈 By Severity:');
    for (const [severity, count] of Object.entries(results.summary.bySeverity)) {
      console.log(`  ${severity}: ${count}`);
    }
    
    console.log('\n📈 By Type:');
    for (const [type, count] of Object.entries(results.summary.byType)) {
      console.log(`  ${type}: ${count}`);
    }
    
    console.log('\n🚨 Detected Races:');
    results.races.forEach((race, index) => {
      console.log(`\n  ${index + 1}. ${race.type} - ${race.severity}`);
      console.log(`     State: ${race.stateKey}`);
      console.log(`     ${race.description}`);
      
      if (race.pattern) {
        console.log(`     Pattern: ${race.pattern}`);
      }
      
      race.accesses.forEach(access => {
        console.log(`     └─ ${access.atomName} (${access.module}:${access.type})`);
      });
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed successfully!');
    
    // Verificar que detectamos los races esperados
    const expectedRaces = 3; // counter WW, auth RW, cache WW
    if (results.summary.totalRaces >= expectedRaces) {
      console.log(`✓ Found ${results.summary.totalRaces} races (expected ${expectedRaces}+)`);
    } else {
      console.warn(`⚠️  Expected at least ${expectedRaces} races, found ${results.summary.totalRaces}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testRaceDetector();
