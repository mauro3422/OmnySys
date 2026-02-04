# Plan 1: LLM Performance Optimization

## Problem Analysis

### Symptoms
1. LLM timeouts on multiple files (`❌ LLM analyze error for prompt N: timeout`)
2. Parallel processing overloads the LLM server
3. Results lost when timeouts occur

### Root Cause
The system sends all 11 files to LLM in parallel without rate limiting. The LLM server (llama-server) has limited capacity and queue.

## Files to Analyze

### Primary Files
1. `src/layer-b-semantic/llm-analyzer.js` - Core LLM analysis logic
2. `src/ai/llm-client.js` - HTTP client for LLM server
3. `src/layer-b-semantic/enricher/core.js` - Orchestrates LLM enrichment

### Secondary Files
4. `src/ai/ai-config.json` - Configuration for timeouts, parallel processing
5. `src/layer-c-memory/mcp/server.js` - MCP server that triggers analysis

## Proposed Solutions

### Option A: Sequential Processing with Delay
**Complexity**: Low
**Impact**: High reliability, slower processing

```javascript
// In llm-analyzer.js analyzeMultiple()
for (const file of filesToAnalyze) {
  const result = await this.analyzeSingle(file);
  results.push(result);
  await delay(500); // 500ms between requests
}
```

**Pros**:
- Simple to implement
- No timeouts
- Predictable resource usage

**Cons**:
- Slower (11 files × 5s = 55s vs current 10s)

### Option B: Smart Batching with Concurrency Limit
**Complexity**: Medium
**Impact**: Balanced speed and reliability

```javascript
// Process in batches of 2-3 with dynamic timeouts
const BATCH_SIZE = 2;
const BASE_TIMEOUT = 10000; // 10s base

for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);
  const timeout = BASE_TIMEOUT + (batch[0].code.length / 100); // Dynamic
  // Process batch...
}
```

**Pros**:
- Faster than sequential
- Adapts to file size
- Controlled concurrency

**Cons**:
- More complex logic
- May still timeout on large files

### Option C: Priority Queue with Retry
**Complexity**: High
**Impact**: Maximum reliability, handles failures gracefully

```javascript
// Priority: God Object > Complex Files > Simple Files
// Retry failed files with exponential backoff
```

**Pros**:
- Handles failures gracefully
- Prioritizes important files
- Robust

**Cons**:
- Complex implementation
- Requires queue management

## Recommended: Option B (Smart Batching)

### Implementation Steps

1. **Update `llm-analyzer.js`**:
   - Add `calculateDynamicTimeout(code)` function
   - Modify `analyzeMultiple()` to use batches
   - Add retry logic for timeouts

2. **Update `ai-config.json`**:
   - Add `maxConcurrentAnalyses: 2`
   - Add `baseTimeout: 10000`
   - Add `timeoutPerChar: 0.01`

3. **Update `llm-client.js`**:
   - Add queue management
   - Track active requests
   - Reject when at capacity

### Success Metrics
- 0 timeouts for files under 500 lines
- All God Object files analyzed successfully
- Total analysis time < 2 minutes for 11 files

## Testing Plan

1. Test with scenario-6-god-object
2. Monitor timeout rate
3. Measure total processing time
4. Verify all files get LLM insights
