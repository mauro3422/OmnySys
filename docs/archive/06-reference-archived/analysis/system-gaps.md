# System Analysis: Gaps & Improvements

**Version**: v0.6.0
**Date**: 2026-02-08
**Author**: Claude Opus 4.6
**Purpose**: What is missing, improvement areas, stability assessment, and recommendations

**Related Documents**:
- `SYSTEM_ANALYSIS_OVERVIEW.md` - High-level system flow and architecture summary
- `SYSTEM_ANALYSIS_EXTRACTORS.md` - Detailed extractor documentation

---

## What is NOT working (TODOs found)

### 1. **File Watcher NOT connected to the Orchestrator**
```javascript
// handlers.js lines 182, 195, 203
// TODO: Detect files that imported these exports
// TODO: Remove references in other files
// TODO: Send notification to VS Code/MCP
```

**Problem:**
- File watcher emits events (`file:modified`, `dependency:added`)
- BUT nobody is listening to those events
- NO re-analysis of affected dependents
- NO cache invalidation in MCP

**Consequence:**
- If you modify A.js that exports `foo`
- And B.js imports `foo` from A.js
- B.js does NOT get re-analyzed automatically
- The graph becomes outdated

---

### 2. **Does NOT detect archetype changes**
```javascript
// Before modification:
store.js -> 5 exports, 3 dependents -> Normal

// After modification:
store.js -> 5 exports, 12 dependents -> God Object!

// BUT: No code detects this change
```

**What's missing:**
```javascript
async function handleFileModified(filePath, fullPath) {
  // ...existing code...

  // MISSING:
  const oldArchetype = detectArchetype(oldAnalysis);
  const newArchetype = detectArchetype(newAnalysis);

  if (oldArchetype !== newArchetype) {
    console.log(`${filePath} changed from ${oldArchetype} to ${newArchetype}`);
    this.emit('archetype:changed', { filePath, old: oldArchetype, new: newArchetype });

    // If it became a God Object -> Maybe needs LLM
    if (newArchetype === 'godObject') {
      await this.queueLLMAnalysis(filePath);
    }
  }
}
```

---

### 3. **NO tracking of event "memorability"**
```javascript
// Memorable event:
"Modified function X -> 20 tests broken"

// MISSING: System that captures this and calculates memorability score
```

**What's missing:**
```javascript
// In handlers.js
async function handleFileModified(filePath, fullPath) {
  // ...existing code...

  // MISSING:
  const impactScore = calculateImpactScore(changes, fileAnalysis);

  if (impactScore > 0.7) {  // High impact
    const event = {
      type: 'breaking_change',
      filePath,
      changes,
      timestamp: Date.now(),
      memorabilityScore: calculateMemorabilityScore({
        novelty: isNovelPattern(changes),
        emotionalImpact: impactScore,
        frequency: getPatternFrequency(changes)
      })
    };

    await this.memorySystem.record(event);
  }
}
```

---

### 4. **NO fine-tuning with data from past projects**
```javascript
// MISSING: Dataset of "pattern -> connection"
```

**What's missing:**
```javascript
// Collection script
async function collectTrainingData(projectPath) {
  const files = await getAnalyzedFiles(projectPath);
  const dataset = [];

  for (const file of files) {
    const analysis = await getFileAnalysis(projectPath, file);

    // For each detected connection
    for (const conn of analysis.semanticConnections) {
      dataset.push({
        codeFragment: extractRelevantCode(analysis.source, conn),
        connection: {
          type: conn.type,
          target: conn.target,
          confidence: conn.confidence
        }
      });
    }
  }

  // Save for fine-tuning
  await fs.writeFile('dataset.jsonl', dataset.map(JSON.stringify).join('\n'));
}
```

---

### 5. **NO tunnel vision detection**
```javascript
// User modifies only 1 file
// BUT 5 dependents will be affected

// MISSING: "Tunnel Vision" alert
```

