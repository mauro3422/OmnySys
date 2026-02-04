# Scenario IA-Orphan-Effects: Orphan File with Suspicious Side Effects

**Propósito**: Testear activación de IA cuando hay un archivo "huérfano" que tiene side effects sospechosos.

## El Escenario

LegacyAnalytics.js no es importado por nadie (huérfano), pero muta global state y usa localStorage. La IA debe determinar si realmente está conectado al sistema o es código muerto.

## Archivos

- **MainApp.js**: App principal que importa Analytics (pero no LegacyAnalytics)
- **Analytics.js**: Analytics moderno - importado por MainApp
- **LegacyAnalytics.js**: Archivo HUÉRFANO con localStorage y global mutations

## Qué debe detectar la IA

1. Metadata: "LegacyAnalytics.js es huérfano pero tiene side effects"
2. IA: "Analiza si este archivo realmente se ejecuta (ej: via script tag) o es código muerto"
3. Resultado: Determinar si es código muerto o tiene conexión oculta

## Expected AI Activation

✅ **SÍ debe activar IA** porque:
- Es archivo huérfano (0 imports, 0 usedBy)
- Tiene side effects sospechosos (localStorage, global access)
- Necesita verificación de IA para determinar si es código muerto
