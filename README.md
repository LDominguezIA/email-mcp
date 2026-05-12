# email-mcp

[![CI](https://github.com/LDominguezIA/email-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/LDominguezIA/email-mcp/actions/workflows/ci.yml)
[![Versión](https://img.shields.io/badge/versión-1.0.0-blue)](package.json)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-yellow)](LICENSE)

> Servidor MCP (Model Context Protocol) para Microsoft 365. Permite enviar, programar y gestionar emails desde Claude Code — sin dependencias externas, solo Node.js built-ins.

## Características

- **Autenticación dual**: SMTP (Outlook/Office365) o Microsoft Graph API — auto-detectado por variables de entorno
- **`email_enviar`** — Envío inmediato de emails HTML
- **`email_programar`** — Programa envíos para una fecha y hora futuras
- **`email_borrador`** — Guarda como borrador en Outlook *(solo modo Graph)*
- **`email_plantilla`** — Renderiza una plantilla HTML y envía o programa
- **`email_cola`** — Lista emails programados pendientes
- **`email_cancelar`** — Cancela un email programado
- **`email_enviados`** — Muestra los últimos emails enviados *(solo modo Graph)*

## Requisitos

- Node.js >= 18
- Cuenta Microsoft 365 o Outlook con SMTP habilitado o acceso a Microsoft Graph API

## Instalación

```bash
git clone https://github.com/LDominguezIA/email-mcp.git
cd email-mcp
cp .env.example .env
# Edita .env con tus credenciales
```

## Configuración

### Modo SMTP (más sencillo)

```bash
# .env
SMTP_USER=tu@empresa.com
SMTP_PASS=tu_contraseña_o_app_password
FROM_EMAIL=tu@empresa.com
```

### Modo Microsoft Graph API (funcionalidades completas)

```bash
# .env
TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=tu_client_secret
FROM_EMAIL=tu@empresa.com
```

Ver `.env.example` para todas las opciones disponibles.

## Uso con Claude Code

Añade en el `.mcp.json` de tu proyecto:

```json
{
  "mcpServers": {
    "email-mcp": {
      "command": "node",
      "args": ["/ruta/absoluta/a/email-mcp/src/index.js"],
      "env": {
        "FROM_EMAIL": "tu@empresa.com",
        "SMTP_USER": "tu@empresa.com",
        "SMTP_PASS": "tu_contraseña"
      }
    }
  }
}
```

Luego en Claude Code puedes decir:

```
Envía un email a juan@empresa.com con el asunto "Reunión" y el cuerpo "Confirmamos la reunión del lunes"
```

## Desarrollo

```bash
git clone https://github.com/LDominguezIA/email-mcp.git
cd email-mcp
cp .env.example .env

# Modo watch (recarga al guardar)
npm run dev

# Ejecutar el servidor
npm start
```

## Plantillas disponibles

El servidor incluye plantillas HTML listas para usar:

| Plantilla | Descripción |
|-----------|-------------|
| `financiero` | Comunicaciones financieras corporativas |
| `generico` | Email genérico multipropósito |
| `ingenieria-inversa` | Reporte de análisis de código |
| `naves-industriales` | Comunicaciones sector industrial |
| `manual-accesos` | Onboarding y accesos de sistemas |
| `manual-claude-code` | Documentación de Claude Code |
| `manual-completo` | Manual completo de producto |

## Contribución

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md).

## Licencia

MIT — ver [LICENSE](LICENSE).
