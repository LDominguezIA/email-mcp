/**
 * email-mcp — Servidor MCP para Microsoft 365 / Outlook
 *
 * Implementación pura con Node.js built-ins. Sin dependencias externas.
 * Protocolo: JSON-RPC 2.0 sobre stdio con Content-Length headers (MCP spec).
 *
 * Modos de autenticación (auto-detectado por variables de entorno):
 *   SMTP   — SMTP_USER + SMTP_PASS  → smtp.office365.com:587 (STARTTLS)
 *   Graph  — TENANT_ID + CLIENT_ID + CLIENT_SECRET → Microsoft Graph API
 *
 * Herramientas:
 *   email_enviar       Envía email HTML inmediatamente
 *   email_programar    Programa email para fecha/hora futura
 *   email_borrador     Guarda como borrador en Outlook (solo modo Graph)
 *   email_plantilla    Renderiza plantilla + envía o programa
 *   email_cola         Lista emails programados pendientes
 *   email_cancelar     Cancela un email programado
 *   email_enviados     Muestra últimos emails enviados (solo modo Graph)
 */
import 'node:process';
import { GraphClient } from './graph.js';
import { SmtpClient } from './smtp.js';
import { Scheduler } from './scheduler.js';
import { renderTemplate, AVAILABLE_TEMPLATES } from './templates.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── LOAD .ENV ─────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dirname, '..', '.env');
if (existsSync(envFile)) {
  readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

// ── INIT SERVICES — auto-detect SMTP vs Graph API ─────────────────────────
let graph;
let authMode;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  authMode = 'smtp';
  graph = new SmtpClient({
    user:      process.env.SMTP_USER,
    pass:      process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || process.env.SMTP_USER,
    host:      process.env.SMTP_HOST || 'smtp.office365.com',
    port:      parseInt(process.env.SMTP_PORT || '587', 10),
  });
} else {
  authMode = 'graph';
  graph = new GraphClient({
    tenantId:     process.env.TENANT_ID,
    clientId:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    fromEmail:    process.env.FROM_EMAIL,
  });
}

const scheduler = new Scheduler(graph);

