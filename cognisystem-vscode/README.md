# CogniSystem VS Code Extension

Extensión de VS Code para [CogniSystem](https://github.com/mauro3422/OmnySys) - Análisis de código impulsado por IA local.

## Features

- 🔍 **Análisis de Impacto**: Ver qué archivos se ven afectados antes de hacer cambios
- 🧠 **Conexiones Semánticas**: Detecta dependencias invisibles (localStorage, eventos, estado global)
- ⚡ **Priorización**: Cola de análisis con prioridad (Critical > High > Medium > Low)
- 📊 **Risk Score**: Cada archivo tiene un score de riesgo basado en conectividad
- 🎯 **Subsistemas**: Detección automática de módulos independientes

## Requisitos

1. **CogniSystem instalado**:
   ```bash
   npm install -g omnysystem
   # o
   git clone https://github.com/mauro3422/OmnySys
   cd OmnySys && npm link
   ```

2. **Servidor CogniSystem corriendo**:
   ```bash
   omnysystem serve /ruta/a/tu/proyecto
   ```

## Uso

### Iniciar Servidor

1. Abre la paleta de comandos (`Ctrl+Shift+P`)
2. Ejecuta `CogniSystem: Start Server`
3. O manualmente en terminal: `omnysystem serve .`

### Analizar Archivo

- **Desde editor**: Click derecho → "Analyze File"
- **Desde explorador**: Click derecho en archivo → "Analyze File"
- **Comando**: `Ctrl+Shift+P` → "CogniSystem: Analyze File"

### Ver Mapa de Impacto

- **Click en status bar**: Click en "CogniSystem" en la barra de estado
- **Comando**: `Ctrl+Shift+P` → "CogniSystem: Show Impact Map"
- **Auto-hover**: Pasa el mouse sobre imports para ver conexiones

### Configuración

Abre configuración (`Ctrl+,`) y busca "CogniSystem":

```json
{
  "cognisystem.orchestratorPort": 9999,
  "cognisystem.bridgePort": 9998,
  "cognisystem.analyzeOnSave": true,
  "cognisystem.enableHover": true
}
```

## API Endpoints

La extensión se conecta a dos puertos:

- **Puerto 9999** (Orchestrator): Cola de prioridad, análisis async
- **Puerto 9998** (Bridge): Queries sincrónicas, estado del sistema

### Endpoints disponibles:

```
POST http://localhost:9999/command     # Priorizar archivo
GET  http://localhost:9999/status      # Estado de la cola
GET  http://localhost:9999/health      # Health check

GET  http://localhost:9998/api/status  # Estado completo
GET  http://localhost:9998/api/files   # Lista de archivos
GET  http://localhost:9998/api/impact/* # Impacto de archivo
POST http://localhost:9998/api/analyze # Analizar archivo
```

## Troubleshooting

### "CogniSystem disconnected"

El servidor no está corriendo. Inícialo con:
```bash
omnysystem serve /ruta/a/tu/proyecto
```

### "Failed to analyze"

1. Verifica que el proyecto tenga análisis previo:
   ```bash
   omnysystem analyze /ruta/a/tu/proyecto
   ```

2. Verifica que el servidor LLM esté activo:
   ```bash
   curl http://localhost:8000/health
   ```

### Puerto ocupado

Si los puertos 9998 o 9999 están ocupados, cámbialos en la configuración:
```json
{
  "cognisystem.orchestratorPort": 9997,
  "cognisystem.bridgePort": 9996
}
```

## Changelog

### 0.2.0
- Integración con Unified Server
- Soporte para cola de prioridad
- Panel de explorador con archivos de alto riesgo
- Indicador de estado en barra de estado

### 0.1.0
- Versión inicial
- Visualización básica de grafo

## Licencia

MIT
