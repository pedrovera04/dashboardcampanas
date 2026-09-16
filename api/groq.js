// Función serverless de Vercel: intermediario entre el chat simulado (Patricio)
// y Groq. La clave vive solo en las variables de entorno del proyecto de Vercel
// (o en .env local cuando corres el proxy con `npm start`). El navegador nunca
// la recibe: solo le llega la respuesta de Groq.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Usa POST' } });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: {
        message: 'Falta la variable de entorno GROQ_API_KEY en este proyecto de Vercel (Settings → Environment Variables).'
      }
    });
    return;
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });
    const datos = await r.json();
    res.status(r.status).json(datos);
  } catch (e) {
    res.status(502).json({ error: { message: 'No se pudo contactar a Groq: ' + e.message } });
  }
};
