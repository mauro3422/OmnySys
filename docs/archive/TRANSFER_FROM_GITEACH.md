# Transferencia de Archivos desde Giteach

Este documento guía la transferencia manual de binarios y modelos desde el proyecto **Giteach** a **OmnySys (aver)**.

## ¿Por qué no están en Git?

Los siguientes archivos están excluidos de Git por su tamaño:
- **Modelo LLM**: ~1.25 GB
- **Binarios compilados**: ~200 MB

Ver [.gitignore](../.gitignore) - sección "AI Models and Binaries"

---

## Archivos a Transferir

### 1. Servidor llama.cpp (Binarios)

**Origen**:
```
C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\server\
```

**Destino**:
```
C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\src\ai\server\
```

**Archivos críticos**:
- ✅ `llama-server.exe` - Motor de inferencia principal
- ✅ `ggml-vulkan.dll` - Aceleración GPU vía Vulkan (CRÍTICO)
- ✅ `llama.dll` - Core llama.cpp
- ✅ `ggml.dll` - Backend de GGML
- ✅ `ggml-base.dll` - Utilidades base

**Archivos opcionales** (copiar todo el directorio):
- `vulkan-1.dll` - Si no está en tu sistema
- Otras DLLs auxiliares

### 2. Modelo LLM

**Origen**:
```
C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\models\
```

**Destino**:
```
C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\src\ai\models\
```

**Archivo**:
- ✅ `LFM2.5-1.2B-Instruct-Q8_0.gguf` (~1.25 GB)

**Modelo opcional** (si quieres usar RAG/vectores en el futuro):
- `nomic-embed-text-v1.5.Q4_K_M.gguf` (para embeddings)

---

## Instrucciones (Windows)

### Opción 1: Copiar manualmente

1. **Abrir dos ventanas del Explorador de Windows**:
   - Izquierda: `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\`
   - Derecha: `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\`

2. **Copiar carpeta server**:
   - Seleccionar TODO el contenido de `Giteach\server\`
   - Copiar (Ctrl+C)
   - Pegar en `aver\src\ai\server\` (Ctrl+V)

3. **Copiar modelo**:
   - Seleccionar `Giteach\models\LFM2.5-1.2B-Instruct-Q8_0.gguf`
   - Copiar (Ctrl+C)
   - Pegar en `aver\src\ai\models\` (Ctrl+V)

### Opción 2: Comando (PowerShell)

Abre PowerShell en la raíz de **aver** y ejecuta:

```powershell
# Copiar binarios del servidor
Copy-Item -Path "C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\server\*" `
          -Destination ".\src\ai\server\" `
          -Recurse -Force

# Copiar modelo
Copy-Item -Path "C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\models\LFM2.5-1.2B-Instruct-Q8_0.gguf" `
          -Destination ".\src\ai\models\" `
          -Force
```

### Opción 3: Comando (CMD)

```cmd
xcopy "C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\server\*" "src\ai\server\" /E /I /Y

xcopy "C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\models\LFM2.5-1.2B-Instruct-Q8_0.gguf" "src\ai\models\" /Y
```

---

## Verificación

Ejecuta en la raíz de **aver**:

```bash
# Verificar binarios
ls src/ai/server/llama-server.exe
ls src/ai/server/ggml-vulkan.dll

# Verificar modelo
ls src/ai/models/LFM2.5-1.2B-Instruct-Q8_0.gguf
```

**Salida esperada**:
```
✓ src/ai/server/llama-server.exe
✓ src/ai/server/ggml-vulkan.dll
✓ src/ai/models/LFM2.5-1.2B-Instruct-Q8_0.gguf
```

O con PowerShell:
```powershell
Test-Path src/ai/server/llama-server.exe
Test-Path src/ai/server/ggml-vulkan.dll
Test-Path src/ai/models/LFM2.5-1.2B-Instruct-Q8_0.gguf
```

Todas deben retornar `True`.

---

## Próximos Pasos

Después de la transferencia:

1. **Iniciar servidor**:
   ```bash
   omnysys ai start gpu
   ```

2. **Verificar estado**:
   ```bash
   omnysys ai status
   ```

3. **Habilitar AI** (editar [src/ai/ai-config.json](../src/ai/ai-config.json)):
   ```json
   {
     "llm": {
       "enabled": true  // ← Cambiar a true
     }
   }
   ```

4. **Analizar proyecto de prueba**:
   ```bash
   omnysys analyze test-cases/scenario-2-semantic/
   ```

---

## Troubleshooting

### "llama-server.exe no se encuentra"
- Verifica que copiaste TODO el contenido de `Giteach\server\`
- No solo el .exe, necesitas las DLLs también

### "ggml-vulkan.dll no se encuentra"
- Esta DLL es CRÍTICA para GPU
- Sin ella, el servidor fallará al iniciar con GPU
- Copia toda la carpeta `server\` para asegurar todas las dependencias

### "Vulkan device not found"
- Tu GPU necesita drivers actualizados
- O usa modo CPU: `omnysys ai start cpu`

### Modelo no encontrado
- Verifica el nombre exacto: `LFM2.5-1.2B-Instruct-Q8_0.gguf`
- Debe estar en `src/ai/models/` (no en subcarpetas)

---

## Referencia

- [src/ai/README.md](../src/ai/README.md) - Setup completo de AI
- [AI_SETUP_GUIDE.md](ai_architecture/AI_SETUP_GUIDE.md) - Arquitectura Vulkan del proyecto Giteach
- [.gitignore](../.gitignore) - Archivos excluidos de Git
