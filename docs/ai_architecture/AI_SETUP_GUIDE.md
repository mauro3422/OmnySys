# Guía de Configuración de IA (Arquitectura Cortex) 🧠

Esta documentación detalla la arquitectura de IA de alto rendimiento importada del proyecto **Giteach**, optimizada para hardware sin CUDA mediante **Vulkan** y ejecución paralela.

## 🍱 Arquitectura de Triple Servidor Local

Para garantizar cero latencia mientras se analizan grandes repositorios, el sistema utiliza tres nodos de IA localizados:

| Servidor | Puerto | Rol | Especificaciones Técnicas |
| :--- | :--- | :--- | :--- |
| **Brain** (Cerebro) | `8000` | Chat y Orquestación | GPU Acelerada (Vulkan) - Modelo LFM 2.5 |
| **Intelligence** | `8002` | Mappers y Síntesis | Cluster de CPU dedicado (Alta Paralelización) |
| **Vectors** | `8001` | Memoria Semántica (RAG) | Nodo CPU (Nomic Embeddings) |

---

## 🚀 Optimización Vulkan (Sin CUDA)

Dado que no hay soporte CUDA, el sistema utiliza el backend de **Vulkan** a través de `llama.cpp`. Esto permite usar la VRAM de tarjetas gráficas AMD/Intel/NVIDIA antiguas de forma eficiente.

### Componentes Necesarios:
1.  **Binarios**: `llama-server.exe` compilado con soporte Vulkan.
2.  **Librerías**: `ggml-vulkan.dll` y `llama.dll` (deben estar en la misma carpeta que el servidor).
3.  **Modelo**: `LFM2.5-1.2B-Instruct-Q8_0.gguf` (Modelo Liquid Foundation optimizado para edge).

---

## ⚡ Estrategia de Paralelismo: Continuous Batching (`-cb`)

El secreto de la velocidad del sistema Giteach es el uso del flag `-cb`.

*   **Sin `-cb`**: El servidor procesa una petición tras otra (secuencial).
*   **Con `-cb`**: El servidor intercala los tokens de múltiples trabajadores. Esto permite que el sistema analice 4 archivos simultáneamente sin que el tiempo total se cuatriplique.

### Configuración de Slots:
El parámetro `--parallel 4` reserva slots de memoria. Se recomienda dividir el contexto total (`--ctx-size`) entre el número de slots para evitar truncamientos.

## 📂 Checklist de Transferencia Manual (Desde Giteach)

Como no puedo mover archivos binarios pesados directamente, aquí tienes la lista exacta de qué copiar y dónde encontrarlo en tu proyecto **Giteach**:

### 1. Servidor e Inferencia (Básico para Vulkan)
**Origen:** `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\server\`
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\src\ai\server\`

**Archivos Críticos:**
- `llama-server.exe` (El motor principal)
- `ggml-vulkan.dll` (¡Vital para que use tu GPU!)
- `llama.dll`
- `ggml.dll`
- `ggml-base.dll`
- (Recomendación: Copia **todo** el contenido de la carpeta `server` de Giteach a la carpeta `src/ai/server` de Aver).

### 2. Modelos (El "Cerebro")
**Origen:** `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Misceláneos\Giteach\models\`
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\src\ai\models\`

**Archivos a mover:**
- `LFM2.5-1.2B-Instruct-Q8_0.gguf` (~1.25 GB)
- `nomic-embed-text-v1.5.Q4_K_M.gguf` (Si vas a usar RAG/Vectores)

### 3. Logs (Para diagnóstico)
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\📁 PROYECTOS\Desarrollo\aver\logs\`
- (Crea la carpeta `logs` en la raíz de Aver si no existe, los scripts de .bat la necesitan para escribir).

---

## 🛠️ Scripts de Inicio

Se han creado los siguientes scripts en `src/ai/scripts/`:

1.  **`start_brain_gpu.bat`**: Inicia el servidor en el puerto 8000 con soporte completo de GPU (Vulkan).
2.  **`start_brain_cpu.bat`**: Inicia el servidor en el puerto 8002 usando solo CPU para tareas de mapeo masivo.

---

## 💡 ¿Ollama o llama.cpp?

Aunque Ollama es excelente para uso general, en **Giteach** se utiliza **llama-server (llama.cpp)** directamente por tres razones:
1.  **Soporte Vulkan granular**: Control total sobre los layers cargados en GPU.
2.  **Continuous Batching**: Ollama no siempre expone el control total sobre el batching paralelo de forma tan agresiva como el servidor nativo.
3.  **Memoria**: Permite cuantizar el KV Cache (`--cache-type-k q8_0`) para ahorrar un 50% de VRAM.

---

## 📅 Próximos Pasos para Implementación:
1.  Descargar el modelo `LFM2.5-1.2B-Instruct-Q8_0.gguf` en `src/ai/models/`.
2.  Asegurar que los binarios de `server/` incluyen la `ggml-vulkan.dll`.
3.  Ejecutar `start_brain_gpu.bat` para validar la detección de la tarjeta gráfica.