**What's missing:**
```javascript
async function handleFileModified(filePath, fullPath) {
  // ...existing code...

  // MISSING: Tunnel Vision Detection
  const dependents = await getDependents(filePath);

  if (dependents.length > 3) {
    // Only modified 1 file but affects 5+
    console.warn(`WARNING: TUNNEL VISION DETECTED`);
    console.warn(`   Modified: ${filePath}`);
    console.warn(`   Affected: ${dependents.length} files`);

    // Show which ones
    dependents.slice(0, 5).forEach(dep => {
      console.warn(`     - ${dep.file} (via ${dep.connection})`);
    });

    this.emit('tunnel-vision:detected', {
      file: filePath,
      affectedFiles: dependents,
      suggestion: 'Review these files before committing'
    });
  }
}
```

---

## Improvement Priorities

### CRITICAL Priority (do it NOW)

#### 1. **Connect File Watcher to Orchestrator**
```javascript
// File: src/core/file-watcher/handlers.js

// DO:
- Listen to file watcher events
- Re-analyze affected dependents
- Invalidate MCP cache
- Notify Claude/IDE

// Lines to complete:
- handleExportChanges line 182
- cleanupRelationships line 195
- notifyDependents line 203
```

#### 2. **Tunnel Vision Detection**
```javascript
// File: src/core/file-watcher/handlers.js

// DO:
async function detectTunnelVision(filePath, affectedFiles) {
  if (affectedFiles.length >= 3) {
    console.warn(`WARNING: TUNNEL VISION: ${filePath} affects ${affectedFiles.length} files`);
    return {
      detected: true,
      affectedFiles,
      suggestion: 'Review impacted files before committing'
    };
  }
  return { detected: false };
}
```

#### 3. **Archetype change tracking**
```javascript
// File: src/core/file-watcher/handlers.js

// DO:
const oldArchetype = detectArchetype(oldAnalysis);
const newArchetype = detectArchetype(newAnalysis);

if (oldArchetype !== newArchetype) {
  await handleArchetypeChange(filePath, oldArchetype, newArchetype);
}
```

---

### HIGH Priority (next sprint)

#### 4. **Extract complete Call Graph**
```javascript
// File: src/layer-a-static/extractors/metadata/call-graph.js (CREATE)

export function extractCallGraph(parsed, filePath) {
  // For each function
  // Track who calls it
  // Save call context
}
```

#### 5. **Extract Data Flow**
```javascript
// File: src/layer-a-static/extractors/metadata/data-flow.js (CREATE)

export function extractDataFlow(parsed, filePath) {
  // Track variables from creation -> usage
  // Detect localStorage flows
  // Detect globalState flows
}
```

#### 6. **Basic Memory System**
```javascript
// File: src/core/memory-system/index.js (CREATE)

class MemorySystem {
  async recordEvent(event) {
    const score = this.calculateMemorabilityScore(event);
    if (score > 0.7) {
      await this.consolidate(event);
    }
  }

  calculateMemorabilityScore({ novelty, impact, frequency }) {
    return novelty * 0.3 + impact * 0.5 + frequency * 0.2;
  }
}
```

---

### MEDIUM Priority (next month)

#### 7. **Type Inference**
```javascript
// File: src/layer-a-static/extractors/metadata/type-inference.js (CREATE)

export function inferTypes(parsed, filePath) {
  // Analyze code to infer types
  // Without TypeScript annotations
}
```

#### 8. **Side Effects Detection**
```javascript
// File: src/layer-a-static/extractors/metadata/side-effects.js (CREATE)

export function detectSideEffects(parsed, filePath) {
  // Detect network calls
  // Detect DOM manipulation
  // Detect storage access
}
```

#### 9. **Historical Metadata** (from git)
```javascript
// File: src/core/git-analyzer/index.js (CREATE)

export async function analyzeGitHistory(filePath) {
  const commits = await getCommits(filePath);
  const churnRate = calculateChurnRate(commits);
  const bugDensity = calculateBugDensity(commits);
  return { churnRate, bugDensity };
}
```

---

### LOW Priority (when you have time)

#### 10. **Performance Hints**
```javascript
// File: src/layer-a-static/extractors/metadata/performance.js (CREATE)

export function detectPerformanceIssues(parsed, filePath) {
  // Detect nested loops
  // Detect blocking I/O
  // Estimate complexity
}
```

