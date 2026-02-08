# OmnySys - Omnisciencia Architecture

## 🧠 What is Omnisciencia?

**Omnisciencia** = "Omni" (all) + "Sciencia" (knowledge) + "Sys" (system)

It's not just "code understanding" — it's **complete awareness** of code context, dependencies, impact, and data flow through **structural pattern recognition** (similar to human intuition).

## 🎯 The Core Insight: Artificial Intuition for Code

This system implements a practical form of **Artificial Intuition** — the ability to predict consequences and recognize patterns without explicit reasoning, based on learned metadata and structural analysis.

```
BEFORE (Tunnel Vision):
┌─────────────────────────────────────┐
│  User edits: src/auth/login.js       │
│                                      │
│  AI sees:                            │
│  └─ src/auth/login.js                │
│     ├─ imports: api.js               │
│     ├─ exports: login()              │
│     └─ 3 usages                       │
│                                      │
│  PROBLEM:                            │
│  - Misses 15 other files that depend │
│  - Doesn't know about event listeners│
│  - Doesn't know about state changes  │
│  - Might break production silently    │
└─────────────────────────────────────┘

AFTER (Omnisciencia with Artificial Intuition):
┌─────────────────────────────────────┐
│  User edits: src/auth/login.js       │
│                                      │
│  AI sees:                            │
│  ├─ Direct dependencies: 12 files   │
│  ├─ Indirect dependencies: 45 files │
│  ├─ Call graph: 23 call sites       │
│  ├─ Data flow: input → process →     │
│  │   user, admin, logs, DB           │
│  ├─ Event listeners: 8 files listen │
│  ├─ State changes: 5 files affected  │
│  ├─ Risk: CRITICAL - Production API  │
│  └─ Breaking changes: 3 endpoints    │
│                                      │
│  INSTINCTIVE REACTION (<10ms):       │
│  "This pattern caused issues before" │
└─────────────────────────────────────┘
```

## 🛠️ 3 Tools Achieving Omnisciencia

### 1. get_call_graph() - Who Calls What?

**Shows ALL call sites of a symbol** with complete context:

```javascript
// Input: get_call_graph('src/api/users.js', 'getUserById')
// Output: All 47 places where getUserById is called

[
  {
    location: 'src/controllers/user-controller.js:42',
    type: 'direct call',
    code: 'const user = await getUserById(userId)',
    calledFrom: 'handleGetUser()'
  },
  {
    location: 'src/middleware/auth.js:15',
    type: 'indirect call (via another function)',
    code: 'getUserById(req.params.id)',
    depth: 2
  },
  {
    location: 'tests/user.test.js:88',
    type: 'test assertion',
    code: 'expect(getUserById(1)).resolves...',
    context: 'test suite: User API tests'
  },
  // ... 47 total call sites
]
```

**Scientific basis:** Graph theory, control flow analysis, call graph construction.

---

### 2. explain_value_flow() - Data Pipeline?

**Shows complete data flow:** inputs → function → outputs → consumers

```javascript
// Input: explain_value_flow('src/utils/validator.js', 'validateEmail')
// Output: Complete data pipeline

INPUTS:
  ├─ user_input.email: "user@example.com"
  ├─ config.domains: ["gmail.com", "yahoo.com"]
  └─ regex_pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/`

PROCESSING:
  ├─ 1. Trim whitespace
  ├─ 2. Check length (< 254)
  ├─ 3. Split by "@"
  ├─ 4. Validate domain part
  └─ 5. Validate format

OUTPUTS:
  ├─ valid: true
  ├─ errors: []
  └─ suggestions: []

CONSUMERS (who uses this result):
  ├─ src/auth/register.js (1 usage)
  │   └─ Called when user creates account
  ├─ src/auth/reset-password.js (2 usages)
  │   └─ Called in password reset flow
  └─ src/admin/user-moderation.js (3 usages)
      └─ Called for manual validation

IMMEDIATE IMPACT:
  ├─ 6 files affected by email format
  ├─ 15 functions depend on validation result
  └─ If changed, could break 21 functions
```

**Scientific basis:** Data flow analysis, dependency tracking, static analysis.

---

### 3. analyze_signature_change() - Breaking Change Predictor

**Predicts what breaks if you change a function signature**:

```javascript
// Input: analyze_signature_change('src/api/order.js', 'createOrder')
// Output: Breaking change prediction

