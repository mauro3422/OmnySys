# OmnySys Indexing Pipeline

The indexing process in OmnySys is a structured 10-phase pipeline managed by the `PipelineRunner`. This ensures consistency, observability, and the ability to restart or skip phases as needed.

## The 10 Phases

### 1. Initialization
Sets up the context, initializes the `CacheManager`, and loads project-level configuration (e.g., `package.json`).

### 2. File Scan
Recursively scans the filesystem to identify files matching the inclusion filters (.js, .ts, .jsx, .tsx).

### 3. Cleanup
Orphaned atoms and metadata from files that no longer exist are purged from the SQLite database.

### 4. Parse Files
Source code is parsed into ASTs using Babel. Files with no changes (based on MD5 hash) can be skipped if incremental mode is on.

### 5. Extract Atoms
Individual atoms (functions, classes, constants) are extracted. Modular extractors (via `registry.js`) are executed here.

### 6. Build Links
The "Called By" links are established globally, creating the reverse call graph.

### 7. Resolve & Normalization
Relative imports are resolved to absolute paths, and all paths are normalized to internal `forward-slash` format.

### 8. System Graph
The logical dependency graph is constructed, connecting atoms across file boundaries.

### 9. Quality Analysis
Calculates health metrics, complexity scores, and generates the Enhanced System Map with semantic domains.

### 10. Persist
Final results and the global system map are persisted to the SQLite database and metadata files.

## Atomic Incremental Updates
When an `atomic_write` or `atomic_edit` occurs, the system triggers a **mini-pipeline** (via `analyzeSingleFile`) that executes these phases only for the affected file and its immediate dependents, maintaining the database in a near-real-time consistent state.
