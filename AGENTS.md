# OmnySystem - MCP Tool Usage Guide

## Quick Start

**Golden Rule**: Always validate BEFORE editing.

```javascript
// 1. Check impact
get_impact_map({ filePath: "path/to/file.js" })

// 2. Validate imports
validate_imports({ filePath: "path/to/file.js", checkFileExistence: true })

// 3. Edit with validation
atomic_edit({ filePath, oldString, newString })
```

---

## Essential Tools

### Before Editing

| Tool | When | Example |
|------|------|---------|
| `get_impact_map` | Always first | `{ filePath: "src/file.js" }` |
| `validate_imports` | Before save | `{ filePath: "src/file.js", checkFileExistence: true }` |
| `analyze_change` | Changing symbols | `{ filePath, symbolName }` |

### Understanding Code

| Tool | When | Example |
|------|------|---------|
| `get_function_details` | Understand function | `{ filePath, functionName }` |
| `get_call_graph` | See dependencies | `{ filePath, symbolName }` |
| `detect_patterns` | Find issues | `{ patternType: "god-functions" }` |

### Safe Operations

| Tool | Use Instead Of | Why |
|------|----------------|-----|
| `atomic_edit` | `edit` | Auto-validates imports, paths, duplicates |
| `atomic_write` | `write_file` | Auto-validates before creating |

---

## Common Patterns

### Refactor Large File
```javascript
detect_patterns({ patternType: "architectural-debt" })
get_molecule_summary({ filePath })
get_impact_map({ filePath })
// Then use atomic_edit
```

### Add New Feature
```javascript
search_files({ pattern: "**/*feature*.js" })
atomic_write({ filePath, content }) // Auto-validates
```

### Fix Bug
```javascript
find_symbol_instances({ symbolName: "buggyFunc" })
get_function_details({ filePath, functionName })
get_call_graph({ filePath, symbolName })
atomic_edit({ filePath, oldString, newString })
```

---

## Anti-Patterns

❌ **DON'T**:
- Edit without `get_impact_map` first
- Use plain `edit` - always use `atomic_edit`
- Change signatures without `analyze_signature_change`
- Create files without validating imports

✅ **DO**:
- Always validate before editing
- Use `atomic_edit` / `atomic_write` for safety
- Check `get_recent_errors()` after changes

---

## System Info

- **Storage**: SQLite (deterministic queries)
- **Max file lines**: 250
- **Max complexity**: 15
- **Test coverage target**: >80%

---

## Troubleshooting

```javascript
// Check server status
get_server_status()

// Restart if issues
restart_server({ clearCache: true, reanalyze: false })

// View errors
get_recent_errors()
```
