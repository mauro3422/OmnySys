# CHANGELOG - OmnySys

## ðŸ“‹ **Index of Version-Specific Changelogs**

This repository uses a modular changelog structure for better organization and maintainability. Each major version has its own dedicated file in the `changelog/` directory.

### **ðŸ“ Version Files**

| Version | File | Description |
|---------|------|-------------|
| **[0.6.0]** | `changelog/v0.6.0.md` | **Molecular Architecture - Atomic Analysis System** (Latest - Stable) |
| **[0.5.4]** | `changelog/v0.5.4.md` | **8 New Metadata Extractors + Network Hub Archetype** |
| **[0.5.1]** | `changelog/v0.5.1.md` | **Bug Fixes & MCP Optimization** |
| **[0.5.0]** | `changelog/v0.5.0.md` | **Layer A/B Unification & Orchestrator** |
| **[0.4.6]** | `changelog/v0.4.6.md` | **Metadata Contract & Plug & Play Architecture** |
| **[0.4.5]** | `changelog/v0.4.5.md` | **MCP Server as Unified Entry Point** |
| **[0.4.4]** | `changelog/v0.4.4.md` | **Unified Cache System** |
| **[0.4.3]** | `changelog/v0.4.3.md` | **Bug Fixes & Stability Improvements** |
| **[0.4.2]** | `changelog/v0.4.2.md` | **Phase 3.9: Context Optimization & Function Analysis** |
| **[0.4.0-0.4.1]** | `changelog/v0.4.0.md` | **Phase 3.8: Capa B - Semantic Enrichment** |
| **[0.3.0-0.3.4]** | `changelog/v0.3.0-v0.3.4.md` | **Phase 3: Automated Analysis & Quality Reporting** |
| **[0.3.0-0.3.4]** | `changelog/v0.3.0-v0.3.4.md` | **Phase 3: Automated Analysis & Quality Reporting** |
| **[0.3.1-0.3.4]** | `changelog/v0.3.1-v0.3.4.md` | **Import Quality Analysis & Modular Architecture** |
| **[0.3.0]** | `changelog/v0.3.0.md` | **Core Automated Analysis & Quality Reporting** |
| **[0.2.0]** | `changelog/v0.2.0.md` | **Phase 2: Function-Level Tracking** |
| **[0.1.0]** | `changelog/v0.1.0.md` | **Phase 1: Layer A - Static Analysis** |
| **[0.0.0]** | `changelog/v0.0.0.md` | **Initial Project Setup** |
| **[0.1.0-0.2.0]** | `changelog/v0.1.0-v0.2.0.md` | **Combined Early Phases Reference** |

### **🚀 Latest Release: v0.6.0 (2026-02-08)**

**Major Architecture Release**: Sistema atómico completo con SSOT (Single Source of Truth)

**Key Changes**:
- ✅ **Molecular Architecture** - Funciones (átomos) como unidad primaria de análisis
- ✅ **Atomic Extractor** - Extracción de funciones como átomos desde AST
- ✅ **7 Atomic Archetypes** - god-function, fragile-network, hot-path, dead-function, private-utility, utility, standard
- ✅ **Derivation Engine** - Metadata molecular derivada desde átomos
- ✅ **Atomic Cache** - Caché de átomos individuales (100x más rápido)
- ✅ **Call Graph** - `calledBy` calculado bidireccionalmente
- ✅ **Optimized Storage** - `atoms/` (SSOT), `molecules/` (índice), `files/` (referencias)
- ✅ **MCP Tools** - `getFunctionDetails()`, `getMoleculeSummary()`, `analyzeFunctionChange()`

**Docs**: See `changelog/v0.6.0.md` for full details

---

### **v0.5.4 (2026-02-08)**

**Major Feature Release**: 8 new metadata extractors + 4 new archetypes + Metadata Insights Guide

