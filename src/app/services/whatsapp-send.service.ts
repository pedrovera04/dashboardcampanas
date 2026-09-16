/* ===========================================================
   MAF · Envío real de prueba (UltraMsg)
   Usado solo por el paso 4 del asistente de "Crear campaña": manda
   un mensaje de texto real a un número de prueba para verificar
   cómo llegaría la campaña, sin tocar nunca a la audiencia real
   (esa parte de la maqueta sigue siendo simulada). Se usa UltraMsg
   y no Kapso/Meta Cloud API porque un número de prueba cualquiera
   no tiene una ventana de 24 h abierta ni una plantilla aprobada.
   =========================================================== */
import { Injectable } from '@angular/core';

export interface ResultadoEnvioPrueba {
  ok: boolean;
  detalle: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsappSendService {
  async enviarTexto(telefono: string, texto: string): Promise<ResultadoEnvioPrueba> {
    try {
      const r = await fetch('/api/whatsapp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, texto })
      });
      const json = await r.json().catch(() => null);

      // UltraMsg responde {sent:"true", message:"ok", id:...} en éxito, o
      // {error:"..."} / {error:{...}} cuando falla.
      const huboError = json?.error || String(json?.sent).toLowerCase() === 'false';
      if (r.ok && !huboError) {
        return { ok: true, detalle: 'UltraMsg lo tomó para entrega' + (json?.id ? ' (id ' + json.id + ')' : '') + '.' };
      }

      const mensajeError = (typeof json?.error === 'string' ? json.error : json?.error?.message) || json?.message;
      return { ok: false, detalle: typeof mensajeError === 'string' ? mensajeError : ('UltraMsg respondió ' + r.status) };
    } catch (e: any) {
      return { ok: false, detalle: 'No se pudo contactar el proxy local: ' + e.message };
    }
  }
}
