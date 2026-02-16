/**
 * @fileoverview Auto-Generator for Meta-Factory Tests
 * 
 * Automatically generates Meta-Factory test files from source code analysis.
 * Usage: node scripts/generate-meta-tests.js <pattern>
 * 
 * Example: node scripts/generate-meta-tests.js "tests/unit/layer-a-analysis/parser/*.test.js"
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

/**
 * Simple glob implementation using fs
 */
function globSync(pattern, cwd = process.cwd()) {
  const files = [];
  const basePath = pattern.replace(/\/\*\*\/\*\.test\.js$/, '').replace(/\/\*\.test\.js$/, '');
  const fullBasePath = resolve(cwd, basePath);
  
  function traverseDir(dir) {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverseDir(fullPath);
      } else if (item.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
  }
  
  try {
    traverseDir(fullBasePath);
  } catch (e) {
    // Directory doesn't exist
  }
  
  return files;
}

/**
 * Analyzes a test file and extracts test cases
 */
function analyzeTestFile(testPath) {
  const content = readFileSync(testPath, 'utf-8');
  
  // Extract imports
  const importMatches = content.matchAll(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
  const imports = [];
  for (const match of importMatches) {
    const names = (match[1] || match[2] || '').split(',').map(s => s.trim()).filter(Boolean);
    const source = match[3];
    imports.push({ names, source });
  }
  
  // Extract describe/it blocks
  const describeMatches = content.matchAll(/describe\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*\{([\s\S]*?)\n\}\);/g);
  const testSuites = [];
  
  for (const match of describeMatches) {
    const suiteName = match[1];
    const suiteBody = match[2];
    
    // Extract test cases
    const itMatches = suiteBody.matchAll(/it\(['"]([^'"]+)['"],\s*(?:async\s*)?\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);?/g);
    const tests = [];
    
    for (const itMatch of itMatches) {
      tests.push({
        name: itMatch[1],
        body: itMatch[2].trim()
      });
    }
    
    testSuites.push({ name: suiteName, tests });
  }
  
  return { imports, testSuites, content };
}

/**
 * Generates Meta-Factory test content
 */
function generateMetaFactoryTest(testPath, analysis) {
  // Convert absolute path to relative module name
  const normalizedPath = testPath.replace(/\\/g, '/');
  const moduleName = normalizedPath
    .replace(/.*tests\/unit\/layer-a-analysis\//, '')
    .replace('.test.js', '');
  
  const sourceModule = moduleName;
  
  // Extract function names from imports
  const functionNames = [];
  for (const imp of analysis.imports) {
    for (const name of imp.names) {
      if (!name.includes('*') && !name.includes('as')) {
        functionNames.push(name.replace(/\s+as\s+\w+/g, '').trim());
      }
    }
  }
  
  const mainFunction = functionNames[0] || 'mainFunction';
  const exportsObject = functionNames.length > 0 
    ? functionNames.reduce((acc, name) => {
        acc[name] = name;
        return acc;
      }, {})
    : { [mainFunction]: mainFunction };
  
  // Generate specific tests from extracted test cases
  const specificTests = [];
  for (const suite of analysis.testSuites) {
    for (const test of suite.tests) {
      // Skip structure/contract tests (handled by Meta-Factory)
      if (test.name.toLowerCase().includes('must export') || 
          test.name.toLowerCase().includes('should export') ||
          test.name.toLowerCase().includes('structure contract')) {
        continue;
      }
      
      specificTests.push({
        name: test.name,
        fn: `async () => {
        ${test.body}
      }`
      });
    }
  }
  
  // Limit to first 10 specific tests to avoid huge files
  const limitedTests = specificTests.slice(0, 10);
  
  const testContent = `/**
 * @fileoverview Tests for ${moduleName} - Meta-Factory Pattern
 * 
 * Auto-generated from legacy test file.
 * Uses Meta-Factory pattern for standardized contracts.
 * 
 * @module tests/unit/layer-a-analysis/${moduleName}
 */

import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { ${functionNames.join(', ') || mainFunction} } from '#layer-a/${sourceModule}.js';

// Meta-Factory Test Suite
createAnalysisTestSuite({
  module: '${moduleName}',
  exports: { ${Object.keys(exportsObject).join(', ')} },
  analyzeFn: ${mainFunction},
  expectedFields: {
    // TODO: Update with actual expected fields
    total: 'number',
    result: 'object'
  },
  contractOptions: {
    async: false,
    exportNames: [${functionNames.map(f => `'${f}'`).join(', ')}],
    expectedSafeResult: { total: 0, result: null }
  },
  specificTests: [
${limitedTests.map(t => `    {
      name: '${t.name.replace(/'/g, "\\'")}',
      fn: ${t.fn}
    }`).join(',\n')}
  ]
});
`;
  
  return testContent;
}

/**
 * Main migration function
 */
function migrateBatch(pattern) {
  console.log('🔍 Searching for test files...\n');
  
  const files = globSync(pattern);
  console.log(`Found ${files.length} files to analyze\n`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const file of files) {
    // Skip already migrated files
    const content = readFileSync(file, 'utf-8');
    if (content.includes('createAnalysisTestSuite') || 
        content.includes('createUtilityTestSuite') ||
        content.includes('createDetectorTestSuite')) {
      console.log(`⏭️  Skipping (already migrated): ${file}`);
      skipped++;
      continue;
    }
    
    console.log(`🔄 Migrating: ${file}`);
    
    try {
      const analysis = analyzeTestFile(file);
      const newContent = generateMetaFactoryTest(file, analysis);
      
      // Backup old file
      writeFileSync(`${file}.backup`, content);
      
      // Write new content
      writeFileSync(file, newContent);
      
      console.log(`✅ Migrated: ${file}\n`);
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating ${file}: ${error.message}\n`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${files.length}`);
}

// CLI
const pattern = process.argv[2];
if (!pattern) {
  console.log('Usage: node scripts/generate-meta-tests.js <pattern>');
  console.log('Example: node scripts/generate-meta-tests.js "tests/unit/layer-a-analysis/parser/*.test.js"');
  process.exit(1);
}

migrateBatch(pattern);
