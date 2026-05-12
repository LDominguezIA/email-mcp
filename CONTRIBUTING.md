# Guía de Contribución

¡Gracias por tu interés en contribuir a **email-mcp**!

## Código de conducta

Ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Cómo contribuir

### Reportar bugs

Usa el [template de bug](.github/ISSUE_TEMPLATE/bug_report.md) para abrir un issue.  
Incluye siempre: versión de Node.js, modo de autenticación (SMTP/Graph) y los pasos exactos para reproducir el error.

### Proponer features

Usa el [template de feature](.github/ISSUE_TEMPLATE/feature_request.md).  
Explica el caso de uso real que resolvería la nueva herramienta MCP.

### Enviar código

1. Haz fork del repositorio
2. Crea una rama descriptiva:
   ```bash
   git checkout -b feat/email-adjuntos
   git checkout -b fix/scheduler-timezone
   ```
3. Haz commits atómicos con mensajes claros:
   ```
   feat: añade soporte para adjuntos en email_enviar
   fix: corrige zona horaria en scheduler para UTC-6
   ```
4. Verifica que el servidor arranca sin errores:
   ```bash
   npm start
   ```
5. Abre un Pull Request usando el [template](.github/PULL_REQUEST_TEMPLATE.md)

## Convenciones de código

- **Módulos ES (`import`/`export`)** — el proyecto usa `"type": "module"`
- **Sin dependencias externas** — todo debe resolverse con Node.js built-ins
- **Nombres de herramientas MCP** en snake_case con prefijo `email_`
- Usa 2 espacios para indentar

## Añadir una nueva herramienta MCP

1. Define el descriptor en el array `TOOLS` de `src/index.js`
2. Añade el handler en el `switch` de `callTool()`
3. Si la lógica es compleja, extráela a un módulo en `src/`
4. Documenta la herramienta en el README

## Añadir una plantilla HTML

1. Crea el archivo en `templates/nombre.html`
2. Registra el nombre en `src/templates.js`
3. Añade una fila en la tabla de plantillas del README

## Proceso de revisión

Los PRs se revisan en un plazo de 2–3 días hábiles.
