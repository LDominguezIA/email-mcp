/**
 * Motor de plantillas HTML para emails.
 * Sintaxis: {{variable}} en el HTML se reemplaza con el valor correspondiente.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export const AVAILABLE_TEMPLATES = [
  'ingenieria-inversa',
  'financiero',
  'naves-industriales',
  'generico',
];

export function renderTemplate(templateName, variables = {}) {
  if (!AVAILABLE_TEMPLATES.includes(templateName)) {
    throw new Error(`Plantilla desconocida: "${templateName}". Disponibles: ${AVAILABLE_TEMPLATES.join(', ')}`);
  }

  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo de plantilla no encontrado: ${filePath}`);
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Inyecta fecha actual si no se pasa
  const defaults = {
    fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
    hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };

  const merged = { ...defaults, ...variables };

  for (const [key, value] of Object.entries(merged)) {
    const escaped = String(value ?? '');
    html = html.replaceAll(`{{${key}}}`, escaped);
  }

  // Limpia variables no reemplazadas
  html = html.replace(/\{\{[^}]+\}\}/g, '');

  return html;
}
