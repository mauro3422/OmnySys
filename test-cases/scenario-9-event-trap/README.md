# Scenario 9: The Event Race Condition (Propagation Trap)

**Propósito**: Validar si el sistema detecta que un cambio en la propagación de eventos (`stopPropagation`) o en el orden de los listeners rompe flujos de trabajo globales "invisibles".

## El Escenario: Sistema de Comandos y Atajos

1. **GlobalHotkeys.js**: Escucha `keydown` en `window` para comandos globales (ej: Ctrl+S para guardar).
2. **ModalManager.js**: Al abrir un modal, lanza un evento para "capturar el foco".
3. **SmartInput.js**: Un componente de texto avanzado que para evitar que el navegador use "S" (u otros caracteres) como atajos mientras el usuario escribe, usa `e.stopPropagation()`.

## El "Trap" (La Trampa)

Un desarrollador quiere añadir un nuevo comando "Ctrl+K" en `GlobalHotkeys`. Lo añade y funciona. 
Luego, otro desarrollador (o una IA) edita `SmartInput.js` para que sea "más robusto" y añade un `e.stopPropagation()` en todos los eventos de teclado para evitar "fugas".

**Resultado**: El `ModalManager` deja de detectar cuándo el usuario pulsa ESC para cerrar el modal si el foco está en el input, y los comandos globales (como Guardar) mueren. 
La IA, leyendo solo el archivo del Input, cree que es una "mejora de robustez" (best practice), pero está causando un efecto sistémico catastrófico: **anula la capa superior de control**.
