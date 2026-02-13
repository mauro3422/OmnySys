---
?? **DOCUMENTO RESCATADO DEL ARCHIVO**

Visualizaci�n de estructura de storage
Fecha original: 2026-02-??
Relevancia: T�CNICA - Estructura de datos

---
# Visualización de Storage - Estructura de datos

## 📂 Estructura actual: Por ARCHIVO completo

```
.aver/
├── index.json                    # 📋 Índice ligero (2KB)
│   └── { metadata, fileIndex }
│
├── files/                        # 📄 Análisis POR ARCHIVO
│   ├── src/
│   │   ├── UI.js.json           # TODO sobre UI.js (6.5KB)
│   │   ├── Player.js.json       # TODO sobre Player.js (3.4KB)
│   │   └── GameStore.js.json    # TODO sobre GameStore.js (4.1KB)
│   └── ...
│
├── connections/                  # 🔗 Conexiones GLOBALES
│   ├── shared-state.json        # Todas las conexiones de estado (3.8KB)
│   └── event-listeners.json     # Todas las conexiones de eventos (5KB)
│
└── risks/                        # ⚠️ Risk assessment
    └── assessment.json          # Scores de todos los archivos (5.9KB)
```

## 📄 Ejemplo concreto: UI.js

### Tu código fuente:
```javascript
// src/UI.js
export function displayScore() {      // Función 1
  const scoreElement = document.getElementById('score');
  scoreElement.textContent = `Score: ${window.gameState.score}`;
}

export function displayLevel() {      // Función 2
  const levelElement = document.getElementById('level');
  levelElement.textContent = `Level: ${window.gameState.level}`;
}

export function displayPlayerName() { // Función 3
  const nameElement = document.getElementById('player-name');
  nameElement.textContent = window.gameState.playerName;
}

export function updateUI() {          // Función 4
  displayScore();
  displayLevel();
  displayPlayerName();
}
```

### Lo que se guarda en `.aver/files/src/UI.js.json`:

```json
{
  "path": "src/UI.js",

  "exports": [
    { "name": "displayScore", "type": "function" },
    { "name": "displayLevel", "type": "function" },
    { "name": "displayPlayerName", "type": "function" },
    { "name": "updateUI", "type": "function" }
  ],

  "imports": [],

  "calls": [
    { "caller": "updateUI", "callee": "displayScore" },
    { "caller": "updateUI", "callee": "displayLevel" },
    { "caller": "updateUI", "callee": "displayPlayerName" }
  ],

  "semanticConnections": [
    {
      "type": "shared_state",
      "sourceFile": "src/UI.js",
      "targetFile": "src/GameStore.js",
      "globalProperty": "gameState",
      "reason": "UI.js lee window.gameState creado por GameStore.js",
      "evidence": {
        "line": 12,
        "column": 22,
        "functionContext": "displayScore"
      }
    },
    {
      "type": "shared_state",
      "sourceFile": "src/UI.js",
      "targetFile": "src/Player.js",
      "globalProperty": "gameState",
      "reason": "UI.js lee window.gameState modificado por Player.js"
    }
  ],

  "sideEffects": {
    "hasGlobalAccess": true,
    "modifiesDOM": true,
    "accessesWindow": true
  },

  "riskScore": {
    "total": 4,
    "severity": "medium"
  }
}
```

## 🔗 Diagrama de conexiones: Cómo se relacionan los archivos

```
┌─────────────────┐
│  GameStore.js   │ ← Crea window.gameState = { score: 0, level: 1 }
└────────┬────────┘
         │
         │ escribe
         ↓
    window.gameState (estado global)
         ↑         ↑
         │ lee     │ modifica
         │         │
┌────────┴────┐  ┌┴──────────┐
│   UI.js     │  │ Player.js │
│             │  │           │
│ displayScore│  │ increment │
│ displayLevel│  │  Score    │
└─────────────┘  └───────────┘
```

Esto se guarda en 3 archivos separados:

1. **`.aver/files/src/GameStore.js.json`** (4.1KB)
2. **`.aver/files/src/UI.js.json`** (6.5KB)
3. **`.aver/files/src/Player.js.json`** (3.4KB)

Y las conexiones en:
4. **`.aver/connections/shared-state.json`** (3.8KB)

## 🤔 Tu pregunta: ¿Debería guardarse por FUNCIÓN en vez de por ARCHIVO?

### Opción A: Por ARCHIVO (actual) ✅

```
.aver/files/src/UI.js.json (6.5KB)
└── Contiene:
    ├── displayScore()
    ├── displayLevel()
    ├── displayPlayerName()
    └── updateUI()
```

**Ventajas:**
- ✅ Simple de implementar
- ✅ Fácil de versionar con git
- ✅ Coincide con la estructura del proyecto
- ✅ Queries rápidos: "dame todo sobre UI.js" → un solo archivo

**Desventajas:**
- ❌ Si solo quieres info de `displayScore()`, cargas TODO UI.js
- ❌ Archivo grande si tiene 50+ funciones

### Opción B: Por FUNCIÓN (propuesta) 🤔

```
.aver/files/src/UI.js/
├── index.json              # Metadata del archivo
├── displayScore.json       # Solo esta función
├── displayLevel.json
├── displayPlayerName.json
└── updateUI.json
```

**Ventajas:**
- ✅ Granularidad máxima
- ✅ Solo cargas la función que necesitas
- ✅ Ideal para archivos muy grandes (1000+ líneas)

**Desventajas:**
- ❌ Muchos archivos pequeños (overhead del filesystem)
- ❌ Más complejo de implementar
- ❌ Git muestra cambios en muchos archivos
- ❌ Queries más lentos: necesitas cargar múltiples archivos

