# CHANGELOG - OmnySys

## 📋 **Index of Version-Specific Changelogs**

This repository uses a modular changelog structure for better organization and maintainability. Each major version has its own dedicated file in the `changelog/` directory.

### **📁 Version Files**

| Version | File | Description |
|---------|------|-------------|
| **[0.5.1]** | `changelog/v0.5.1.md` | **Enterprise Architecture Refactor** (Latest) |
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

### **🚀 Latest Release: v0.5.1 (2026-02-06)**

**Enterprise Architecture Release**: Complete modularization of 11 large monolithic files following SOLID principles and SSOT pattern.

**Key Changes**:
- ✅ **11 Files Refactored** - 5,000+ lines split into 99+ focused modules
- ✅ **SOLID Compliance** - Single Responsibility, Open/Closed, Dependency Inversion
- ✅ **SSOT Pattern** - Single Source of Truth for constants, types, configurations
- ✅ **API Compatibility** - 100% backward compatible, no breaking changes
- ✅ **Enterprise Structure** - Average 86% reduction in file size (455 → 63 lines)

**Refactored Files**:
- `graph-builder.js` (550 lines) → 12 modules
- `advanced-extractors.js` + `metadata-extractors.js` (1,083 lines) → 17 modules  
- `semantic-issues-detector.js` (458 lines) → 8 modules
- `parser.js` (511 lines) → 8 modules
- `llm-analyzer.js` (441 lines) → 5 modules
- `init.js` (335 lines) → 7 modules
- `batch-processor.js` (458 lines) → 9 modules
- `static-extractors.js` (441 lines) → 10 modules
- `redux-context-extractor.js` (398 lines) → 12 modules
- `event-pattern-detector.js` (398 lines) → 9 modules
- `websocket-manager.js` (441 lines) → 10 modules

**New**: Modular directory structure with `index.js` facades

**Previous: v0.5.0** - Layer A/B Unification & Orchestrator

**Architecture Release**: MCP Server is now the unified entry point with internal Orchestrator

**Key Changes**:
- ✅ **MCP Server as Entry Point** - Single command starts everything
- ✅ **Internal Orchestrator** - Queue + Worker + FileWatcher as component
- ✅ **Auto-Indexing** - Background indexing on startup if needed
- ✅ **Smart Tools** - Auto-queue as CRITICAL if file not analyzed
- ✅ **analyzeAndWait()** - Tools can trigger and wait for analysis

**New**: `orchestrator.js` - Reusable orchestrator component

**Previous: v0.4.4** - Unified cache system

**Previous: v0.4.0** - Complete semantic analysis with hybrid AI (80/20)

**🔗 Quick Links**:
- [View Latest Changes](changelog/v0.5.1.md)
- [View v0.5.0 Changes](changelog/v0.5.0.md)
- [View All Version Files](changelog/)
- [Project Documentation](README.md)

### **ðŸ“ˆ Project Evolution**

| Phase | Version | Focus | Status |
|-------|---------|-------|--------|
| **Phase 1** | 0.1.0 | Static Analysis Foundation | ✅ Complete |
| **Phase 2** | 0.2.0 | Function-Level Tracking | ✅ Complete |
| **Phase 3** | 0.3.0-0.3.4 | Quality Analysis & Import Validation | ✅ Complete |
| **Phase 3.8** | 0.4.0-0.4.1 | Semantic Enrichment & AI Integration | ✅ Complete |
| **Phase 3.9** | 0.4.2 | Context Optimization & Function Analysis | ✅ Complete |
| **Architecture** | 0.4.5 | MCP Unified Entry Point | ✅ Complete |
| **Architecture** | 0.4.4 | Unified Cache System | ✅ Complete |
| **Enterprise** | 0.5.1 | SOLID Architecture Refactor - 17 files, 147 modules | ✅ Complete |
| **Architecture** | 0.5.0 | Layer A/B Unification | ✅ Complete |
| **Patch** | 0.4.3 | Bug Fixes & Stability | ✅ Complete |

### **ðŸ’¡ Why This Structure?**

- **🎯 Focused**: Each file covers specific milestones
- **🔍 Searchable**: Easy to find changes by version
- **ðŸ“ Maintainable**: No more 700+ line files
- **ðŸ”„ Scalable**: Easy to add new versions
- **👥 Collaborative**: Multiple developers can work on different versions

### **📋 Usage**

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
