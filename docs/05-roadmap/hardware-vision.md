# 🔌 OmnySys para Hardware - Visión de Extensión a Circuitos

**⚠️ DOCUMENTO DE INVESTIGACIÓN / EXPLORACIÓN**

> **Estado**: Idea en exploración | **Fecha**: 2026-02-12  
> **Origen**: Conversación sobre aplicación de metadatos estructurales a hardware  
> **Potencial**: Muy alto | **Dificultad**: Alta

---

## La Premisa: Hardware es Software con Electrones Reales

> *"Si el software es física de la información, el hardware es física de los electrones. Los mismos patrones aplican, solo que las consecuencias de error son reales (humo)."*

### Por qué los LLMs Fallan con Hardware

| Problema | Software | Hardware |
|----------|----------|----------|
| **Feedback loop** | Error = crash/log | Error = componente muerto/fuego |
| **Estado observable** | Puedo loggear variables | Necesito osciloscopio/multímetro |
| **Determinismo** | 100% determinista | Ruido, temperatura, tolerancias |
| **Rollback** | `git revert` | Soldar/desoldar componentes |
| **Tiempo real** | Async es "eventualmente" | Timing es crítico (ns) |

**Resultado**: Los LLMs generan código de hardware que "parece correcto" pero:
- Olvidan pull-ups en I2C
- No calculan disipación térmica
- Ignoran race conditions eléctricas
- Conectan 5V a pin de 3.3V (💥)

---

## Cómo OmnySys podría Resolverlo

### 1. Metadatos de Componentes (Átomos de Hardware)

```javascript
// Atom (Hardware version)
{
  id: "R1",
  type: "resistor",
  value: "10k",
  package: "0805",
  
  // Conexiones (inputs/outputs)
  pins: {
    1: { net: "VCC", connectedTo: ["U1.8", "C1.1"] },
    2: { net: "RESET", connectedTo: ["U1.1"] }
  },
  
  // Restricciones físicas
  constraints: {
    maxPower: "0.125W",
    tolerance: "5%",
    tempCoeff: "200ppm/°C"
  },
  
  // Función en el circuito
  role: "pull-up",  // ¡Esto es metadato clave!
  purpose: "Keep RESET high during power-up"
}
```

### 2. Grafo de Señales ("Data Flow" de Electrones)

```javascript
// Signal Path Analysis
{
  signal: "I2C_SDA",
  path: [
    { component: "U1", pin: "SDA", type: "MCU", drive: "open-drain" },
    { component: "R1", value: "4.7k", type: "pull-up", to: "3.3V" },
    { component: "U2", pin: "SDA", type: "sensor", input: "I2C_slave" },
    { component: "U3", pin: "SDA", type: "sensor", input: "I2C_slave" }
  ],
  
  // Análisis automático
  issues: [
    {
      type: "missing_pullup",
      severity: "critical",
      message: "I2C_SDA tiene 3 slaves pero solo 1 pull-up. Máximo recomendado: 400pF total."
    },
    {
      type: "voltage_mismatch",
      severity: "warning", 
      message: "U1 es 3.3V pero U2 tolera hasta 5V. Verificar level-shifting."
    }
  ]
}
```

### 3. Detección de "Tunnel Vision" en Hardware

**Ejemplo real** (que un LLM cometería):

```
Usuario: "Agregá un sensor de temperatura al bus I2C"

IA lee: datasheet del sensor, ve que es I2C, lo conecta a SDA/SCL.

IA NO ve:
- El bus ya tiene 4 dispositivos (capacitancia total ~600pF > límite 400pF)
- No hay espacio en PCB para el sensor
- El sensor necesita 100nF de bypass que no está en el BOM
- La dirección I2C (0x48) colisiona con otro sensor existente
- El trace de SDA pasa cerca del switching regulator (ruido)

Resultado: I2C no funciona, debuggear toma 3 días, posiblemente es el ruido.
```