CURRENT SIGNATURE:
  createOrder(userId, items, metadata = {})

CHANGING TO:
  createOrder(userId, items, metadata, options = {})

PREDICTED BREAKING CHANGES:

1. DIRECT DEPENDENTS (6 files will break):
   ├─ src/controllers/order-controller.js
   │   ├─ Calls: await order.createOrder(u, i, m)
   │   └─ Error: "Missing required argument 'options'"
   ├─ src/services/notification.js
   │   ├─ Calls: order.createOrder(u, i, m)
   │   └─ Error: "Missing required argument 'options'"
   └─ src/tests/order.test.js
       └─ 4 test cases will fail

2. TRANSITIVE DEPENDENTS (12 files might break):
   ├─ src/workers/email-processor.js
   │   └─ Gets order data and sends emails
   ├─ src/analytics/processor.js
   │   └─ Aggregates order data for dashboards
   └─ src/legacy/sync-service.js
       └─ Legacy integration might fail

3. RISK ASSESSMENT:
   ├─ Risk Level: HIGH
   ├─ Breaking: 6 direct dependents
   ├─ Potential Breaking: 12 transitive dependents
   └─ Production Impact: DATABASE WRITES
       └─ If createOrder fails, order never saved

4. RECOMMENDATIONS:
   ✅ Change parameters incrementally
   ✅ Keep existing optional parameters
   ✅ Add new optional parameter instead
   ✅ Document the change in CHANGELOG
   ✅ Update all 6 direct dependents first
