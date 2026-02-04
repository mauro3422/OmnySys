# Scenario IA-Ambiguous-Events: Ambiguous Event Connections

**Propósito**: Testear activación de IA cuando hay eventos con nombres similares pero no idénticos (baja confianza).

## El Escenario

Varios componentes emiten/escuchan eventos con nombres relacionados pero no exactamente iguales. El análisis estático detecta la posibilidad de conexión pero con baja confianza.

## Archivos

- **UserStore.js**: Emite 'user:updated', 'user:deleted'
- **UserProfile.js**: Escucha 'user:change', 'user:modified'
- **AdminPanel.js**: Emite 'admin:user:updated'

## Qué debe detectar la IA

1. Metadata: "Hay eventos similares: 'user:updated' vs 'user:change' vs 'admin:user:updated'"
2. IA: "¿Son estos el mismo evento con diferentes nombres o eventos distintos?"
3. Resultado: Determinar si hay conexión real entre componentes

## Expected AI Activation

✅ **SÍ debe activar IA** porque:
- Hay eventos con baja confianza de conexión
- Nombres similares pero no idénticos
- Necesita razonamiento semántico para agrupar eventos relacionados