#### 11. **Temporal Patterns**
```javascript
// File: src/layer-a-static/extractors/metadata/temporal.js (CREATE)

export function detectExecutionContext(parsed, filePath) {
  // Detect lifecycle hooks
  // Detect event listeners
  // Estimate timing
}
```

---

## Stability Assessment: How stable is this for a Reddit launch?

### What works WELL

1. **Layer A - Static Analysis** (AST parsing)
   - Parses JS/TS files correctly
   - Resolves imports
   - Detects exports
   - Extracts functions and calls

2. **Semantic Connections** (static extractors)
   - Detects localStorage connections
   - Detects event listeners
   - Detects global variables
   - Confidence scores

3. **Archetypes** (architectural patterns)
   - God Object detection
   - Orphan Module detection
   - Facade detection
   - Config Hub detection
   - Entry Point detection

4. **MCP Server**
   - Works with Claude Desktop
   - Works with OpenCode
   - 9 tools available
   - Cross-platform (Windows/macOS/Linux)

5. **File Watcher**
   - Detects changes
   - Debouncing works
   - Batch processing
   - Hash-based change detection

---

### What does NOT work (blockers for Reddit)

1. **File Watcher disconnected**
   - Does not invalidate MCP cache
   - Does not re-analyze dependents
   - Critical TODOs are not implemented

2. **NO tunnel vision detection**
   - Missing killer feature
   - This is the unique differentiator

3. **NO memory consolidation**
   - Does not learn from past events
   - No memorability scoring

4. **LLM analysis NOT automatic**
   - Does not activate when archetype changes
   - No trigger from file watcher

---

### Stability Score

| Component | Status | Score |
|-----------|--------|-------|
| AST Parsing | Works | 9/10 |
| Import Resolution | Works | 8/10 |
| Semantic Extractors | Works | 8/10 |
| Archetype Detection | Works | 9/10 |
| MCP Server | Works | 9/10 |
| File Watcher (standalone) | Works | 7/10 |
| File Watcher (integration) | Not working | 2/10 |
| Tunnel Vision | Does not exist | 0/10 |
| Memory System | Does not exist | 0/10 |
| LLM Auto-trigger | Not working | 1/10 |

**TOTAL: 53/100** (Not ready for Reddit)

---

### What to do BEFORE launching on Reddit

#### Minimum viable (2-3 days):

1. **Fix File Watcher Integration**
   - Connect events to orchestrator
   - Invalidate cache correctly
   - Re-analyze dependents

2. **Tunnel Vision Detection (MVP)**
   - Basic detector (modified 1 file -> affects 3+)
   - Log warning in terminal
   - Emit event for MCP

3. **Polished Demo**
   - 2-3 min video showing tunnel vision
   - Concrete refactoring example
   - Clear value proposition

#### Nice-to-have (1 more week):

4. **Basic Memory System**
   - Tracking high-impact events
   - Simple memorability score
   - Alerts when pattern repeats

5. **Archetype change detection**
   - Detect when file changes archetype
   - Trigger LLM if necessary

---

## Final Recommendation

### Do NOT launch now on Reddit

**Why:**
- File watcher is not integrated (critical TODOs)
- Tunnel vision detection does not exist (your killer feature)
- Demo would not be impactful without those features

### Launch in 1 week

**Plan:**
```
Day 1-2: Fix file watcher integration
Day 3-4: Tunnel vision detection MVP
Day 5: Polished demo + video
Day 6: Beta testing with 2-3 users
Day 7: Launch on Reddit + HN
```

**Reddit post:**
```markdown
Title: "I built an AI that prevents tunnel vision in code refactoring"

Demo video showing:
1. Developer modifies 1 file
2. OmnySys detects 5 affected files
3. Warns: "WARNING: Tunnel Vision - Review these before commit"
4. Shows impact map
5. Prevents breaking changes

Problem: Everyone has tunnel vision when coding
Solution: AI that sees the full context automatically

Tech: Local LLM + AST + Graph Analysis + Artificial Intuition
```

---

**Conclusion:** System has GREAT potential, but needs 1 more week of work before Reddit. Focus on tunnel vision detection - that is the unique advantage.

---

**Source**: Split from `SYSTEM-ANALYSIS-CURRENT-STATE.md`
