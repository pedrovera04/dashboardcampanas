/* ===========================================================
   MAF · Chasis de página
   Reemplaza al "vistaActual" global de legacy-static/js/app.js:
   cada vista registra aquí su título, subtítulo, las acciones de
   la topbar y el manejador de esas acciones.
   =========================================================== */
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PageChromeService {
  readonly titulo = signal('');
  readonly subtitulo = signal('');
  readonly accionesHtml = signal('');

  private onAccionHandler: ((accion: string) => void) | null = null;

  set(titulo: string, subtitulo: string, accionesHtml: string, onAccion?: (accion: string) => void) {
    this.titulo.set(titulo);
    this.subtitulo.set(subtitulo || '');
    this.accionesHtml.set(accionesHtml || '');
    this.onAccionHandler = onAccion || null;
    document.title = 'MAF · ' + titulo;
  }

  onAccion(accion: string) {
    if (this.onAccionHandler) this.onAccionHandler(accion);
  }
}
