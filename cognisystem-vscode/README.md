# 🧠 CogniSystem para VS Code

Extensión de Visual Studio Code para visualizar dependencias y conexiones semánticas de tu código JavaScript/TypeScript.

![Demo](https://via.placeholder.com/800x400?text=CogniSystem+Graph+Demo)

## ✨ Características

- 🔥 **Visualización de Grafo Interactivo** - Ve todas las dependencias de tu proyecto
- 🎯 **Mapa de Impacto** - Descubre qué archivos se ven afectados al modificar uno
- ⚠️ **Detección de Riesgo** - Identifica automáticamente archivos de alto riesgo
- 🔗 **Conexiones Semánticas** - Detecta estado compartido, eventos y side effects
- 📊 **Panel Lateral** - Acceso rápido a archivos críticos

## 🚀 Instalación

### Paso 1: Compilar la Extensión

```bash
cd cognisystem-vscode
npm install
npm run compile
```

### Paso 2: Instalar en VS Code

**Opción A: Modo Desarrollo (Recomendado para probar)**

1. Abre VS Code
2. Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
3. Escribe: `Extensions: Install from VSIX`
4. Selecciona el archivo (primero debes empaquetarlo, ver abajo)

**O más fácil - Modo Desarrollo Directo:**

1. Abre la carpeta `cognisystem-vscode` en VS Code
2. Presiona `F5` (o `Run > Start Debugging`)
3. Se abrirá una nueva ventana de VS Code con la extensión cargada

### Paso 3: Empaquetar (Opcional - para distribución)

```bash
npm install -g @vscode/vsce
vsce package
```

Esto genera un archivo `.vsix` que puedes instalar en cualquier VS Code.

## 📖 Uso

### 1. Analizar tu Proyecto

Primero necesitas generar los datos de CogniSystem:

**Opción A: Desde VS Code**
- Presiona `Ctrl+Shift+P`
- Escribe: `CogniSystem: Analizar Proyecto`
- Esto ejecuta el indexer en un terminal integrado

**Opción B: Manual**
```bash
node src/layer-a-static/indexer.js .
```

Verás que se crea una carpeta `.aver/` en tu proyecto con todos los datos.

### 2. Abrir el Grafo

- Presiona `Ctrl+Shift+P`
- Escribe: `CogniSystem: Mostrar Grafo de Dependencias`
- O haz clic en el botón del grafo en la barra de título del editor

### 3. Ver Mapa de Impacto

Haz clic derecho en cualquier archivo `.js` o `.ts` en el explorador:
- Selecciona `CogniSystem: Mapa de Impacto del Archivo Actual`
- O usa el botón en la barra de título cuando tengas un archivo abierto

### 4. Panel Lateral

Mira el panel "CogniSystem" en el explorador lateral:
- Lista de archivos de alto riesgo 🔴
- Acceso rápido al grafo
- Botón de refrescar

## 🎨 Controles del Grafo

| Acción | Descripción |
|--------|-------------|
| **Click en nodo** | Ver información del archivo |
| **Doble click** | Abrir archivo en editor |
| **Drag** | Mover nodos |
| **Scroll** | Zoom in/out |
| **Botones superiores** | Resetear vista, cambiar layout, filtrar |

### Layouts Disponibles

- **COSE** (default) - Layout de fuerza dirigida
- **Circle** - Disposición circular
- **Grid** - Cuadrícula ordenada
- **Concentric** - Círculos concéntricos por riesgo

### Leyenda de Colores

| Color | Significado |
|-------|-------------|
| 🔴 Rojo | Riesgo Crítico (8-10) |
| 🟠 Naranja | Riesgo Alto (6-7) |
| 🟡 Amarillo | Riesgo Medio (4-5) |
| 🟢 Verde | Riesgo Bajo (0-3) |
| ➖ Línea gris | Import/Dependencia |
| ➖ Línea morada | Conexión Semántica |

## ⚙️ Configuración

Abre `settings.json` (`Ctrl+,` → busca "CogniSystem"):

```json
{
  "cognisystem.autoAnalyzeOnOpen": false,
  "cognisystem.showHighRiskIndicator": true,
  "cognisystem.graph.layout": "cose"
}
```

| Configuración | Descripción | Default |
|---------------|-------------|---------|
| `autoAnalyzeOnOpen` | Analizar automáticamente al abrir proyecto | `false` |
| `showHighRiskIndicator` | Mostrar indicadores de riesgo en explorador | `true` |
| `graph.layout` | Layout por defecto del grafo | `"cose"` |

## 🔧 Comandos Disponibles

| Comando | Atajo | Descripción |
|---------|-------|-------------|
| `CogniSystem: Analizar Proyecto` | - | Genera/actualiza el análisis |
| `CogniSystem: Mostrar Grafo` | - | Abre el grafo interactivo |
| `CogniSystem: Mapa de Impacto` | - | Muestra impacto del archivo actual |
| `CogniSystem: Refrescar Análisis` | - | Recarga datos desde disco |

## 🐛 Solución de Problemas

### "Primero analiza el proyecto"

Necesitas correr el indexer antes de usar la extensión:
```bash
node src/layer-a-static/indexer.js .
```

### El grafo aparece vacío

1. Verifica que exista la carpeta `.aver/` en tu proyecto
2. Asegúrate de que tenga archivos dentro (files/, connections/, etc.)
3. Usa el comando "Refrescar Análisis"

### El grafo no se abre

1. Abre la consola de desarrollador: `Help > Toggle Developer Tools`
2. Busca errores en la consola
3. Verifica que la extensión esté activada en el panel de extensiones

## 🗺️ Roadmap

- [ ] Indicadores de riesgo en el explorador de archivos
- [ ] CodeLens (anotaciones inline en el código)
- [ ] Autocompletado con contexto de dependencias
- [ ] Comparación de versiones del análisis
- [ ] Filtros avanzados en el grafo
- [ ] Exportar grafo como PNG/SVG

## 📄 Estructura del Proyecto

```
cognisystem-vscode/
├── package.json          # Configuración de la extensión
├── tsconfig.json         # Configuración TypeScript
├── src/
│   └── extension.ts      # Código principal
├── out/                  # Archivos compilados (generado)
└── README.md             # Este archivo
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📜 Licencia

MIT

---

**Hecho con ❤️ para la comunidad CogniSystem**
