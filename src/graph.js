/**
 * Microsoft Graph API client — Client Credentials Flow (daemon/service)
 * No requiere navegador. Usa app registration con permisos de aplicación.
 */
import https from 'https';
import querystring from 'querystring';

export class GraphClient {
  constructor({ tenantId, clientId, clientSecret, fromEmail }) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fromEmail = fromEmail;
    this._token = null;
    this._tokenExpiry = 0;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────

  async _getToken() {
    if (!this.tenantId || !this.clientId || !this.clientSecret || !this.fromEmail) {
      throw new Error('Faltan credenciales. Configura TENANT_ID, CLIENT_ID, CLIENT_SECRET y FROM_EMAIL en el .env');
    }
    if (this._token && Date.now() < this._tokenExpiry) return this._token;

    const body = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const data = await this._request(
      'login.microsoftonline.com',
      `/${this.tenantId}/oauth2/v2.0/token`,
      'POST',
      body,
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    if (!data.access_token) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._token;
  }

  // ── SEND EMAIL ────────────────────────────────────────────────────────────

  async sendEmail(to, subject, bodyHtml, cc) {
    const token = await this._getToken();

    const toList = this._parseRecipients(to);
    const ccList = cc ? this._parseRecipients(cc) : [];

    const payload = {
      message: {
        subject,
        body: { contentType: 'HTML', content: bodyHtml },
        toRecipients: toList,
        ...(ccList.length && { ccRecipients: ccList }),
      },
      saveToSentItems: true,
    };

    await this._request(
      'graph.microsoft.com',
      `/v1.0/users/${this.fromEmail}/sendMail`,
      'POST',
      JSON.stringify(payload),
      { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    );
  }

  // ── CREATE DRAFT ──────────────────────────────────────────────────────────

  async createDraft(to, subject, bodyHtml) {
    const token = await this._getToken();

    const draft = {
      subject,
      body: { contentType: 'HTML', content: bodyHtml },
      toRecipients: this._parseRecipients(to),
    };

    const res = await this._request(
      'graph.microsoft.com',
      `/v1.0/users/${this.fromEmail}/messages`,
      'POST',
      JSON.stringify(draft),
      { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    );

    return res.id;
  }

  // ── LIST SENT ─────────────────────────────────────────────────────────────

  async listSent(limit = 10) {
    const token = await this._getToken();

    const res = await this._request(
      'graph.microsoft.com',
      `/v1.0/users/${this.fromEmail}/mailFolders/SentItems/messages?$top=${limit}&$select=subject,toRecipients,sentDateTime,isRead`,
      'GET',
      null,
      { Authorization: `Bearer ${token}` }
    );

    return res.value || [];
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  _parseRecipients(str) {
    return str.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  }

  _request(hostname, path, method, body, headers) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path,
        method,
        headers: body
          ? { ...headers, 'Content-Length': Buffer.byteLength(body) }
          : headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Graph API ${res.statusCode}: ${data}`));
            return;
          }
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve({});
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
