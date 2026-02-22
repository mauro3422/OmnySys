# OmnySystem - Rules for OpenCode

## System: OmnySys MCP

This project uses a custom MCP (Model Context Protocol) system with 30 code analysis tools. **You MUST use these tools before any edit**.

---

## GOLDEN RULE: Validate BEFORE Editing

**NEVER edit a file without validating first.**

### Mandatory Checklist (in order):

1. **Impact Analysis** - What breaks if I edit this?
   ```
   get_impact_map({ filePath: "path/to/file.js" })
   ```

2. **Import Validation** - Do the imports exist?
   ```
   validate_imports({ 
     filePath: "path/to/file.js",
     checkFileExistence: true 
   })
   ```

3. **Technical Debt** - Is the file a god-object?
   ```
   detect_patterns({ 
     patternType: "architectural-debt",
     limit: 5 
   })
   ```

---

## When to Use Each Tool

### 🔍 Before Creating/Editing Files

| Situation | Tool | Parameters |
|-----------|-------------|------------|
| New file with imports | `validate_imports` | `checkFileExistence: true` |
| Edit existing file | `get_impact_map` + `validate_imports` | both |
| Refactor function | `analyze_change` | `symbolName`, `filePath` |
| Change signature | `analyze_signature_change` | `newSignature` |

### 🔎 Research and Analysis

| You need... | Use... | Example |
|-------------|--------|---------|
| Understand a function | `get_function_details` | `functionName: "detectAtomArchetype"` |
| See who calls what | `get_call_graph` | `symbolName: "main"` |
| Data flow | `explain_value_flow` | `symbolName`, `filePath` |
| Variable impact | `trace_variable_impact` | `variableName: "config"` |
| Find duplicates | `detect_patterns` | `patternType: "duplicates"` |
| Check technical debt | `detect_patterns` | `patternType: "architectural-debt"` |

### 🏗️ Architecture and Structure

| You need... | Use... | Example |
|-------------|--------|---------|
| Module overview | `get_module_overview` | `modulePath: "src/core"` |
| System health | `get_health_metrics` | `includeDetails: true` |
| Race conditions | `detect_race_conditions` | `minSeverity: "high"` |
| Async analysis | `get_async_analysis` | `riskLevel: "high"` |

### 🔧 Search and Validation

| You need... | Use... | Example |
|-------------|--------|---------|
| Search files | `search_files` | `pattern: "**/*.test.js"` |
| Verify symbol | `find_symbol_instances` | `symbolName: "validate"` |
| Data schema | `get_atom_schema` | `atomType: "function"` |

---

## Common Workflows

### 1. Refactor a Large File

```javascript
// Step 1: Check debt
const debt = await detect_patterns({ 
  patternType: "architectural-debt" 
});

// Step 2: Analyze structure
const molecule = await get_molecule_summary({ 
  filePath: "src/large-file.js" 
});

// Step 3: Check impact
const impact = await get_impact_map({ 
  filePath: "src/large-file.js" 
});

// Step 4: Split into modules
// ... edit with atomic_edit ...
```

### 2. Add New Feature

```javascript
// Step 1: Find where it goes
const files = await search_files({ 
  pattern: "**/*feature*.js" 
});

// Step 2: Create file (atomic_write validates automatically)
await atomic_write({ 
  filePath: "new-file.js",
  content: "..."
});
// ⚠️ atomic_write validates: imports, paths, duplicates automatically
```

### 3. Fix a Bug

```javascript
// Step 1: Find function
const instances = await find_symbol_instances({ 
  symbolName: "buggyFunction" 
});

// Step 2: Analyze function
const details = await get_function_details({ 
  functionName: "buggyFunction",
  filePath: "src/buggy.js"
});

// Step 3: See who uses it
const callers = await get_call_graph({ 
  symbolName: "buggyFunction",
  filePath: "src/buggy.js"
});

// Step 4: Fix
await atomic_edit({ 
  filePath: "src/buggy.js",
  oldString: "...",
  newString: "..."
});
```

---

## Built-in Validation System

`atomic_edit` and `atomic_write` now include **automatic validation**:

### What gets validated automatically:
1. ✅ File existence (prevents editing non-existent files)
2. ✅ Path validation (detects invalid characters, absolute paths)
3. ✅ Import validation (checks all imports exist before saving)
4. ✅ Duplicate detection (warns about functions with same name)
5. ✅ Impact analysis (shows what files will be affected)

### Validation Results:
```javascript
// If validation fails, you'll get detailed errors:
{
  error: 'VALIDATION_FAILED',
  errors: ['❌ File does not exist: src/utils/missing.js'],
  warnings: ['⚠️ This change will affect 5 files directly'],
  context: { suggestions: ['src/utils/helper.js'] },
  canProceed: false
}
```

### Manual Validation (if needed):
```javascript
// Pre-edit validation
validateBeforeEdit({ filePath: "src/file.js", symbolName: "myFunc" });

// Pre-write validation  
validateBeforeWrite({ filePath: "src/new-file.js" });

// Get line context
getLineContext(filePath, lineNumber, contextLines = 5);
```

---

## Anti-Patterns (DON'T DO)

❌ **NEVER**:
- Assume an import exists without validating
- Edit files >250 lines without checking technical debt
- Change signatures without `analyze_signature_change`
- Refactor without `get_impact_map`
- Create files without validating imports first
- **Use plain `edit` - always use `atomic_edit` for safety**

✅ **ALWAYS**:
- Use `atomic_edit` instead of `edit` (has built-in validation)
- Use `atomic_write` instead of `write` (has built-in validation)
- Validate imports before saving
- Check impact before editing
- Use `limit` on large queries
- Paginate results when necessary

---

## Common Errors and Solutions

### "Module not found"
**Cause**: Import doesn't exist
**Solution**: Use `validate_imports` with `checkFileExistence: true`

### "Breaking changes detected"
**Cause**: Signature change affects callers
**Solution**: Use `analyze_signature_change` before editing

### "File too complex"
**Cause**: File >250 lines or complexity >30
**Solution**: Use `detect_patterns({ patternType: "architectural-debt" })`

---

## System Metrics

- **Total Tools**: 28
- **Health Score Target**: >95/100
- **Max Lines per File**: 250
- **Max Complexity**: 15
- **Test Coverage Target**: >80%

---

## Useful Commands

```bash
# Check MCP server status
get_server_status()

# Restart server (if issues)
restart_server({ clearCache: true })

# View data schema
get_atom_schema({ atomType: "function" })
```

---

## Notes

- This file is read by OpenCode on every session
- MCP tools are available automatically
- Use `limit` and `offset` to paginate large results
- The system is constantly evolving - check documentation
