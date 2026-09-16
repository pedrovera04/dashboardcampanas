// Función serverless de Vercel: envío real de un mensaje de texto de prueba
// vía UltraMsg. Se usa solo desde el paso 4 del asistente de "Crear campaña"
// (número de prueba escrito a mano) — nunca para la audiencia real, que sigue
// siendo simulada en esta maqueta. Se usa UltraMsg y no Kapso/Meta Cloud API
// porque un número de prueba cualquiera no tiene una ventana de 24 h abierta
// ni una plantilla aprobada.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Usa POST' } });
    return;
  }

  const instance = process.env.ULTRAMSG_INSTANCE;
  const token = process.env.ULTRAMSG_TOKEN;
  if (!instance || !token) {
    res.status(500).json({
      error: {
        message: 'Falta ULTRAMSG_INSTANCE o ULTRAMSG_TOKEN en este proyecto de Vercel (Settings → Environment Variables).'
      }
    });
    return;
  }

  const telefono = String(req.body?.telefono || '').replace(/\D/g, '');
  const texto = String(req.body?.texto || '').trim();
  if (!telefono) {
    res.status(400).json({ error: { message: 'Falta el teléfono de prueba' } });
    return;
  }
  if (!texto) {
    res.status(400).json({ error: { message: 'Falta el texto del mensaje' } });
    return;
  }

  try {
    const r = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, to: telefono, body: texto })
    });
    const datos = await r.json().catch(() => null);
    res.status(r.status).json(datos ?? { error: { message: 'UltraMsg respondió ' + r.status + ' sin cuerpo JSON' } });
  } catch (e) {
    res.status(502).json({ error: { message: 'No se pudo contactar a UltraMsg: ' + e.message } });
  }
};
