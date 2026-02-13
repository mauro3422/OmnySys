# GuÃ­a de ConfiguraciÃ³n de IA (Arquitectura Cortex) ðŸ§ 

Esta documentaciÃ³n detalla la arquitectura de IA de alto rendimiento importada del proyecto **Giteach**, optimizada para hardware sin CUDA mediante **Vulkan** y ejecuciÃ³n paralela.

## ðŸ± Arquitectura de Triple Servidor Local

Para garantizar cero latencia mientras se analizan grandes repositorios, el sistema utiliza tres nodos de IA localizados:

| Servidor | Puerto | Rol | Especificaciones TÃ©cnicas |
| :--- | :--- | :--- | :--- |
| **Brain** (Cerebro) | `8000` | Chat y OrquestaciÃ³n | GPU Acelerada (Vulkan) - Modelo LFM 2.5 |
| **Intelligence** | `8002` | Mappers y SÃ­ntesis | Cluster de CPU dedicado (Alta ParalelizaciÃ³n) |
| **Vectors** | `8001` | Memoria SemÃ¡ntica (RAG) | Nodo CPU (Nomic Embeddings) |

---

## ðŸš€ OptimizaciÃ³n Vulkan (Sin CUDA)

Dado que no hay soporte CUDA, el sistema utiliza el backend de **Vulkan** a travÃ©s de `llama.cpp`. Esto permite usar la VRAM de tarjetas grÃ¡ficas AMD/Intel/NVIDIA antiguas de forma eficiente.

### Componentes Necesarios:
1.  **Binarios**: `llama-server.exe` compilado con soporte Vulkan.
2.  **LibrerÃ­as**: `ggml-vulkan.dll` y `llama.dll` (deben estar en la misma carpeta que el servidor).
3.  **Modelo**: `LFM2.5-1.2B-Instruct-Q8_0.gguf` (Modelo Liquid Foundation optimizado para edge).

---

## âš¡ Estrategia de Paralelismo: Continuous Batching (`-cb`)

El secreto de la velocidad del sistema Giteach es el uso del flag `-cb`.

*   **Sin `-cb`**: El servidor procesa una peticiÃ³n tras otra (secuencial).
*   **Con `-cb`**: El servidor intercala los tokens de mÃºltiples trabajadores. Esto permite que el sistema analice 4 archivos simultÃ¡neamente sin que el tiempo total se cuatriplique.

### ConfiguraciÃ³n de Slots:
El parÃ¡metro `--parallel 4` reserva slots de memoria. Se recomienda dividir el contexto total (`--ctx-size`) entre el nÃºmero de slots para evitar truncamientos.

## ðŸ“‚ Checklist de Transferencia Manual (Desde Giteach)

Como no puedo mover archivos binarios pesados directamente, aquÃ­ tienes la lista exacta de quÃ© copiar y dÃ³nde encontrarlo en tu proyecto **Giteach**:

### 1. Servidor e Inferencia (BÃ¡sico para Vulkan)
**Origen:** `C:\Users\mauro\OneDrive\Escritorio\ðŸ“ PROYECTOS\MiscelÃ¡neos\Giteach\server\`
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\ðŸ“ PROYECTOS\Desarrollo\aver\src\ai\server\`

**Archivos CrÃ­ticos:**
- `llama-server.exe` (El motor principal)
- `ggml-vulkan.dll` (Â¡Vital para que use tu GPU!)
- `llama.dll`
- `ggml.dll`
- `ggml-base.dll`
- (RecomendaciÃ³n: Copia **todo** el contenido de la carpeta `server` de Giteach a la carpeta `src/ai/server` de Aver).

### 2. Modelos (El "Cerebro")
**Origen:** `C:\Users\mauro\OneDrive\Escritorio\ðŸ“ PROYECTOS\MiscelÃ¡neos\Giteach\models\`
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\ðŸ“ PROYECTOS\Desarrollo\aver\src\ai\models\`

**Archivos a mover:**
- `LFM2.5-1.2B-Instruct-Q8_0.gguf` (~1.25 GB)
- `nomic-embed-text-v1.5.Q4_K_M.gguf` (Si vas a usar RAG/Vectores)

### 3. Logs (Para diagnÃ³stico)
**Destino:** `C:\Users\mauro\OneDrive\Escritorio\ðŸ“ PROYECTOS\Desarrollo\aver\logs\`
- (Crea la carpeta `logs` en la raÃ­z de Aver si no existe, los scripts de .bat la necesitan para escribir).

---

## ðŸ› ï¸ Scripts de Inicio

Se han creado los siguientes scripts en `src/ai/scripts/`:

1.  **`brain_gpu.bat`**: Inicia el servidor en el puerto 8000 con soporte completo de GPU (Vulkan).
2.  **`start_brain_cpu.bat`**: Inicia el servidor en el puerto 8002 usando solo CPU para tareas de mapeo masivo.

---

## ðŸ’¡ Â¿Ollama o llama.cpp?

Aunque Ollama es excelente para uso general, en **Giteach** se utiliza **llama-server (llama.cpp)** directamente por tres razones:
1.  **Soporte Vulkan granular**: Control total sobre los layers cargados en GPU.
2.  **Continuous Batching**: Ollama no siempre expone el control total sobre el batching paralelo de forma tan agresiva como el servidor nativo.
3.  **Memoria**: Permite cuantizar el KV Cache (`--cache-type-k q8_0`) para ahorrar un 50% de VRAM.

---

## ðŸ“… PrÃ³ximos Pasos para ImplementaciÃ³n:
1.  Descargar el modelo `LFM2.5-1.2B-Instruct-Q8_0.gguf` en `src/ai/models/`.
2.  Asegurar que los binarios de `server/` incluyen la `ggml-vulkan.dll`.
3.  Ejecutar `brain_gpu.bat` para validar la detecciÃ³n de la tarjeta grÃ¡fica.

