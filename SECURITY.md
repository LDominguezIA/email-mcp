# Política de Seguridad

## Versiones con soporte

| Versión | Soporte de seguridad |
|---------|---------------------|
| 1.0.x   | ✅ Con soporte       |

## Reportar una vulnerabilidad

**No abras un issue público** para reportar vulnerabilidades de seguridad.

Envía un email a: **ldominguez@atisa.com**

Incluye en tu reporte:
- Tipo y descripción de la vulnerabilidad
- Archivos o componentes afectados
- Pasos para reproducir el problema
- Impacto potencial (exfiltración de credenciales, SSRF, etc.)

Recibirás respuesta en **48 horas**. Si se confirma la vulnerabilidad, se publicará un security advisory y se te acreditará en el fix.

## Consideraciones de seguridad importantes

Este servidor MCP maneja credenciales sensibles (contraseñas SMTP, client secrets de Azure AD).  
Ten en cuenta:

- **Nunca** commits de archivos `.env` con credenciales reales
- Usa **App Passwords** de Microsoft en lugar de tu contraseña principal cuando sea posible
- En producción, prefiere el modo **Microsoft Graph API** con permisos mínimos (`Mail.Send`)
- Revisa regularmente los permisos del App Registration en Azure AD
