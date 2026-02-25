# Publish OmnySys to npm

This guide documents the standard release flow for publishing `omnysys`.

## 1. Preconditions

- Node.js 18+
- npm account (`npm whoami` must work)
- Local login session (`npm login`)
- Local tests green

## 2. Verify package name availability

```bash
npm view omnysys name version --json
```

If the package is not found (E404), the name is available for first publish.

## 3. Validate package before release

```bash
npm run validate
npm test
npm pack --dry-run
```

Review `npm pack --dry-run` output to confirm only expected files are included.

## 4. Versioning

Use semver bump before publish:

```bash
npm version patch
# or npm version minor
# or npm version major
```

This updates `package.json` and creates a git tag.

## 5. Publish

First public publish:

```bash
npm publish --access public
```

Subsequent releases:

```bash
npm publish
```

## 6. Post-publish verification

```bash
npm view omnysys version
npm i -g omnysys
omnysys --help
```

## Notes

- Current binary entrypoints are `omny` and `omnysys` from `omny.js`.
- MCP standardization is handled by `install.js` + `src/cli/utils/mcp-client-standardizer.js`.
- Re-apply MCP standard at any time with:

```bash
npm run setup
```
