# Test Case: New Extractors v0.6

**Purpose**: Test all new extractors and archetynes from v0.6

## Files

### API Routes
- `api-server.js` - Express server with routes
- `api-client.js` - Client consuming those routes
- **Expected**: Shared route connections detected

### Environment Variables
- `env-reader-a.js` - Reads `process.env.DB_HOST`
- `env-reader-b.js` - Also reads `process.env.DB_HOST`
- **Expected**: Shared env connection detected

### Co-located Files
- `Button.js` - Component
- `Button.test.js` - Test companion
- `Button.stories.js` - Storybook companion
- **Expected**: Colocation connections detected

### Archetynes
- `config.js` - Config Hub (5+ exports, 5+ dependents, 0-2 functions)
- `main.js` - Entry Point (5+ imports, 0 dependents)
- `utils/index.js` - Facade (re-exports from internal modules)
- `utils/string.js` - Internal module
- `utils/date.js` - Internal module
- `utils/math.js` - Internal module

## Expected Connections

| Source | Target | Type | Confidence |
|--------|--------|------|------------|
| api-server.js | api-client.js | shared-route | 1.0 |
| env-reader-a.js | env-reader-b.js | shared-env | 1.0 |
| Button.js | Button.test.js | colocated (test-companion) | 1.0 |
| Button.js | Button.stories.js | colocated (storybook) | 1.0 |

## Expected Archetynes

| File | Archetype | Reason |
|------|-----------|--------|
| config.js | config-hub | 5+ exports, 5+ dependents, 0-2 functions |
| main.js | entry-point | 5+ imports, 0 dependents |
| utils/index.js | facade | Re-exports from 3+ internal modules |
