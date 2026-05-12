# send-report

Envía el resultado de cualquier análisis de Claude Code como email HTML personalizado a través de Microsoft 365.

## Cuándo invocar este skill
- Después de `/reverse-engineering` para enviar el reporte técnico
- Después de un análisis financiero de FinancalFreeHome
- Después de generar un análisis de nave industrial
- Para programar un correo automático con un resumen
- Cuando el usuario diga "envía esto por email", "manda el reporte", "programa un correo"

## Flujo que debes seguir

### Paso 1 — Identifica qué enviar
Determina si hay un análisis reciente en el contexto. Si no, pregunta qué quiere enviar.

### Paso 2 — Elige la plantilla
| Contexto del análisis | Plantilla a usar |
|---|---|
| Resultado de /reverse-engineering o /project-analyst | `ingenieria-inversa` |
| Datos de FinancalFreeHome (vaults, transacciones, runway) | `financiero` |
| Resultado del pipeline de naves-industriales-ai | `naves-industriales` |
| Cualquier otro contenido | `generico` |

### Paso 3 — Recopila datos para la plantilla

**Para `ingenieria-inversa`** necesitas:
```json
{
  "proyecto": "Nombre del proyecto",
  "stack": "React + TypeScript + Node.js",
  "arquitectura": "Descripción de la arquitectura detectada",
  "hallazgos": "HTML con lista de hallazgos. Ej: <ul><li>...</li></ul>",
  "health_score": "72",
  "recomendaciones": "HTML con recomendaciones"
}
```

**Para `financiero`** necesitas:
```json
{
  "destinatario": "Nombre del destinatario",
  "mes": "Mayo 2026",
  "ingresos": "100,000",
  "gastos_fijos": "56,500",
  "gasto_corriente": "15,200",
  "remanente": "28,300",
  "runway_dias": "45",
  "burn_rate": "2,370",
  "metas": "HTML con lista de metas",
  "recomendacion_ia": "Consejo del asesor"
}
```

**Para `naves-industriales`** necesitas:
```json
{
  "proyecto": "Nave Alpha - Zapopan",
  "area_m2": "50,000",
  "presupuesto_total": "287,450,000",
  "costo_por_m2": "5,749",
  "suelo_pct": "78",
  "cota_optima": "1,542",
  "dictamen": "WARNING",
  "dictamen_color": "#92400e",
  "desglose": "HTML con tabla de desglose",
  "notas": "Observaciones del análisis"
}
```

**Para `generico`** necesitas:
```json
{
  "destinatario": "Nombre",
  "titulo": "Título del reporte",
  "subtitulo": "Subtítulo / contexto",
  "contenido": "HTML con el contenido principal",
  "remitente": "ldominguez@atisa.com"
}
```

### Paso 4 — Pregunta destinatario y timing

Pregunta siempre:
1. **¿A quién enviar?** — uno o varios emails separados por coma
2. **¿Cuándo?**
   - "Ahora" → usa `email_enviar` o `email_plantilla` sin `programar_para`
   - Fecha/hora específica → usa `email_programar` o `email_plantilla` con `programar_para`
   - "Como borrador" → usa `email_borrador` o `email_plantilla` con `como_borrador: true`

### Paso 5 — Ejecuta la herramienta MCP

Llama a `email_plantilla` con todos los datos recopilados. Si es contenido personalizado sin plantilla, usa `email_enviar` directamente con el HTML generado.

## Ejemplos de invocación

```
/send-report
→ Detecta el análisis previo, pregunta destinatario, envía inmediatamente

/send-report programa el reporte de naves para el lunes 9am a director@empresa.com
→ Usa email_plantilla con programar_para: "2026-05-18T09:00:00"

/send-report guarda como borrador
→ Usa email_plantilla con como_borrador: true
```

## Gestión de la cola

Si el usuario quiere ver o cancelar programaciones:
- Lista pendientes: llama `email_cola`
- Cancela: llama `email_cancelar` con el job_id
- Historial enviados: llama `email_enviados`
