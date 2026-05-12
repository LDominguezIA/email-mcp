# email-mcp

Servidor MCP (Model Context Protocol) para Microsoft 365. Permite enviar, programar y gestionar emails desde Claude Code sin dependencias externas — solo Node.js built-ins.

## Características

- **Autenticación dual**: SMTP (Outlook/Office365) o Microsoft Graph API (auto-detectado)
- **Envío inmediato** con `email_enviar`
- **Programación de envíos** con `email_programar`
- **Borradores** con `email_borrador`
- **Plantillas HTML** con `email_plantilla`
- **Cola de envíos** con `email_cola` / `email_cancelar`
- **Historial** con `email_enviados`

## Requisitos

- Node.js >= 18
- Cuenta Microsoft 365 o Outlook

## Instalación

```bash
git clone https://github.com/llopez2018/email-mcp.git
cd email-mcp
cp .env.example .env
# Edita .env con tus credenciales
```

## Configuración

```bash
# .env
SMTP_USER=tu@empresa.com
SMTP_PASS=tu_contraseña_o_app_password
```

Ver `.env.example` para opciones completas (SMTP vs Graph API).

## Uso con Claude Code

Añade en `.mcp.json` de tu proyecto:

```json
{
  "mcpServers": {
    "email-mcp": {
      "command": "node",
      "args": ["/ruta/a/email-mcp/src/index.js"],
      "env": {
        "FROM_EMAIL": "tu@empresa.com",
        "SMTP_USER": "tu@empresa.com",
        "SMTP_PASS": "tu_contraseña"
      }
    }
  }
}
```

## Licencia

MIT
