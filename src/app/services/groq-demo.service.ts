/* ===========================================================
   MAF · Chat simulado con IA real (demo)
   Llama a /api/groq (proxy local, ver server/groq-proxy.mjs) para
   demostrar cómo respondería el asistente automático a un cliente
   real. Restringido a los datos que ya existen en la maqueta: no
   inventa cifras ni condiciones de crédito.
   =========================================================== */
import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';

@Injectable({ providedIn: 'root' })
export class GroqDemoService {
  private data = inject(DataService);
  private endpoint = '/api/groq';
  private modelo = 'openai/gpt-oss-120b';

  private construirSistema(convId: string): string {
    const d = this.data.d;
    const conv = d.conversaciones.find((c: any) => c.id === convId);
    const nombre = conv.contactoRef.nombre;
    const primerNombre = nombre.split(' ')[0];
    const datos = conv.contexto.datos;
    const fichaTxt = Object.keys(datos).map((k) => `${k}: ${datos[k]}`).join('\n');

    return `Eres el asistente de WhatsApp de ${d.cuenta.nombreMostrado}, empresa de crédito automotriz en Chile. Hoy hablas con ${primerNombre} (${nombre}), cliente vigente. Esta es una DEMOSTRACIÓN: quien te escribe está simulando ser el cliente, para mostrar cómo respondería el asistente real.

Reglas:
- Solo puedes dar como confirmado un dato (monto, fecha, estado del crédito, contrato) si está en la ficha o en los datos generales de abajo. Está prohibido inventar cifras, tasas, aprobaciones o condiciones que no estén ahí.
- Nunca lo dejes sin salida: si no puedes confirmar algo puntual, no te limites a decir que no sabes — sé cálido y resolutivo, y ofrece de inmediato un paso concreto (derivar a un ejecutivo, revisar su caso, agendar una llamada). Que sienta que la empresa quiere ayudarlo, aunque tú no puedas resolverlo todo por WhatsApp.
- Usa su nombre y su contexto (vehículo, cuota, historial de pago) cuando sea relevante.
- Responde breve, cálido y en español de Chile, como un mensaje de WhatsApp.

--- FICHA DEL CLIENTE (${conv.contexto.titulo}) ---
${fichaTxt}
Teléfono: ${conv.contactoRef.telefono}
--- FIN FICHA ---

--- DATOS GENERALES DE ${d.cuenta.nombreMostrado} ---
Medios de pago: portal ${d.cuenta.nombreMostrado}, en sucursal, o por transferencia a MAF Chile S.A., RUT 96.123.456-7, cuenta corriente Banco de Chile N° 000-12345-67, pagos@maf.cl (el cliente debe indicar su RUT en el mensaje de la transferencia).
--- FIN DATOS GENERALES ---`;
  }

  async preguntar(convId: string, historial: { role: string; content: string }[]): Promise<string> {
    const r = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelo,
        reasoning_effort: 'low',
        temperature: 0.4,
        max_tokens: 500,
        messages: [{ role: 'system', content: this.construirSistema(convId) }, ...historial]
      })
    });

    const json = await r.json().catch(() => null);
    if (!r.ok) throw new Error(json?.error?.message || `Groq respondió ${r.status}`);
    const texto = json?.choices?.[0]?.message?.content?.trim();
    if (!texto) throw new Error('Groq no devolvió una respuesta (puede haberse quedado sin tokens "pensando").');
    return texto;
  }
}
