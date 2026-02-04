# Creating a New Prompt Template - Step by Step Guide

This guide explains how to create a new metadata-driven prompt template using the **File Archetypes** system.

## Overview

The system uses **Type-Based Selection** where file metadata determines the "archetype" of the file, and each archetype has its specialized prompt.

```
Code File → Metadata Extraction → Archetype Detection → Prompt Selection → LLM Analysis
                                    ↓
                            Multiple archetypes possible
                                    ↓
                    Select by Severity (architectural impact)
```

## Core Concepts

### File Archetypes

An **archetype** is a pattern/characteristic detected from metadata:

| Archetype | Detected By | Severity | Analysis Focus |
|-----------|-------------|----------|----------------|
| `god-object` | `dependentCount >= 10` | 10 | Architectural coupling |
| `dynamic-importer` | `hasDynamicImports: true` | 7 | Hidden dynamic connections |
| `event-hub` | `eventNames.length > 0` | 6 | Event-driven coupling |
| `state-manager` | `localStorageKeys.length > 0` | 6 | Shared state analysis |
| `orphan-module` | No imports/exports | 8 | Dead code detection |
| `styled-component` | CSS-in-JS patterns | 3 | Style architecture |
| `type-definer` | TypeScript interfaces | 2 | Type definitions |

### Severity-Based Selection

When a file matches **multiple archetypes**, the system selects the one with **highest architectural severity** (potential impact).

Example:
- A file that is both `god-object` (severity 10) and `dynamic-importer` (severity 7)
- **Selected**: `god-object` (higher severity)
- **Reason**: Architectural coupling is more critical than dynamic imports

## Step-by-Step Process

### Step 1: Define Your Archetype

Decide what metadata signature identifies your archetype:

```javascript
// Example: Creating 'api-client' archetype
// Detected by: uses fetch, axios, or similar HTTP clients
const hasAPICalls = metadata.hasFetch || metadata.hasAxios;
```

Add your detection function in `prompt-selector.js`:

```javascript
function hasAPIClient(metadata) {
  const { hasFetch, hasAxios, httpPatterns } = metadata;
  return hasFetch || hasAxios || (httpPatterns?.length > 0);
}
```

### Step 2: Assign Severity

Determine the architectural severity (0-10):

```javascript
const ARCHETYPE_SEVERITY = {
  // ... existing archetypes ...
  'api-client': 5,  // Network coupling - moderate severity
};
```

**Severity Guidelines**:
- **10**: God objects, circular dependencies (system-breaking)
- **8-9**: Orphan modules, dead code (maintenance issues)
- **6-7**: Event hubs, state managers (coupling issues)
- **4-5**: API clients, workers (integration points)
- **2-3**: Type definitions, styles (low impact)
- **1**: Pure utilities (usually fine)

### Step 3: Create Prompt Template

Create: `src/layer-b-semantic/prompt-engine/prompt-templates/your-archetype.js`

```javascript
/**
 * YOUR_ARCHETYPE Template
 * 
 * Archetype: your-archetype
 * Detected by: [what metadata triggers this]
 * Severity: [X/10]
 */

export default {
  systemPrompt: `You are a specialized code analyzer for YOUR_ARCHETYPE pattern.

ARCHETYPE DEFINITION:
[Describe what this archetype means architecturally]

ANALYSIS TASK:
[What should the LLM look for]

RETURN JSON:
{
  "confidence": 0.0-1.0,
  "findings": [...],
  "riskLevel": "high" | "medium" | "low",
  "reasoning": "explanation"
}

RULES:
- Be specific to this archetype
- Don't analyze unrelated patterns
- Flag architectural risks`,

  userPrompt: `File: {filePath}

ARCHETYPE CONTEXT:
[Context specific to this archetype]

METRICS:
- Metric1: {value1}
- Metric2: {value2}

CODE:
{fileContent}

Analyze as YOUR_ARCHETYPE and return JSON.`
};
```

### Step 4: Create JSON Schema

Create: `src/layer-b-semantic/prompt-engine/json-schemas/your-archetype.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "description": "Schema for YOUR_ARCHETYPE analysis",
  "properties": {
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "findings": {
      "type": "array",
      "items": { "type": "string" }
    },
    "riskLevel": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    },
    "reasoning": {
      "type": "string"
    }
  },
  "required": ["confidence", "findings", "riskLevel", "reasoning"]
}
```

### Step 5: Register in Prompt Selector

Update: `src/layer-b-semantic/prompt-engine/prompt-selector.js`

#### 5.1 Add severity
```javascript
const ARCHETYPE_SEVERITY = {
  // ... existing ...
  'your-archetype': 5,  // Your severity here
};
```

#### 5.2 Add detection (in `detectArchetypes()`)
```javascript
detectArchetypes(metadata) {
  const archetypes = [];
  
  // ... existing detections ...
  
  // Your new archetype
  if (hasYourArchetype(metadata)) {
    archetypes.push({ 
      type: 'your-archetype', 
      severity: ARCHETYPE_SEVERITY['your-archetype'] 
    });
  }
  
  return archetypes;
}
```

