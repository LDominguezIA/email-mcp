/**
 * SMTP client con STARTTLS — solo Node.js built-ins.
 * Soporta smtp.office365.com:587 (Microsoft 365 / Outlook corporativo)
 * y smtp-mail.outlook.com:587 (Outlook.com personal).
 *
 * Limitaciones vs Graph API:
 *   createDraft → no disponible (SMTP es solo envío)
 *   listSent    → no disponible (SMTP es solo envío)
 */
import net from 'net';
import tls from 'tls';

export class SmtpClient {
  constructor({ user, pass, fromEmail, host = 'smtp.office365.com', port = 587 }) {
    this.user = user;
    this.pass = pass;
    this.fromEmail = fromEmail || user;
    this.host = host;
    this.port = port;
  }

  // Misma interfaz que GraphClient
  sendEmail(to, subject, bodyHtml, cc) {
    const toList = to.split(',').map(e => e.trim()).filter(Boolean);
    const ccList = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [];
    return this._send(toList, ccList, subject, bodyHtml);
  }

  createDraft() {
    return Promise.reject(new Error(
      'Los borradores requieren Microsoft Graph API (Azure AD).\n' +
      'En modo SMTP solo se pueden enviar emails directamente.\n' +
      'Para habilitar borradores configura TENANT_ID, CLIENT_ID y CLIENT_SECRET.'
    ));
  }

  listSent() {
    return Promise.resolve(null); // null = indicador de modo SMTP
  }

  // ── SMTP STARTTLS ─────────────────────────────────────────────────────────

  _send(toList, ccList, subject, bodyHtml) {
    return new Promise((resolve, reject) => {
      let activeSock = null;
      let buf = '';
      const ready = []; // respuestas recibidas aún no consumidas
      const wait  = []; // promesas esperando una respuesta

      const dispatch = (code, text) => {
        const w = wait.shift();
        if (w) {
          code < 400 ? w.res(code) : w.rej(new Error(`SMTP ${code}: ${text}`));
        } else {
          ready.push({ code, text });
        }
      };

      const waitReply = () => new Promise((res, rej) => {
        const r = ready.shift();
        if (r) {
          r.code < 400 ? res(r.code) : rej(new Error(`SMTP ${r.code}: ${r.text}`));
        } else {
          wait.push({ res, rej });
        }
      });

      const onData = (chunk) => {
        buf += chunk.toString('binary');
        let idx;
        while ((idx = buf.indexOf('\r\n')) !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          // Ignorar líneas de continuación (ej. "250-PIPELINING")
          if (line.length >= 4 && line[3] !== '-') {
            dispatch(parseInt(line.slice(0, 3), 10), line.slice(4));
          }
        }
      };

      const write = (s) => activeSock.write(s + '\r\n', 'binary');

      const plainSock = net.createConnection(this.port, this.host);
      activeSock = plainSock;
      plainSock.setTimeout(30_000);
      plainSock.on('data', onData);
      plainSock.on('error', reject);
      plainSock.on('timeout', () => reject(new Error('Timeout de conexión SMTP (30s). Verifica host y puerto.')));

      const run = async () => {
        try {
          await waitReply(); // 220 — saludo del servidor

          write('EHLO mcp-client');
          await waitReply(); // 250

          write('STARTTLS');
          await waitReply(); // 220 — listo para negociar TLS

          // ── Upgrade a TLS ────────────────────────────────────────────────
          plainSock.removeListener('data', onData);
          buf = ''; // descartar buffer pre-TLS

          const tlsSock = await new Promise((res, rej) => {
            const s = tls.connect({ socket: plainSock, servername: this.host });
            s.once('secureConnect', () => res(s));
            s.once('error', rej);
          });
          activeSock = tlsSock;
          tlsSock.on('data', onData);
          // ─────────────────────────────────────────────────────────────────

          write('EHLO mcp-client');
          await waitReply(); // 250 — capacidades post-TLS

          // AUTH PLAIN: base64 de "\0usuario\0contraseña"
          const creds = Buffer.from(`\0${this.user}\0${this.pass}`).toString('base64');
          write(`AUTH PLAIN ${creds}`);
          await waitReply(); // 235 — autenticado

          write(`MAIL FROM:<${this.fromEmail}>`);
          await waitReply(); // 250

          for (const r of [...toList, ...ccList]) {
            write(`RCPT TO:<${r}>`);
            await waitReply(); // 250
          }

          write('DATA');
          await waitReply(); // 354 — espera el cuerpo del mensaje

          // Enviar mensaje y terminar con \r\n.\r\n
          activeSock.write(this._buildMsg(toList, ccList, subject, bodyHtml) + '\r\n', 'binary');
          await waitReply(); // 250 — aceptado

          write('QUIT');
          activeSock.destroy();
          resolve();
        } catch (err) {
          try { activeSock.destroy(); } catch (_) {}
          // Mejorar mensajes de error comunes
          if (err.message.includes('535') || err.message.includes('534')) {
            reject(new Error(
              'Autenticación fallida (SMTP 535).\n' +
              '• Verifica que SMTP_USER y SMTP_PASS sean correctos.\n' +
              '• Si tienes MFA activo, genera una contraseña de aplicación en: https://account.microsoft.com/security\n' +
              '• Si es cuenta corporativa, pide a IT que habilite "SMTP AUTH" para tu cuenta en el centro de administración de M365.'
            ));
          } else if (err.message.includes('connection refused') || err.message.includes('ECONNREFUSED')) {
            reject(new Error(`No se pudo conectar a ${this.host}:${this.port}. Verifica SMTP_HOST y SMTP_PORT.`));
          } else {
            reject(err);
          }
        }
      };

      run();
    });
  }

  _buildMsg(toList, ccList, subject, bodyHtml) {
    // Body en base64 para soportar HTML con UTF-8 sin problemas de dot-stuffing
    const bodyB64 = Buffer.from(bodyHtml, 'utf8').toString('base64');
    const bodyLines = bodyB64.match(/.{1,76}/g) ?? [];

    // Asunto en RFC 2047 para soportar tildes, ñ, etc.
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;

    return [
      `From: ${this.fromEmail}`,
      `To: ${toList.join(', ')}`,
      ...(ccList.length ? [`Cc: ${ccList.join(', ')}`] : []),
      `Subject: ${subjectEncoded}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...bodyLines,
      ``,
      `.`,              // terminador DATA de SMTP
    ].join('\r\n');
  }
}