**Key Changes**:
- ✅ **8 New Metadata Extractors** - Advanced code analysis without LLM
  - `side-effects.js` - Network calls, DOM, storage, console, timers
  - `call-graph.js` - Function definitions and internal/external calls
  - `data-flow.js` - Variable assignments, returns, parameters
  - `type-inference.js` - typeof, instanceof, JSDoc types, defaults
  - `temporal-patterns.js` - Lifecycle hooks (React/Vue/Angular/Svelte/SolidJS), events, timers, cleanup
  - `dependency-depth.js` - Import complexity and chain indicators
  - `performance-hints.js` - Nested loops, blocking ops, complexity estimation
  - `historical-metadata.js` - Git history, churn rate, hotspot score
- ✅ **4 New Archetypes** - Cross-cutting patterns from metadata combinations
  - `network-hub` - Files sharing API endpoints
  - `critical-bottleneck` (Phase 1) - High churn + complexity + coupling
  - `api-event-bridge` (Phase 1) - API calls coordinated with events
  - `storage-sync-manager` (Phase 1) - Multi-tab localStorage synchronization
- ✅ **Metadata Insights Guide** - Documentation on combining metadata to discover patterns
- ✅ **Enhanced Analysis Decider** - 2 new bypass criteria for network/lifecycle patterns
- ✅ **Extended Metadata Contract** - 16 new optional fields in constants.js
- ✅ **Smart Prompt Builder** - Exposes new metadata to LLM when needed
- ✅ **All Tests Pass** - Verified backward compatibility

**New Files**:
- `src/layer-a-static/extractors/metadata/side-effects.js`
- `src/layer-a-static/extractors/metadata/call-graph.js`
- `src/layer-a-static/extractors/metadata/data-flow.js`
- `src/layer-a-static/extractors/metadata/type-inference.js`
- `src/layer-a-static/extractors/metadata/temporal-patterns.js`
- `src/layer-a-static/extractors/metadata/dependency-depth.js`
- `src/layer-a-static/extractors/metadata/performance-hints.js`
- `src/layer-a-static/extractors/metadata/historical-metadata.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/critical-bottleneck.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/api-event-bridge.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/storage-sync.js`
- `docs/METADATA-INSIGHTS-GUIDE.md` - Comprehensive guide on metadata combinations