```

**Scientific basis:** Static analysis, semantic versioning, breaking change detection.

---

## 🔬 Scientific Foundation

| Tool | Algorithm | Scientific Basis |
|------|-----------|------------------|
| `get_call_graph` | Call graph construction | Graph theory, control flow analysis |
| `explain_value_flow` | Data flow analysis | Program slicing, dependency tracking |
| `analyze_signature_change` | Signature matching, impact analysis | Type systems, semantic versioning |

## 🧠 Connection to Artificial Intuition

This system implements **practical Artificial Intuition** for software engineering:

### What is Artificial Intuition?
> "The capacity of an artificial system to function similarly to human consciousness, specifically in the capacity known as intuition — knowledge based on pattern recognition without explicit reasoning." - Wikipedia

### How OmnySys Implements It:

**Layer A (Static Analysis)** - The "Senses"
- Extracts raw structural data from code
- Like eyes seeing shapes and colors
- No interpretation, just raw input

**Layer B (Semantic Analysis)** - The "Pattern Recognizer"
- Detects archetypes: god-objects, orphan-modules, event-hubs
- Like recognizing a face without thinking "eyes + nose + mouth"
- Selective LLM use for complex patterns

**Layer C (Memory & Prediction)** - The "Intuition Engine"
- Stores patterns and their consequences
- Predicts: "This pattern → likely these effects"
- Provides instant context without reasoning

### The Three-Layer Architecture:

```
┌─────────────────────────────────────────┐
│  Human Brain Analogy                    │
├─────────────────────────────────────────┤
│                                         │
│  Brain Stem (Instincts)                 │
│  ↓ Layer A: Static extraction           │
│     Fast, automatic, no reasoning       │
│                                         │
│  Amygdala (Emotions/Patterns)           │
│  ↓ Layer B: Semantic detection          │
│     Pattern recognition, archetypes     │
│                                         │
│  Prefrontal Cortex (Reasoning)          │
│  ↓ Layer C: Memory & prediction         │
│     Conscious analysis when needed      │
│                                         │
└─────────────────────────────────────────┘
```

## 🎓 Why This is "Omnisciencia"?

### NOT Just "Code Understanding"

❌ **Code Understanding:**
- Knows what files exist
- Knows imports/exports
- Knows basic dependencies
- Still has tunnel vision

✅ **Omnisciencia with Artificial Intuition:**
- **Complete call graph** (who calls who, how, when)
- **Full data flow** (what enters, what leaves, who consumes)
- **Breaking change prediction** (what breaks if I change this)
- **Root cause analysis** (where did this value come from?)
- **Upstream/downstream tracing** (everything connected)
- **Risk assessment** (how critical is this change?)
- **Automatic impact calculation** (1 line change = X files affected)
- **Instinctive warnings** ("this pattern caused issues before")

### The 3-Tool Approach

```
┌─────────────────────────────────────────┐
│  get_call_graph()                       │
│  "¿Quién me llama? ¿A quién llamo?"     │
│  → Call sites, call depth, context       │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  explain_value_flow()                    │
│  "¿Qué entra? ¿Qué sale? ¿Quién lo usa?"  │
│  → Data pipeline, consumers, sources     │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  analyze_signature_change()              │
│  "¿Qué rompo si cambio mi firma?"        │
│  → Breaking changes, risk, recommendations│
└─────────────────────────────────────────┘
```

## 🚀 User Experience

### Before (Tunnel Vision)

```
User: "Change login function"
AI: [Edits login.js]
    [Breaks production database connection]
    [5 other files silently broken]
    [Users can't login]
```

### After (Omnisciencia)

```
User: "Change login function"
AI:
  ℹ️  I'm changing: src/auth/login.js
     • Function: login(email, password)

  🔍 IMPACT ANALYSIS:
     ├─ Direct dependencies: 3 files
     ├─ Call sites: 12 locations
     ├─ Data flow: user → token → HTTP
     ├─ Event listeners: 2 files notified
     ├─ Risk: MEDIUM (production auth)

  ⚠️  BREAKING CHANGES DETECTED:
     ├─ src/auth/callback.js: needs update
     ├─ src/middleware/auth-check.js: needs update
     └─ src/analytics/usage.js: affected

  🧠 ARTIFICIAL INTUITION ALERT:
     "This pattern (auth function change) caused
      3 production outages in analyzed projects"

  💡 RECOMMENDATION:
     1. Update src/auth/callback.js first
     2. Update src/middleware/auth-check.js
     3. Update src/analytics/usage.js
     4. Test with 12 call sites
     5. Deploy to staging first

  ✅ Proceed? [Yes/No/Edit]
```

## 📊 Current Status

**OmnySys is in active development (v0.5.3)**

What works:
- ✅ Static analysis (Layer A)
- ✅ Semantic detection (Layer B)
- ✅ MCP server with 9 tools
- ✅ File watching and real-time updates
- ✅ Impact mapping and call graphs

In development:
- 🔄 Pattern learning across projects
- 🔄 Artificial intuition engine
- 🔄 Memory consolidation system

## 🎯 Real-World Example

### Before (Web App)

```
Dev modifies: src/components/Navbar.js

Code View:
  └─ Updates logo to new design

Reality:
  ├─ 15 pages still use old logo
  ├─ 2 admin panels broken
  ├─ Email templates not updated
  └─ 23 places forgot to update
```

### After (Omnisciencia)

```
Dev modifies: src/components/Navbar.js

AI Response:
  ℹ️  Impact analysis for: Navbar.js

  🔍 Call Sites Found:
     ├─ 3 public pages use it
     ├─ 2 admin panels
     ├─ 1 print layout
     ├─ 1 mobile view
     └─ 16 inline styles use it

  📄 Files Needing Updates:
     ├─ src/pages/home.php
     ├─ src/pages/about.php
     ├─ src/admin/dashboard.php
     ├─ src/admin/settings.php
     ├─ src/email/templates/order.php
     └─ src/admin/settings.php

  🧠 INTUITIVE WARNING:
     "Logo changes usually require 19 file updates
      based on pattern analysis"

  ✅ Ready to update 19 files in 5 minutes
```

## 🧪 Implementation Details

The omnisciencia tools are built on:

1. **AST Parsing**: Parse code into tree structure
2. **Control Flow Analysis**: Understand execution paths
3. **Data Flow Analysis**: Track variable values
4. **Call Graph Construction**: Build dependency graph
5. **Impact Propagation**: Calculate ripple effects
6. **Pattern Recognition**: Learn from consequences
7. **Artificial Intuition**: Predict without reasoning

All tools use the **OmnySys Layered Architecture**:
- Layer A: Static analysis (AST, imports/exports)
- Layer B: Semantic analysis (events, state, connections)
- Layer C: Memory layer (queries, cache, pattern learning)

## 📚 Further Reading

- [Installation Guide](./INSTALL.md)
- [MCP Setup](./MCP_SETUP.md)
- [Query API Reference](./src/layer-a-static/query/README.md)
- [Future Ideas](./docs/FUTURE_IDEAS.md)
- [Wikipedia: Artificial Intuition](https://en.wikipedia.org/wiki/Artificial_intuition)

---

**OmnySys - Because perfect code decisions require perfect context.**
**Implementing practical Artificial Intuition for software engineering.**