**Con OmnySys para Hardware**:
```
OmnySys: "⚠️ TUNNEL VISION DETECTADO
  - Bus I2C actual: 4 devices, ~600pF (límite: 400pF)
  - Sensor nuevo añade ~150pF → 750pF total
  - Solución: Reducir pull-ups a 2.2k o usar bus separado
  - También: Dirección 0x48 colisiona con TMP102 (U5)"
```

---

## Arquitectura Propuesta: OmnySys-HW

### Layer A: Extracción de Netlist

```javascript
// Desde KiCAD, Eagle, Altium
const circuit = {
  components: extractComponents(pcbFile),  // R, C, U, etc.
  nets: extractNets(pcbFile),              // Conexiones
  footprints: extractFootprints(),         // Packages físicos
  constraints: extractDesignRules()        // Clearance, vías, etc.
};
```

### Layer B: Análisis Semántico de Circuito

**Arquetipos de hardware**:
```javascript
// Detectar automáticamente
{
  pattern: "I2C_bus",
  confidence: 0.95,
  components: ["U1", "U2", "U3", "R1", "R2"],
  checks: [
    { type: "has_pullups", passed: true },
    { type: "voltage_compatible", passed: false, issue: "U3 es 5V, bus es 3.3V" },
    { type: "bus_capacitance", passed: false, issue: "750pF > 400pF" }
  ]
}
```

### Layer C: Verificación en Tiempo Real

**Antes de que el usuario haga el PCB**:
```javascript
// Tool: check_circuit_integrity
{
  checks: [
    { type: "power_budget", status: "ok", watts: 2.3 },
    { type: "thermal", status: "warning", hotspot: "U1: 85°C estimated" },
    { type: "signal_integrity", status: "error", issue: "USB traces too long (500mm > 100mm)" },
    { type: "manufacturing", status: "ok" }
  ]
}
```

---

## Diferencias Clave: Software vs Hardware

| Aspecto | OmnySys-Code | OmnySys-HW |
|---------|--------------|------------|
| **Unidad atómica** | Función | Componente (R, C, U) |
| **Conexión** | Import/call | Net (cobre físico) |
| **"Función"** | Transforma datos | Transforma señal/voltaje |
| **Side effects** | Escribe a DB | Calentamiento, EMI |
| **Testing** | Unit tests | Simulación SPICE + prototipo |
| **Iteración** | ms (hot reload) | Días (PCB fabrication) |
| **Costo de error** | Bug report | Componente quemado |

---

## Casos de Uso Específicos

### 1. Revisión de Esquemático Automática

```
Usuario sube esquemático → OmnySys analiza → Reporte:

✅ Checks pasados:
   - Todos los pines de IC conectados (o marcados NC)
   - Decoupling caps presentes en todos los VCC
   - Polarities correctas en diodos/electrolíticos

⚠️ Warnings:
   - C3 (100uF) está lejos de U1 (>10mm), considerar mover
   - Trace de RESET pasa cerca de motor driver (ruido)

❌ Errores críticos:
   - Q1: Gate flotante (falta pulldown)
   - U2: Pin 7 conectado a 5V pero es 3.3V-only
   - Power budget: 2.8W estimado, regulator es 2W max
```

### 2. BOM Optimization

```
OmnySys: "💡 Oportunidad de consolidación:
  - Usás R1=10k, R2=10.2k, R3=9.8k
  - Todos son pull-ups con ±5% tolerancia
  - Sugerencia: Usar 10k para todos, reducir SKU"
```

### 3. Migración entre Plataformas

```
Usuario: "Migrá este circuito de Arduino Uno a ESP32"

OmnySys: "📋 Plan de migración:
  1. Voltaje: 5V → 3.3V (verificar todos los sensores)
  2. Pines: Mapeo 1:1 disponible excepto A6/A7 (ESP32 no tiene)
  3. Corriente: ESP32 consume más en TX, verificar regulator
  4. WiFi: Antenna keepout area requerida en PCB
  5. Librerías: <SoftwareSerial.h> → <HardwareSerial.h>"
```

