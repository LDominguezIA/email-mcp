# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)  
Versionado: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Sin publicar]

### Añadido
### Cambiado
### Corregido
### Eliminado

## [1.0.0] — 2026-05-11

### Añadido

- Servidor MCP sobre stdio con protocolo JSON-RPC 2.0 + Content-Length headers
- Autenticación dual auto-detectada: SMTP (Office365) y Microsoft Graph API
- Herramienta `email_enviar` — envío inmediato de emails HTML
- Herramienta `email_programar` — programación de envíos con fecha/hora futura
- Herramienta `email_borrador` — guardar borrador en Outlook (modo Graph)
- Herramienta `email_plantilla` — renderizado de plantillas HTML con variables
- Herramienta `email_cola` — listado de emails programados pendientes
- Herramienta `email_cancelar` — cancelación de emails programados
- Herramienta `email_enviados` — historial de envíos recientes (modo Graph)
- Plantillas HTML: financiero, genérico, ingeniería-inversa, naves-industriales, manuales
- Zero dependencias externas — solo Node.js built-ins >= 18
