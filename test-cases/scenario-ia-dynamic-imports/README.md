# Scenario IA-Dynamic-Imports: Dynamic Module Loading

**Propósito**: Testear activación de IA cuando hay dynamic imports con variables.

## El Escenario

Router.js carga módulos dinámicamente basados en la ruta actual. Los nombres de módulos no son estáticos, sino que se construyen en runtime.

## Archivos

- **Router.js**: Tiene `import(\`./modules/${moduleName}\`)` - dynamic import con template literal
- **modules/UserModule.js**: Módulo de usuario
- **modules/AdminModule.js**: Módulo de admin

## Qué debe detectar la IA

1. Metadata: "Router.js usa dynamic import con variable 'moduleName'"
2. IA: "Basándome en el contexto, moduleName puede ser 'UserModule' o 'AdminModule'"
3. Resultado: Conexiones probabilísticas con confidence score

## Expected AI Activation

✅ **SÍ debe activar IA** porque:
- Tiene código dinámico (`import()` con variable)
- No se pueden determinar las conexiones estáticamente
- Necesita inferencia de la IA para saber qué módulos se cargan