---

## Problemáticas Técnicas Reales

### 1. Simulación vs Realidad

```
Problema: SPICE simula ideal, mundo real tiene:
- Parásitos (inductancia de vías, capacitancia de pads)
- Tolerancias (resistores al 5%, capacitores al 20%)
- Temperatura (derating curves)
- Proceso de manufactura (impedancia controlada varía ±10%)

Solución: OmnySys necesita "margins" en vez de valores exactos.
```

### 2. "Soft errors" vs "Hard errors"

```
Software: if (x == null) → fix → test → done
Hardware: if (trace too thin) → puede funcionar 99% del tiempo → falla en calor → hard debug

OmnySys debe detectar "anti-patrones" no solo errores:
- Vías en pads (mala soldabilidad)
- Acute angles en traces (acid traps)
- Thermals desbalanceados (soldadura fría)
```

### 3. Confiabilidad de Fuentes

```
Problema: Datasheets a veces están mal, o son vagos.
- "Typical" vs "Maximum" ratings
- Condiciones de test no especificadas
- Erratas silenciadas

Solución: OmnySys-HW necesita "crowdsourced knowledge":
- "Este regulator tiene problemas de estabilidad con ceramic caps"
- "Evitar este MOSFET para high-side switching"
```

---

## Integración con tu Background (Python + Arduino)

### Flujo de Trabajo Propuesto

```python
# 1. Diseñás circuito en KiCAD
# 2. Exportás netlist

# 3. OmnySys-HW analiza
from omny_hw import CircuitAnalyzer

analyzer = CircuitAnalyzer("proyecto_arduino.net")
report = analyzer.check_circuit()

# 4. Vés problemas ANTES de fabricar
print(report.issues)
# [Warning: I2C bus overloaded, 
#  Error: Missing decoupling cap near crystal]

# 5. Corregís en KiCAD, re-analizás
# 6. Cuando pasa todos los checks → fabricar
```

### Proyecto Starter Sugerido

**"Smart Plant Monitor con OmnySys-HW"**:
- ESP32 + sensores (temp, humedad, luz)
- Comunicación I2C, SPI, ADC
- Battery powered (power budget crítico)
- PCB compacto (routing constraints)

**OmnySys te avisaría**:
- "ESP32 en deep sleep consume 10µA, sensores en sleep consumen 50µA cada uno"
- "Con 1000mAh battery = 2 años estimado (verificar self-discharge)"
- "Sensor de luz I2C address 0x23, sensor temp usa 0x23 → CONFLICTO"

---

## Roadmap Tentativo

### Fase 1: Parser de Netlist (2 semanas)
- KiCAD → JSON
- Extraer componentes, valores, nets
- API básica de queries

### Fase 2: Rule Engine (2 semanas)
- Checks básicos (pines flotantes, decoupling)
- Templates de circuitos comunes (I2C, SPI, power)
- Reporte de issues

### Fase 3: Integración LLM (2 semanas)
- MCP server para hardware
- "Analizá este esquemático"
- "¿Qué pasa si cambio R1 a 1k?"

### Fase 4: Knowledge Base (continuo)
- Aprender de datasheets
- Crowdsourced "gotchas"
- Thermal modeling básico

---

## Conclusión

**¿Es revolucionario?** Potencialmente sí. El hardware es donde los errores cuestan dinero real y tiempo real. Los LLMs actuales son peligrosos porque generan "código que parece bien" sin entender las consecuencias físicas.

**OmnySys-HW sería el "type checker" para circuitos**:
- No garantiza que funcione (eso requiere prototipo)
- Pero garantiza que no hay errores OBVIOS que un humano experto detectaría
- Reduce iteraciones de "fabricar → quemar → debuggear → re-fabricar"

**Próximo paso**: ¿Querés que prototipemos un parser de netlist de KiCAD para empezar?

---

**Documento capturado desde**: Conversación sobre extensión a hardware  
**Fecha**: 2026-02-12  
**Estado**: Exploración activa