#### 5.3 Add detection function
```javascript
function hasYourArchetype(metadata) {
  // Your detection logic
  return metadata.yourIndicator === true;
}
```

#### 5.4 Add template mapping (in `getTemplate()`)
```javascript
const templates = {
  // ... existing ...
  'your-archetype': yourArchetypeTemplate,
};
```

### Step 6: Handle Response in Validator

Update: `src/layer-b-semantic/llm-response-validator.js`

```javascript
export function validateLLMResponse(response, code, validFilePaths = []) {
  // Detect your response type
  const isYourArchetype = response.yourField !== undefined ||
                          response.connectionType === 'your-archetype';
  
  if (isYourArchetype) {
    return validateYourArchetypeResponse(response);
  }
  
  // ... rest of validation ...
}

function validateYourArchetypeResponse(response) {
  if (!response.yourRequiredField) {
    return null;
  }
  
  return {
    connectionType: 'your-archetype',
    confidence: Math.min(response.confidence || 0.5, 1.0),
    yourField: response.yourField || [],
    reasoning: sanitizeReasoning(response.reasoning),
    // Empty arrays for compatibility
    localStorageKeys: [],
    eventNames: [],
    connectedFiles: []
  };
}
```

### Step 7: Handle Response in Normalizer

Update: `src/layer-b-semantic/llm-analyzer.js` in `normalizeResponse()`:

```javascript
// Detect your archetype
const isYourArchetype = normalizedKeys.yourfield !== undefined;

if (isYourArchetype) {
  normalized = {
    source: 'llm',
    confidence: normalizedKeys.confidence || 0.8,
    yourField: normalizedKeys.yourfield || [],
    connectionType: 'your-archetype'
  };
}
```

### Step 8: Merge Results

Update: `src/layer-b-semantic/enricher/mergers.js` in `mergeAnalyses()`:

```javascript
// Your Archetype Analysis
if (llmAnalysis.connectionType === 'your-archetype' || llmAnalysis.yourField) {
  merged.llmInsights.yourArchetypeAnalysis = {
    detected: true,
    yourField: llmAnalysis.yourField || [],
    riskLevel: llmAnalysis.riskLevel || 'low',
    confidence: llmAnalysis.confidence
  };
}
```

### Step 9: Update Validation in Enricher

Update: `src/layer-b-semantic/enricher/core.js`

```javascript
const isValidYourArchetype = llmResult && llmResult.confidence !== undefined && 
                             llmResult.connectionType === 'your-archetype';

if (isValidSemantic || isValidGodObject || isValidYourArchetype) {
  // Merge...
}
```

### Step 10: Test Your Archetype

Create a test scenario:

```javascript
// test-your-archetype.js
import promptSelector from './src/layer-b-semantic/prompt-engine/prompt-selector.js';

const testMetadata = {
  yourIndicator: true,
  // ... other metadata ...
};

const archetypes = promptSelector.detectArchetypes(testMetadata);
console.log('Detected:', archetypes);

const selected = promptSelector.selectAnalysisType(testMetadata);
console.log('Selected:', selected);

const template = promptSelector.getTemplate(selected);
console.log('Template:', template.systemPrompt.substring(0, 100));
```

## Advanced: Compound Archetypes

For files that commonly have **multiple critical archetypes**, create a compound:

```javascript
const COMPOUND_ARCHETYPES = [
  {
    type: 'your-archetype-with-god-object',
    matches: (m) => hasYourArchetype(m) && isGodObject(m),
    description: 'Your archetype that is also a God Object',
    severity: 11  // Higher than individual archetypes
  }
];
```

This creates a specialized prompt for the combination.

## Troubleshooting

### Archetype not detected?
- Check detection function logic
- Verify metadata values in debug logs
- Test `detectArchetypes()` directly

### Wrong archetype selected?
- Check severity scores
- Verify no compound archetype is matching
- Review `selectBySeverity()` output

### Template not used?
- Check template mapping in `getTemplate()`
- Verify template has `systemPrompt` and `userPrompt`
- Check for ES module default export issues

### Response rejected?
- Check validator accepts your `connectionType`
- Verify required fields in response
- Check `normalizeResponse()` sets correct type

## Complete Example: God Object

See these files for a complete working example:
- `src/layer-b-semantic/prompt-engine/prompt-templates/god-object.js`
- `src/layer-b-semantic/prompt-engine/json-schemas/god-object.json`
- `src/layer-b-semantic/prompt-engine/prompt-selector.js` (search for "god-object")
- `docs/architectural-decision-records/ADR-001-type-based-prompt-selection.md`

## Key Principles

1. **Metadata Decides**: The archetype is determined by metadata, not file content inspection
2. **Severity Matters**: When multiple archetypes match, severity determines priority
3. **One Analysis**: Currently one LLM analysis per file (highest severity archetype)
4. **Extensible**: New archetypes don't change existing logic
5. **Compound for Complexity**: Create compound archetypes for common critical combinations

## References

- `docs/architectural-decision-records/ADR-001-type-based-prompt-selection.md` - Architecture decision
- `src/layer-b-semantic/prompt-engine/prompt-selector.js` - Implementation
- `docs/metadata-prompt-system.md` - System overview