// ── TOOL DEFINITIONS ───────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'email_enviar',
    description: 'Envía un email HTML inmediatamente a través de Microsoft 365 / Outlook.',
    inputSchema: {
      type: 'object',
      properties: {
        to:        { type: 'string', description: 'Destinatario(s), separados por coma' },
        subject:   { type: 'string', description: 'Asunto del correo' },
        body_html: { type: 'string', description: 'Cuerpo del email en HTML' },
        cc:        { type: 'string', description: 'CC opcional, separados por coma' },
      },
      required: ['to', 'subject', 'body_html'],
    },
  },
  {
    name: 'email_programar',
    description: 'Programa un email para enviarse automáticamente en una fecha y hora específica.',
    inputSchema: {
      type: 'object',
      properties: {
        to:        { type: 'string', description: 'Destinatario(s), separados por coma' },
        subject:   { type: 'string', description: 'Asunto del correo' },
        body_html: { type: 'string', description: 'Cuerpo del email en HTML' },
        send_at:   { type: 'string', description: 'Fecha y hora ISO 8601. Ej: "2026-05-20T09:00:00"' },
        cc:        { type: 'string', description: 'CC opcional' },
      },
      required: ['to', 'subject', 'body_html', 'send_at'],
    },
  },
  {
    name: 'email_borrador',
    description: 'Guarda el email como borrador en Outlook sin enviarlo.',
    inputSchema: {
      type: 'object',
      properties: {
        to:        { type: 'string', description: 'Destinatario(s)' },
        subject:   { type: 'string', description: 'Asunto' },
        body_html: { type: 'string', description: 'Cuerpo HTML' },
      },
      required: ['to', 'subject', 'body_html'],
    },
  },
  {
    name: 'email_plantilla',
    description: `Renderiza una plantilla HTML con datos y envía el email. Plantillas: ${AVAILABLE_TEMPLATES.join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        template:       { type: 'string', enum: AVAILABLE_TEMPLATES, description: 'Tipo de plantilla' },
        variables:      { type: 'object', description: 'Variables {{nombre}} para rellenar la plantilla' },
        to:             { type: 'string', description: 'Destinatario(s)' },
        subject:        { type: 'string', description: 'Asunto del correo' },
        cc:             { type: 'string', description: 'CC opcional' },
        programar_para: { type: 'string', description: 'ISO datetime para programar el envío (opcional)' },
        como_borrador:  { type: 'boolean', description: 'Si true, guarda como borrador en lugar de enviar' },
      },
      required: ['template', 'variables', 'to', 'subject'],
    },
  },
  {
    name: 'email_cola',
    description: 'Lista los emails programados pendientes de envío.',
    inputSchema: {
      type: 'object',
      properties: {
        mostrar_todos: { type: 'boolean', description: 'Si true, incluye enviados y cancelados' },
      },
    },
  },
  {
    name: 'email_cancelar',
    description: 'Cancela un email programado que aún no se ha enviado.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'ID del job (obtenido con email_cola)' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'email_enviados',
    description: 'Muestra los últimos emails enviados desde la cuenta de Microsoft 365.',
    inputSchema: {
      type: 'object',
      properties: {
        limite: { type: 'number', description: 'Cantidad a mostrar (por defecto 10, máx 50)' },
      },
    },
  },
];

// ── TOOL HANDLER ──────────────────────────────────────────────────────────
async function callTool(name, args = {}) {
  if (name === 'email_enviar') {
    await graph.sendEmail(args.to, args.subject, args.body_html, args.cc);
    return `✅ Email enviado correctamente a: ${args.to}\nAsunto: ${args.subject}`;
  }

  if (name === 'email_programar') {
    const job = await scheduler.schedule(args.to, args.subject, args.body_html, args.send_at, args.cc);
    return (
      `📅 Email programado con éxito.\n` +
      `ID: ${job.id} · Para: ${job.to}\n` +
      `Asunto: ${job.subject}\n` +
      `Envío: ${new Date(job.send_at).toLocaleString('es-MX')}\n\n` +
      `Usa email_cancelar con ID "${job.id}" para cancelarlo.`
    );
  }

  if (name === 'email_borrador') {
    const id = await graph.createDraft(args.to, args.subject, args.body_html);
    return `📝 Borrador guardado en Outlook.\nID: ${id}`;
  }

  if (name === 'email_plantilla') {
    const html = renderTemplate(args.template, args.variables || {});
    if (args.como_borrador) {
      const id = await graph.createDraft(args.to, args.subject, html);
      return `📝 Borrador de plantilla "${args.template}" guardado. ID: ${id}`;
    }
    if (args.programar_para) {
      const job = await scheduler.schedule(args.to, args.subject, html, args.programar_para, args.cc);
      return `📅 Reporte "${args.template}" programado. ID: ${job.id} · ${new Date(job.send_at).toLocaleString('es-MX')}`;
    }
    await graph.sendEmail(args.to, args.subject, html, args.cc);
    return `✅ Reporte "${args.template}" enviado a ${args.to}`;
  }

  if (name === 'email_cola') {
    const jobs = args.mostrar_todos ? scheduler.listAll() : scheduler.listPending();
    if (jobs.length === 0) return args.mostrar_todos ? 'No hay emails en la cola.' : 'No hay emails pendientes.';
    const icons = { pending: '⏳', sent: '✅', error: '❌', cancelled: '🚫' };
    const lines = jobs.map(j => `${icons[j.status] || '?'} [${j.id}] ${new Date(j.send_at).toLocaleString('es-MX')} → ${j.to}\n   Asunto: ${j.subject}`);
    return `Cola de emails (${jobs.length}):\n\n${lines.join('\n\n')}`;
  }

  if (name === 'email_cancelar') {
    const ok = scheduler.cancel(args.job_id);
    return ok ? `🗑️ Job "${args.job_id}" cancelado.` : `❌ No se encontró job pendiente con ID "${args.job_id}".`;
  }

  if (name === 'email_enviados') {
    const limite = Math.min(args.limite || 10, 50);
    const sent = await graph.listSent(limite);
    if (sent === null) {
      return (
        '⚠️ La consulta de enviados no está disponible en modo SMTP.\n' +
        'SMTP es un protocolo de solo-envío — no puede leer el buzón.\n\n' +
        'Para consultar enviados configura Microsoft Graph API (Azure AD):\n' +
        'TENANT_ID + CLIENT_ID + CLIENT_SECRET en el archivo .env'
      );
    }
    if (sent.length === 0) return 'No se encontraron emails enviados.';
    const lines = sent.map((m, i) => {
      const to = m.toRecipients?.map(r => r.emailAddress?.address).join(', ') || '—';
      const date = m.sentDateTime ? new Date(m.sentDateTime).toLocaleString('es-MX') : '—';
      return `${i + 1}. ${date}\n   Para: ${to}\n   Asunto: ${m.subject}`;
    });
    return `Últimos ${sent.length} enviados:\n\n${lines.join('\n\n')}`;
  }

  throw new Error(`Herramienta desconocida: ${name}`);
}

// ── MCP PROTOCOL (JSON-RPC 2.0 over stdio) ────────────────────────────────

function send(obj) {
  const body = JSON.stringify(obj);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

// Parse incoming messages (Content-Length framed)
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  while (true) {
    const clMatch = buffer.match(/Content-Length:\s*(\d+)\r\n\r\n/);
    if (!clMatch) break;
    const headerEnd = clMatch.index + clMatch[0].length;
    const len = parseInt(clMatch[1], 10);
    if (buffer.length < headerEnd + len) break;
    const body = buffer.slice(headerEnd, headerEnd + len);
    buffer = buffer.slice(headerEnd + len);
    try {
      handleMessage(JSON.parse(body));
    } catch (e) {
      process.stderr.write(`[email-mcp] Parse error: ${e.message}\n`);
    }
  }
});

async function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    respond(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'email-mcp', version: '1.0.0' },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
    return;
  }

  if (method === 'tools/list') {
    respond(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    try {
      const text = await callTool(name, args || {});
      respond(id, { content: [{ type: 'text', text }] });
    } catch (err) {
      respond(id, { content: [{ type: 'text', text: `❌ Error: ${err.message}` }], isError: true });
    }
    return;
  }

  if (method === 'ping') {
    respond(id, {});
    return;
  }

  // Notifications don't need a response
  if (id === undefined || id === null) return;

  respondError(id, -32601, `Method not found: ${method}`);
}

// ── STARTUP ───────────────────────────────────────────────────────────────
scheduler.start();
process.stderr.write(`[email-mcp] Servidor iniciado en modo ${authMode.toUpperCase()}. Esperando conexión de Claude Code...\n`);
