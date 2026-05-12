/**
 * Planificador de emails basado en archivo JSON.
 * Revisa la cola cada 30 segundos y envía los emails cuando llega su hora.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = path.join(__dirname, '..', 'queue.json');

export class Scheduler {
  constructor(graph) {
    this.graph = graph;
    this._interval = null;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  _load() {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    } catch {
      return [];
    }
  }

  _save(jobs) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(jobs, null, 2));
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  async schedule(to, subject, bodyHtml, sendAt, cc) {
    const sendDate = new Date(sendAt);
    if (isNaN(sendDate.getTime())) throw new Error(`Fecha inválida: "${sendAt}". Usa formato ISO 8601, ej: 2026-05-15T09:00:00`);
    if (sendDate <= new Date()) throw new Error('La fecha de envío debe ser en el futuro.');

    const jobs = this._load();
    const job = {
      id: randomBytes(3).toString('hex'),   // 6 chars, ej: "a3f9c1"
      to,
      subject,
      body_html: bodyHtml,
      cc: cc || null,
      send_at: sendDate.toISOString(),
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    jobs.push(job);
    this._save(jobs);
    return job;
  }

  listPending() {
    return this._load().filter(j => j.status === 'pending');
  }

  listAll() {
    return this._load();
  }

  cancel(jobId) {
    const jobs = this._load();
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.status !== 'pending') return false;
    job.status = 'cancelled';
    job.cancelled_at = new Date().toISOString();
    this._save(jobs);
    return true;
  }

  // ── BACKGROUND RUNNER ─────────────────────────────────────────────────────

  start() {
    this._check();                                  // chequeo inmediato al arrancar
    this._interval = setInterval(() => this._check(), 30_000);
    process.stderr.write('[email-mcp] Planificador iniciado (chequeo cada 30s)\n');
  }

  async _check() {
    const jobs = this._load();
    const now = new Date();
    let changed = false;

    for (const job of jobs) {
      if (job.status !== 'pending') continue;
      if (new Date(job.send_at) <= now) {
        try {
          await this.graph.sendEmail(job.to, job.subject, job.body_html, job.cc);
          job.status = 'sent';
          job.sent_at = new Date().toISOString();
          process.stderr.write(`[email-mcp] ✅ Enviado: ${job.id} → ${job.to}\n`);
        } catch (err) {
          job.status = 'error';
          job.error = err.message;
          process.stderr.write(`[email-mcp] ❌ Error job ${job.id}: ${err.message}\n`);
        }
        changed = true;
      }
    }

    if (changed) this._save(jobs);
  }
}
