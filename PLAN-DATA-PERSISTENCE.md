# Plan 2: Data Persistence Fix

## Problem Analysis

### Symptoms
1. LLM analysis shows "Enhanced X/Y files" but data not in final files
2. `llmInsights` missing from Core.js.json even though LLM responded
3. `usedBy` array empty in saved files but present in system-map.json

### Root Causes

1. **Data Flow Break**: LLM results merged but not persisted through save chain
2. **Schema Mismatch**: Validation rejects valid God Object responses
3. **Overwrite Issue**: Later steps overwrite enhanced data

## Files to Analyze

### Critical Path
```
indexProject()
  └── generateEnhancedSystemMap()
        └── enrichSemanticAnalysis()  ← LLM enrichment happens here
              └── mergeAnalyses()     ← Merges but may not persist
  └── savePartitionedSystemMap()      ← Final save
```

### Primary Files
1. `src/layer-a-static/indexer.js` - Main orchestration
   - Line 520-530: generateEnhancedSystemMap() call
   - Line 534: savePartitionedSystemMap() call
   
2. `src/layer-b-semantic/enricher/core.js` - LLM enrichment
   - Line 320-340: Validation and merge logic
   - Check: Is enhancedResults correctly returned?

3. `src/layer-b-semantic/enricher/mergers.js` - Data merging
   - Line 12-72: mergeAnalyses() function
   - Verify: Are llmInsights being added?

4. `src/layer-a-static/storage/storage-manager.js` - File saving
   - Line 150-191: savePartitionedSystemMap()
   - Line 175-178: Individual file save loop

### Secondary Files
5. `src/layer-b-semantic/llm-response-validator.js` - Response validation
6. `src/layer-b-semantic/llm-analyzer.js` - Response normalization

## Data Flow Debugging

Add temporary logs at each step:

### Step 1: After LLM Merge (core.js ~336)
```javascript
if (filePath === 'src/Core.js') {
  console.log('DEBUG Post-Merge: llmInsights =', 
    enhancedResults.files[filePath].llmInsights !== undefined);
}
```

### Step 2: Return from enrichSemanticAnalysis (core.js ~370)
```javascript
console.log('DEBUG Return: results.files[src/Core.js].llmInsights =',
  results.files['src/Core.js']?.llmInsights !== undefined);
```

### Step 3: After generateEnhancedSystemMap (indexer.js ~530)
```javascript
console.log('DEBUG Enhanced Map: files[src/Core.js].llmInsights =',
  enhancedSystemMap.files['src/Core.js']?.llmInsights !== undefined);
```

### Step 4: Before save (storage-manager.js ~175)
```javascript
if (filePath === 'src/Core.js') {
  console.log('DEBUG Pre-Save: llmInsights =', 
    fileData.llmInsights !== undefined);
}
```

## Proposed Solutions

### Solution A: Fix Validation Logic
**Target**: `src/layer-b-semantic/enricher/core.js`

Current validation rejects God Object responses:
```javascript
// Current (line 332)
if (llmResult && llmResult.confidence !== undefined && llmResult.sharedState !== undefined)

// Should be:
const isValid = (llmResult.confidence !== undefined && 
                (llmResult.sharedState !== undefined || llmResult.connectionType === 'god-object'));
```

### Solution B: Ensure Data Propagation
**Target**: `src/layer-a-static/indexer.js`

Verify `enhancedFiles` from enrichment is correctly used:
```javascript
// Line 270-272
if (enrichmentResult.enhanced) {
  enhancedFiles = enrichmentResult.results.files; // Is this working?
}
```

### Solution C: Fix Save Process
**Target**: `src/layer-a-static/storage/storage-manager.js`

Ensure llmInsights is not stripped during save:
```javascript
// In saveFileAnalysis, ensure ALL fields are saved
const dataToSave = {
  ...fileData,  // Keep everything including llmInsights
  metadata: { ... }  // Don't overwrite
};
```

## Recommended: Combined Fix

### Phase 1: Fix Validation (Quick Win)
1. Update validation in `core.js` to accept God Object
2. Add debug logs
3. Test and verify

### Phase 2: Data Propagation Audit
1. Add debug logs at each step
2. Run test scenario
3. Identify where data is lost
4. Fix the specific step

### Phase 3: Defensive Save
1. Ensure saveFileAnalysis preserves all fields
2. Add schema validation before save
3. Add verification after save

## Testing Strategy

### Test 1: Validation Fix
```bash
node src/layer-c-memory/mcp/index.js ./test-cases/scenario-6-god-object
# Check logs for "Enhanced X files"
# Check Core.js.json for llmInsights
```

### Test 2: Data Integrity
```bash
# After analysis completes:
cat test-cases/scenario-6-god-object/.OmnySysData/files/src/Core.js.json | jq '.llmInsights'
# Should show godObjectAnalysis
```

### Test 3: Full Roundtrip
1. Clean cache
2. Run analysis
3. Query via MCP tool
4. Verify God Object data returned

## Success Criteria
- [ ] Core.js has `llmInsights.godObjectAnalysis`
- [ ] All 10 dependents listed in `usedBy`
- [ ] Risk level and responsibilities populated
- [ ] Data persists after MCP restart

## Priority
**CRITICAL** - Without this fix, God Object detection is non-functional.
