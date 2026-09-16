/* ===========================================================
   MAF · Proxy local de APIs externas
   Intermediario entre el navegador y los servicios reales que usa
   la maqueta (Groq para el chat simulado, UltraMsg para el envío
   real de prueba en el asistente de campañas). Las claves viven
   solo en el .env de este servidor: el navegador nunca las recibe.

   Uso: node server/local-api-proxy.mjs
   (o `npm start`, que lo levanta junto con `ng serve` vía
   `proxy.conf.json`, que reenvía /api/* hacia este puerto).
   =========================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.LOCAL_API_PROXY_PORT || 4310;

/* Carga .env sin dependencias externas */
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => resolve(body));
  });
}

function responderJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function manejarGroq(req, res) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return responderJSON(res, 500, { error: { message: 'Falta GROQ_API_KEY en maf-whatsapp/.env' } });

  const body = await leerCuerpo(req);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body
    });
    const texto = await r.text();
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(texto);
  } catch (e) {
    responderJSON(res, 502, { error: { message: 'No se pudo contactar a Groq: ' + e.message } });
  }
}

/* Envío real de un mensaje de texto de WhatsApp vía UltraMsg. Se usa solo
   para el número de prueba que se escribe a mano en el paso 4 del asistente
   de campañas — nunca para la audiencia real, que sigue siendo simulada en
   esta maqueta. Se eligió UltraMsg (en vez de Kapso/Meta Cloud API) porque
   no exige una ventana de 24 h abierta ni una plantilla aprobada: para un
   número de prueba de verdad, cualquier texto libre llega directo. */
async function manejarUltramsgSend(req, res) {
  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instance || !token || token.startsWith('PEGA_')) {
    return responderJSON(res, 500, { error: { message: 'Falta ULTRAMSG_INSTANCE o ULTRAMSG_TOKEN (real) en maf-whatsapp/.env' } });
  }

  const body = await leerCuerpo(req);
  let datos;
  try { datos = JSON.parse(body); } catch (e) { return responderJSON(res, 400, { error: { message: 'JSON inválido' } }); }

  const telefono = String(datos.telefono || '').replace(/\D/g, '');
  const texto = String(datos.texto || '').trim();
  if (!telefono) return responderJSON(res, 400, { error: { message: 'Falta el teléfono de prueba' } });
  if (!texto) return responderJSON(res, 400, { error: { message: 'Falta el texto del mensaje' } });

  try {
    const r = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, to: telefono, body: texto })
    });
    const json = await r.json().catch(() => null);
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(json ?? { error: { message: 'UltraMsg respondió ' + r.status + ' sin cuerpo JSON' } }));
  } catch (e) {
    responderJSON(res, 502, { error: { message: 'No se pudo contactar a UltraMsg: ' + e.message } });
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') return responderJSON(res, 404, { error: { message: 'Ruta no encontrada' } });
  if (req.url === '/api/groq') return manejarGroq(req, res);
  if (req.url === '/api/whatsapp-send') return manejarUltramsgSend(req, res);
  responderJSON(res, 404, { error: { message: 'Ruta no encontrada' } });
});

server.listen(PORT, () => console.log('Proxy local de APIs escuchando en http://localhost:' + PORT));
