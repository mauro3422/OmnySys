# Scanner Filters - Exclusion System

## Overview

The OmnySys analyzer automatically filters what gets analyzed to avoid:
- Generated/build directories
- Dependencies (node_modules)
- Analysis data (.aver/, omnysysdata/)
- Configuration files
- Binary files

## Default Exclusions (Hardcoded)

These directories are ALWAYS ignored:

### Build/Generated
- `node_modules/`
- `dist/`
- `build/`
- `out/`
- `coverage/`
- `.next/`
- `.nuxt/`
- `.turbo/`

### OmnySys Data (Don't re-analyze)
- `.aver/` - Analysis data
- `omnysysdata/` - MCP data hub

### Version Control
- `.git/`
- `.gitignore`

### IDE/Editor
- `.idea/`
- `.vscode/`
- `.DS_Store`

### Environment/Config
- `.env`
- `.env.local`
- `.env.*.local`
- Lock files (yarn.lock, pnpm-lock.yaml)

### Cache
- `.eslintcache`
- `.cache`
- `.parcel-cache`

## Custom Exclusions (.averignore)

Create a `.averignore` file in your project root to add custom exclusion patterns.

### Example .averignore

```
# Test files
__tests__/
*.test.js
*.test.ts
*.spec.js
*.spec.ts

# Vendor code
vendor/
third-party/

# Legacy code
src/old-code/
src/legacy/

# Generated
src/generated/
src/graphql/generated/

# Documentation examples
docs/examples/
stories/
```

### Pattern Syntax

Uses gitignore-style glob patterns:

```
# Ignore directory and contents
my-folder/

# Ignore files with pattern
*.generated.ts
*.test.ts

# Ignore in specific path
src/old-code/**

# Negate (include despite exclusion)
!important-code.ts
```

## Supported File Extensions

The scanner only analyzes:
- `.js`
- `.ts`
- `.jsx`
- `.tsx`
- `.mjs`
- `.cjs`

All other file types are automatically ignored.

## Configuration

When calling `scanProject()`:

```javascript
// Use default filters + .averignore
const files = await scanProject(projectPath);

// Disable .averignore reading
const files = await scanProject(projectPath, {
  readAverIgnore: false
});

// Add custom exclude patterns
const files = await scanProject(projectPath, {
  excludePatterns: ['custom-folder/**', '*.temp.js']
});
```

## Best Practices

1. **Keep .averignore updated** - Add paths as your project evolves
2. **Exclude test files** if they're not part of your runtime dependencies
3. **Exclude generated code** - Don't analyze auto-generated files
4. **Use comments** - Document why each exclusion exists

## Performance Impact

Proper filtering significantly improves performance:

| Scenario | Files Analyzed | Analysis Time |
|----------|---|---|
| With omnysysdata filtered | ~150 files | ~2s |
| Without omnysysdata filtered | ~170 files | ~2.3s |
| Large node_modules leak | ~10,000+ files | Timeout ❌ |

## Troubleshooting

### Files are being analyzed that shouldn't be

1. Check `.averignore` syntax - use gitignore patterns
2. Verify file doesn't match supported extensions
3. Check IGNORED_DIRS in scanner.js for hardcoded exclusions

### Too many files being analyzed

Add to `.averignore`:
```
__tests__/
*.test.ts
*.spec.ts
docs/
```

### Analysis is slow

- Check that node_modules is excluded
- Check that .aver/ and omnysysdata/ are excluded
- Add large vendor folders to .averignore