**Modified Files**:
- `src/layer-a-static/extractors/metadata/index.js` - Integrated 8 new extractors
- `src/layer-a-static/extractors/metadata/temporal-patterns.js` - Added Svelte + SolidJS support
- `src/core/file-watcher/analyze.js` - Added 8 new metadata fields to output
- `src/layer-b-semantic/metadata-contract/constants.js` - Added 16 optional fields
- `src/layer-b-semantic/metadata-contract/builders/prompt-builder.js` - Exposed new fields
- `src/layer-b-semantic/llm-analyzer/analysis-decider.js` - Added network/lifecycle bypass
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` - Added 4 new archetypes (15 total)
- `docs/ARCHETYPE_DEVELOPMENT_GUIDE.md` - Added Box Test section + references to CORE_PRINCIPLES
- `docs/METADATA-INSIGHTS-GUIDE.md` - Added Pillar 2 section + verification checklist
- `README.md` - Added CORE_PRINCIPLES reference

---

### **Previous: v0.5.3 (2026-02-08)**

**Maintenance Release**: Code quality improvements, refactoring, and test suite

**Key Changes**:
- ✅ **Removed Deprecated Files** - Eliminated css-in-js-extractor.js and static-extractors.js re-exports
- ✅ **Path Aliases** - Implemented #config/*, #core/*, #layer-a/*, #ai/* imports (14 files updated)
- ✅ **Safe JSON Utilities** - Added json-safe.js with error handling for all JSON operations
- ✅ **Unified Constants** - Merged duplicate ChangeType definitions into centralized config
- ✅ **Centralized Logger** - Created logger.js with level-based logging
- ✅ **Test Suite** - Added 18 unit and integration tests (npm test)
- 🐛 **Bug Fix** - Fixed duplicate export error in batch-processor/constants.js
- ✅ **Circular Dependency Fix** - Resolved layer-a ↔ layer-b circular import
- ✅ **File Splitting** - Divided ast-analyzer.js (564 lines) into 3 focused modules
- ✅ **SSOT Configuration** - Centralized paths, limits, and change types in src/config/

**New Files**:
- `src/config/paths.js` - All path constants
- `src/config/limits.js` - All limit/threshold constants  
- `src/config/change-types.js` - All enum constants
- `src/utils/json-safe.js` - Safe JSON operations
- `src/utils/logger.js` - Centralized logging
- `src/shared/architecture-utils.js` - Shared pattern detection
- `tests/unit/*.test.js` - Unit tests
- `tests/integration/*.test.js` - Integration tests
- `run-tests.js` - Test runner

---


**Major Release**: Layer A and B unified under Orchestrator with semantic metadata support

**Key Changes**:
- âœ… **Layer A/B Unification** - Single responsibility for each layer
- âœ… **Orchestrator** - Queue + Worker + Iterative analysis
- âœ… **Semantic Metadata** - LLM now receives global state, events, connections
- âœ… **Archetype Detection** - Improved detection using semantic info
- âœ… **Tracking System** - Progress tracking for all analyzed files
- âœ… **Prompt Hygiene** - Archetype prompts receive only needed metadata
- ✅ **Core Refactors** - Modularizacion de unified-server, orchestrator, indexer pipeline, file-watcher, cache y LLM client

**New**: `PROBLEMATICAS.md` - Known issues and roadmap

**Previous: v0.4.6** - Metadata Contract

**Architecture Release**: MCP Server is now the unified entry point with internal Orchestrator

**Key Changes**:
- âœ… **MCP Server as Entry Point** - Single command starts everything
- âœ… **Internal Orchestrator** - Queue + Worker + FileWatcher as component
- âœ… **Auto-Indexing** - Background indexing on startup if needed
- âœ… **Smart Tools** - Auto-queue as CRITICAL if file not analyzed
- âœ… **analyzeAndWait()** - Tools can trigger and wait for analysis

**New**: `orchestrator.js` - Reusable orchestrator component

**Previous: v0.4.4** - Unified cache system

**Previous: v0.4.0** - Complete semantic analysis with hybrid AI (80/20)

**ðŸ”— Quick Links**:
- [View Latest Changes](changelog/v0.4.4.md)
- [View v0.4.0 Changes](changelog/v0.4.0.md)
- [View All Version Files](changelog/)
- [Project Documentation](README.md)

### **ðŸ“ˆ Project Evolution**

| Phase | Version | Focus | Status |
|-------|---------|-------|--------|
| **Phase 1** | 0.1.0 | Static Analysis Foundation | âœ… Complete |
| **Phase 2** | 0.2.0 | Function-Level Tracking | âœ… Complete |
| **Phase 3** | 0.3.0-0.3.4 | Quality Analysis & Import Validation | âœ… Complete |
| **Phase 3.8** | 0.4.0-0.4.1 | Semantic Enrichment & AI Integration | âœ… Complete |
| **Phase 3.9** | 0.4.2 | Context Optimization & Function Analysis | âœ… Complete |
| **Architecture** | 0.4.5 | MCP Unified Entry Point | âœ… Complete |
| **Architecture** | 0.4.4 | Unified Cache System | âœ… Complete |
| **Patch** | 0.4.3 | Bug Fixes & Stability | âœ… Complete |

### **ðŸ’¡ Why This Structure?**

- **ðŸŽ¯ Focused**: Each file covers specific milestones
- **ðŸ” Searchable**: Easy to find changes by version
- **ðŸ“ Maintainable**: No more 700+ line files
- **ðŸ”„ Scalable**: Easy to add new versions
- **ðŸ‘¥ Collaborative**: Multiple developers can work on different versions

### **ðŸ“‹ Usage**

To view changes for a specific version:
```bash
# View latest changes
cat changelog/v0.4.0.md

# View all version files
ls changelog/

# View combined early phases
cat changelog/v0.1.0-v0.2.0.md
```

This modular approach ensures the changelog remains organized, maintainable, and easy to navigate as the project continues to grow!