## 📊 Comparación práctica

### Escenario: UI.js con 4 funciones

| Operación | Por ARCHIVO | Por FUNCIÓN |
|-----------|-------------|-------------|
| "Analiza displayScore()" | Carga 6.5KB (todo UI.js) | Carga 1.5KB (solo displayScore) |
| "Analiza todo UI.js" | Carga 6.5KB (1 archivo) | Carga 6.5KB (4 archivos) |
| Archivos en .aver/ | 1 archivo | 4 archivos |
| Git diff | 1 archivo cambia | 4 archivos cambian |

### Escenario: utils.js con 100 funciones

| Operación | Por ARCHIVO | Por FUNCIÓN |
|-----------|-------------|-------------|
| "Analiza formatDate()" | Carga 150KB (todo utils.js) ❌ | Carga 1.5KB (solo formatDate) ✅ |
| "Analiza todo utils.js" | Carga 150KB (1 archivo) | Carga 150KB (100 archivos) ⚠️ |
| Archivos en .aver/ | 1 archivo | 100 archivos |

## 🎯 Recomendación: Enfoque HÍBRIDO

### Estrategia inteligente:

```javascript
// Si archivo < 100KB o < 20 funciones → guardar por ARCHIVO
.aver/files/src/UI.js.json

// Si archivo > 100KB o > 20 funciones → guardar por FUNCIÓN
.aver/files/src/utils.js/
├── index.json
├── formatDate.json
├── parseJSON.json
└── ...
```

## 🔍 Para el MCP Server: Granularidad óptima

### Caso de uso típico:
```
User: "¿Qué hace la función displayScore en UI.js?"

MCP Server query:
1. Leer .aver/files/src/UI.js.json (6.5KB)
2. Filtrar por función "displayScore"
3. Extraer:
   - Código de la función
   - Conexiones semánticas de esa función
   - Side effects de esa función
4. Retornar solo eso al LLM
```

### Con granularidad por archivo (actual):
```
✅ Carga 6.5KB
✅ Filtra en memoria
✅ Retorna ~1KB al LLM
```

### Con granularidad por función:
```
✅ Carga 1.5KB
❌ No necesita filtrar
✅ Retorna ~1KB al LLM

Ahorro: 5KB menos cargados
```

## 💡 Conclusión

### Para tu caso (proyectos típicos):

**Mantener granularidad POR ARCHIVO** es óptimo porque:

1. ✅ Archivos típicos tienen 5-20 funciones (no 100+)
2. ✅ Cargar 6KB vs 1.5KB es irrelevante (ambos son rápidos)
3. ✅ Más simple de mantener
4. ✅ Git-friendly
5. ✅ El MCP Server filtrará en memoria de todas formas

### Cuándo cambiar a POR FUNCIÓN:

- ❗ Archivos > 1000 líneas con 50+ funciones
- ❗ Queries muy específicos por función individual
- ❗ Necesitas actualizaciones incrementales a nivel función

## 📈 Ejemplo visual final: Árbol completo

```
tu-proyecto/
│
├── src/                          ← Tu código
│   ├── UI.js
│   ├── Player.js
│   └── GameStore.js
│
└── .aver/                        ← Análisis guardado
    │
    ├── index.json                [2KB] Índice: qué archivos existen
    │   └── {
    │         "UI.js": { riskLevel: "medium", connections: 2 },
    │         "Player.js": { riskLevel: "low", connections: 0 }
    │       }
    │
    ├── files/                    [Por archivo]
    │   └── src/
    │       ├── UI.js.json        [6.5KB] TODO sobre UI.js
    │       │   └── {
    │       │         exports: [displayScore, displayLevel, ...],
    │       │         semanticConnections: [→GameStore, →Player],
    │       │         sideEffects: { modifiesDOM: true }
    │       │       }
    │       │
    │       ├── Player.js.json    [3.4KB] TODO sobre Player.js
    │       └── GameStore.js.json [4.1KB] TODO sobre GameStore.js
    │
    ├── connections/              [Conexiones globales]
    │   ├── shared-state.json     [3.8KB] Todas las conexiones de estado
    │   │   └── [
    │   │         { UI.js → GameStore.js: "lee gameState" },
    │   │         { UI.js → Player.js: "lee gameState" },
    │   │         { Player.js → GameStore.js: "modifica gameState" }
    │   │       ]
    │   │
    │   └── event-listeners.json  [5KB] Todas las conexiones de eventos
    │
    └── risks/                    [Risk assessment]
        └── assessment.json       [5.9KB] Scores de todos los archivos
            └── {
                  "UI.js": { total: 4, severity: "medium" },
                  "Player.js": { total: 1, severity: "low" }
                }
```

## 🎯 Respuesta a tu pregunta específica

> "Un archivo tiene varias funciones, ¿se guardan en la misma carpeta o por grafos?"

**Respuesta:** Se guarda TODO el archivo en UN solo JSON:

```
.aver/files/src/UI.js.json
└── Contiene:
    ├── Lista de funciones (exports)
    ├── Llamadas entre funciones (calls)
    ├── Conexiones semánticas del archivo
    └── Side effects del archivo
```

Las **conexiones entre archivos** se guardan por separado en:
```
.aver/connections/shared-state.json
└── [ UI.js → GameStore.js, UI.js → Player.js, ... ]
```

> "¿Conviene separar por bloques/funciones?"

**Para MCP Server: NO conviene** porque:
- El LLM puede filtrar las funciones que necesita
- Cargar 6KB vs 1.5KB es irrelevante (ambos instantáneos)
- Más simple de implementar y mantener

**Solo convendría si:**
- Archivos muy grandes (1000+ líneas)
- O necesitas actualizaciones incrementales a nivel función

