/* ===========================================================
   MAF · Vista 8 · Agente IA
   Puerto directo de legacy-static/js/views/agent.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

const MENSAJE_INICIAL = 'Hola, soy el asistente de MAF. Puedo ayudarte con tu cuota, tus medios de pago o el estado de tu cotización. ¿En qué te ayudo?';

const REGLAS = [
  { claves: ['tasa', 'cae', 'interes', 'interés', 'porcentaje'], guardrail: 'g1',
    texto: 'La tasa depende de la evaluación de cada cliente, así que no puedo confirmártela por este canal. Te dejo con un ejecutivo comercial para que te entregue una propuesta formal con las condiciones exactas.',
    accion: 'Deriva a Comercial' },
  { claves: ['repactar', 'repactación', 'convenio', 'renegociar', 'pagar la mitad', 'cuotas atrasadas', 'acuerdo'], guardrail: 'g2',
    texto: 'Los acuerdos de pago los revisa un ejecutivo de Cobranza caso a caso. Puedo dejarte agendado el contacto hoy mismo. ¿Te parece?',
    accion: 'Deriva a Cobranza' },
  { claves: ['sernac', 'reclamo', 'demanda', 'abogado', 'denuncia'], guardrail: 'g3',
    texto: 'Entiendo, y lamento la situación. Voy a escalar tu caso a un supervisor ahora mismo para que lo revise con prioridad y te contacte.',
    accion: 'Escala a supervisor', tono: 'danger' },
  { claves: ['tarjeta', 'clave', 'contraseña', 'cvv', 'número de cuenta mío'], guardrail: 'g4',
    texto: 'Por seguridad no puedo pedirte ni recibir datos de tarjetas o claves por este medio. Los pagos se hacen solo en el portal MAF o en sucursal.',
    accion: 'Bloquea el dato sensible', tono: 'danger' },
  { claves: ['no puedo pagar', 'me quedé sin trabajo', 'sin pega', 'no tengo plata', 'cesante'], guardrail: 'g5',
    texto: 'Gracias por contarme. Casos como el tuyo los ve un ejecutivo para buscar una salida que te acomode. Te derivo ahora y te contactan dentro del día.',
    accion: 'Deriva por trato responsable' },
  { claves: ['cuanto debo', 'cuánto debo', 'saldo', 'mi cuota', 'cuota', 'vencimiento', 'cuando vence', 'cuándo vence'], guardrail: 'g6',
    texto: 'Tu cuota N° 18 es de $389.000 y vence el 22 de septiembre. El saldo insoluto de tu contrato es de $11.670.000. ¿Necesitas los medios de pago?',
    accion: 'Dato transaccional permitido', tono: 'ok' },
  { claves: ['pagar', 'transferencia', 'donde pago', 'dónde pago', 'medios de pago', 'cuenta'], guardrail: 'g6',
    texto: 'Puedes pagar en el portal MAF con tu RUT, en cualquier sucursal o por transferencia a MAF Chile S.A., RUT 96.123.456-7, cuenta corriente Banco de Chile 000-12345-67, pagos@maf.cl. Indica tu RUT en el mensaje.',
    accion: 'Dato transaccional permitido', tono: 'ok' },
  { claves: ['promoción', 'promocion', 'descuento', 'oferta', 'stock', 'disponible'], guardrail: 'g7',
    texto: 'No tengo información de promociones vigentes ni de disponibilidad. Un ejecutivo comercial puede confirmarte qué hay hoy. ¿Quieres que te contacte?',
    accion: 'Evita publicidad engañosa' },
  { claves: ['cotización', 'cotizacion', 'coticé', 'cotice', 'auto nuevo', 'comprar'], guardrail: null,
    texto: 'Veo una cotización tuya de un Corolla Cross por $26.990.000, del 19 de julio, en estado preaprobado. ¿Quieres retomarla con un ejecutivo?',
    accion: 'Consulta dentro del alcance', tono: 'ok' }
];

const SUGERENCIAS = [
  '¿Cuánto es mi cuota?',
  '¿Con qué tasa me lo dejan?',
  '¿Puedo repactar la deuda?',
  'Me quedé sin trabajo',
  'Voy a reclamar al Sernac',
  '¿Dónde pago?'
];

@Component({
  selector: 'app-agent',
  standalone: true,
  template: '<div (click)="onClick($event)" (change)="onChange($event)" (keydown)="onKeydown($event)" [innerHTML]="html"></div>'
})
export class AgentComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);

  html: SafeHtml = '';
  private log: any[] = [{ de: 'bot', texto: MENSAJE_INICIAL }];
  private pensando = false;
  private ag = this.d.agente;

  ngOnInit() {
    var ui = this.ui;
    this.chrome.set('Agente IA', 'Comportamiento, alcance y límites del asistente automático',
      ui.badge('Activo', 'ok') +
      '<button type="button" class="btn btn--sm btn--primary" data-global="guardar-agente">' +
      ui.icon('check', 14) + 'Guardar cambios</button>',
      (a) => {
        if (a === 'guardar-agente') {
          ui.toast('Configuración guardada', 'Los cambios aplican a las conversaciones que se inicien desde ahora.', 'ok');
        }
      });
    this.repintar();
  }

  private responder(txt: string): any {
    var t = txt.toLowerCase();
    for (var i = 0; i < REGLAS.length; i++) {
      for (var j = 0; j < REGLAS[i].claves.length; j++) {
        if (t.indexOf(REGLAS[i].claves[j]) !== -1) return REGLAS[i];
      }
    }
    return { texto: 'Puedo ayudarte con el monto y la fecha de tu cuota, los medios de pago o el estado de tu cotización. Si necesitas otra cosa, te derivo con un ejecutivo.',
             accion: 'Respuesta dentro del alcance', guardrail: null };
  }

  private comportamiento(): string {
    var ag = this.ag;
    return '<section class="card">' +
      '<div class="card__head"><h2>Comportamiento</h2>' +
        '<p>Define cómo habla el agente en todas las conversaciones.</p></div>' +
      '<div class="card__body">' +
        '<div class="row gap-4 wrap" style="align-items:flex-start">' +
          '<div class="field grow" style="min-width:200px">' +
            '<label class="field__label" for="agTono">Tono</label>' +
            '<select class="select" id="agTono">' +
              '<option value="cercano_formal" selected>Cercano pero formal</option>' +
              '<option value="formal">Formal y sobrio</option>' +
              '<option value="cercano">Cercano y conversacional</option>' +
            '</select>' +
            '<p class="field__hint">Recomendado para cobranza: cercano pero formal.</p>' +
          '</div>' +
          '<div class="field grow" style="min-width:180px">' +
            '<label class="field__label" for="agTrato">Tratamiento</label>' +
            '<select class="select" id="agTrato">' +
              '<option value="tu" selected>Tuteo</option>' +
              '<option value="usted">Usted</option>' +
            '</select>' +
          '</div>' +
          '<div class="field grow" style="min-width:180px">' +
            '<label class="field__label" for="agLargo">Largo de respuesta</label>' +
            '<select class="select" id="agLargo">' +
              '<option value="breve" selected>Breve · 2 a 3 líneas</option>' +
              '<option value="medio">Medio · hasta 5 líneas</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Alcance</h3>' +
        '<p class="small dim" style="margin-bottom:var(--sp-2)">Qué puede resolver el agente sin intervención humana.</p>' +
        ag.alcance.map((a: any) => {
          return '<label class="check"><input type="checkbox" data-alcance="' + a.id + '"' + (a.on ? ' checked' : '') + '>' +
            '<span class="check__txt">' + this.ui.esc(a.label) + '</span></label>';
        }).join('') +

        '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Horario de atención</h3>' +
        '<div class="row gap-3 wrap">' +
          '<label class="switch"><input type="checkbox" checked><span class="switch__track"></span>' +
            '<span class="small">Responde 24/7, deriva a humano solo en horario hábil</span></label>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  private conocimiento(): string {
    var ui = this.ui, ag = this.ag;
    return '<section class="card">' +
      '<div class="card__head"><div class="grow"><h2>Base de conocimiento</h2>' +
        '<p>Fuentes que el agente puede citar. No responde nada que no esté acá.</p></div>' +
        '<button type="button" class="btn btn--sm" data-subir>' + ui.icon('plus', 14) + 'Agregar fuente</button></div>' +
      '<div class="card__body card__body--flush">' +
        ui.tablaWrap('<table class="data" style="min-width:560px">' +
          '<caption class="sr-only">Fuentes de la base de conocimiento</caption>' +
          '<thead><tr><th scope="col">Fuente</th><th scope="col">Tipo</th>' +
          '<th scope="col" class="num">Fragmentos</th><th scope="col">Actualizada</th><th scope="col">Estado</th></tr></thead><tbody>' +
          ag.conocimiento.map(function (k: any) {
            return '<tr><td class="cell-main">' + ui.esc(k.nombre) + '</td>' +
              '<td class="small muted">' + ui.esc(k.tipo) + '</td>' +
              '<td class="num">' + (k.fragmentos ? ui.fmtInt(k.fragmentos) : '<span class="dim">—</span>') + '</td>' +
              '<td class="small">' + ui.fmtFecha(k.actualizado) + '</td>' +
              '<td>' + (k.estado === 'indexado'
                ? ui.badge('Indexada', 'ok')
                : '<span class="row gap-2"><span class="spinner"></span><span class="small muted">Procesando…</span></span>') + '</td></tr>';
          }).join('') + '</tbody></table>') +
      '</div>' +
    '</section>';
  }

  private guardrails(): string {
    var ui = this.ui, ag = this.ag;
    var ICO: any = { prohibir: 'ban', escalar: 'handoff', permitir: 'check' };
    return '<section class="card">' +
      '<div class="card__head"><div class="grow"><h2>Guardrails</h2>' +
        '<p>Reglas duras. El agente las cumple aunque el cliente insista.</p></div>' +
        '<button type="button" class="btn btn--sm" data-guardrail>' + ui.icon('plus', 14) + 'Agregar regla</button></div>' +
      '<div class="card__body">' +
        '<div class="stack gap-2">' +
          ag.guardrails.map(function (g: any) {
            return '<div class="guardrail' + (g.tipo === 'permitir' ? ' guardrail--allow' : '') + '">' +
              '<span class="guardrail__icon">' + ui.icon(ICO[g.tipo], 13) + '</span>' +
              '<span class="grow"><span class="strong small">' + ui.esc(g.texto) + '</span>' +
                '<br><span class="small dim">' + ui.esc(g.motivo) + '</span></span>' +
              '<span class="nowrap">' + ui.badge(
                  g.tipo === 'prohibir' ? 'Prohibido' : g.tipo === 'escalar' ? 'Escala' : 'Permitido',
                  g.tipo === 'prohibir' ? 'danger' : g.tipo === 'escalar' ? 'warn' : 'ok') + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</section>';
  }

  private metricas(): string {
    var ui = this.ui, m = this.ag.metricas;
    return '<section class="card">' +
      '<div class="card__head"><h2>Desempeño del agente</h2><p>Últimos 30 días</p></div>' +
      '<div class="card__body">' +
        '<ul class="metric-list">' +
          '<li>Resueltas sin humano<span class="val">' + ui.fmtPct(m.resueltasSinHumano) + '</span></li>' +
          '<li>Derivaciones a ejecutivo<span class="val">' + ui.fmtInt(m.derivaciones) + '</span></li>' +
          '<li>Tiempo medio de respuesta<span class="val">' + m.tiempoRespuesta + '</span></li>' +
          '<li>Satisfacción declarada<span class="val">' + String(m.satisfaccion).replace('.', ',') + ' / 5</span></li>' +
        '</ul>' +
        '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('info') +
          '<span class="small">El 38,8% restante se deriva. La causa más frecuente es la consulta de tasa, que está prohibida por guardrail.</span></div>' +
      '</div>' +
    '</section>';
  }

  private burbujasSim(): string {
    var ui = this.ui, d = this.d;
    return this.log.map(function (m: any) {
      if (m.de === 'user') {
        return '<div class="bubble bubble--out">' + ui.nl2br(m.texto) +
          '<div class="bubble__meta">' + ui.fmtHora(d.HOY) + ui.icon('checks', 14) + '</div></div>';
      }
      return '<div class="bubble bubble--in">' +
        '<div class="bubble__author bubble__author--bot">Asistente MAF</div>' +
        '<div>' + ui.nl2br(m.texto) + '</div>' +
        (m.accion
          ? '<div class="bubble__footer row gap-2" style="margin-top:var(--sp-2)">' +
            ui.badge(m.accion, m.tono || 'warn', true) +
            (m.guardrail ? '<span class="small dim">' + m.guardrail.toUpperCase() + '</span>' : '') + '</div>'
          : '') +
        '<div class="bubble__meta">' + ui.fmtHora(d.HOY) + '</div></div>';
    }).join('') +
    (this.pensando ? '<div class="bubble bubble--in"><span class="typing"><span></span><span></span><span></span></span></div>' : '');
  }

  private simulador(): string {
    var ui = this.ui;
    return '<section class="card">' +
      '<div class="card__head"><div class="grow"><h2>Simulador de conversación</h2>' +
        '<p>Prueba cómo responde el agente con la configuración actual.</p></div>' +
        '<button type="button" class="btn btn--sm" data-reiniciar>' + ui.icon('refresh', 14) + 'Reiniciar</button></div>' +
      '<div class="card__body">' +
        '<div class="sim">' +
          '<div class="sim__log" id="simLog" aria-live="polite">' + this.burbujasSim() + '</div>' +
          '<div class="sim__foot">' +
            '<div class="suggest-chips">' +
              SUGERENCIAS.map(function (s) {
                return '<button type="button" data-sug="' + ui.esc(s) + '">' + ui.esc(s) + '</button>';
              }).join('') +
            '</div>' +
            '<div class="composer__row">' +
              '<label class="sr-only" for="simTxt">Mensaje de prueba</label>' +
              '<input class="input grow" id="simTxt" type="text" placeholder="Escribe como si fueras el cliente…">' +
              '<button type="button" class="btn btn--primary" data-sim-enviar>' + ui.icon('send', 16) + 'Probar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="small dim" style="margin-top:var(--sp-3)">Las respuestas del simulador son fijas y sirven para mostrar cómo actúan los guardrails. No hay un modelo detrás en esta maqueta.</p>' +
      '</div>' +
    '</section>';
  }

  private render(): string {
    return '<div class="grid grid--main-aside">' +
      '<div class="stack gap-4">' + this.comportamiento() + this.guardrails() + this.conocimiento() + '</div>' +
      '<div class="stack gap-4">' + this.metricas() + '</div>' +
    '</div>' +
    '<div style="margin-top:var(--sp-4)">' + this.simulador() + '</div>';
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }

  private refrescarLog() {
    var l = this.elRef.nativeElement.querySelector('#simLog');
    if (!l) return;
    l.innerHTML = this.burbujasSim();
    l.scrollTop = l.scrollHeight;
  }

  private mandar(txt: string) {
    if (!txt.trim() || this.pensando) return;
    this.log.push({ de: 'user', texto: txt.trim() });
    this.pensando = true;
    this.refrescarLog();

    setTimeout(() => {
      var r = this.responder(txt);
      this.pensando = false;
      this.log.push({ de: 'bot', texto: r.texto, accion: r.accion, guardrail: r.guardrail, tono: r.tono });
      this.refrescarLog();
    }, 700);
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var ui = this.ui;

    var sug = target.closest('[data-sug]');
    if (sug) { this.mandar(sug.getAttribute('data-sug')!); return; }

    if (target.closest('[data-sim-enviar]')) {
      var i = this.elRef.nativeElement.querySelector('#simTxt');
      this.mandar(i.value); i.value = ''; i.focus();
      return;
    }
    if (target.closest('[data-reiniciar]')) {
      this.log = [{ de: 'bot', texto: MENSAJE_INICIAL }];
      this.refrescarLog();
      return;
    }
    if (target.closest('[data-guardrail]')) {
      ui.abrirModal({
        titulo: 'Agregar guardrail',
        sub: 'Las reglas se aplican sobre toda conversación, sin excepción',
        cuerpo:
          '<div class="field"><label class="field__label" for="grTipo">Tipo de regla</label>' +
            '<select class="select" id="grTipo">' +
              '<option value="prohibir">Prohibir · el agente nunca lo hace</option>' +
              '<option value="escalar">Escalar · deriva a un humano</option>' +
              '<option value="permitir">Permitir · habilita algo puntual</option>' +
            '</select></div>' +
          '<div class="field"><label class="field__label" for="grTexto">Regla</label>' +
            '<textarea class="textarea" id="grTexto" rows="3" placeholder="Ej: No confirma fechas de entrega de vehículos."></textarea></div>' +
          '<div class="field"><label class="field__label" for="grMotivo">Motivo <span class="opt">(queda en auditoría)</span></label>' +
            '<input class="input" id="grMotivo" type="text" placeholder="Ej: La fecha la define el concesionario."></div>',
        pie: '<button type="button" class="btn" data-cerrar>Cancelar</button>' +
             '<button type="button" class="btn btn--primary" data-gr-guardar>Agregar regla</button>',
        alMontar: function (modal: HTMLElement) {
          modal.querySelector('[data-gr-guardar]')!.addEventListener('click', function () {
            ui.cerrarModal();
            ui.toast('Guardrail agregado', 'Se aplica a las conversaciones nuevas de inmediato.', 'ok');
          });
        }
      });
      return;
    }
    if (target.closest('[data-subir]')) {
      ui.toast('Agregar fuente', 'Acepta PDF, Word, planillas y URLs. La indexación tarda unos minutos.', 'ok');
    }
  }

  onKeydown(e: KeyboardEvent) {
    var t = e.target as HTMLInputElement;
    if (t.id === 'simTxt' && e.key === 'Enter') {
      e.preventDefault();
      this.mandar(t.value);
      t.value = '';
    }
  }

  onChange(e: Event) {
    var t = e.target as HTMLElement;
    if (t.hasAttribute('data-alcance')) {
      var id = t.getAttribute('data-alcance');
      this.ag.alcance.forEach(function (a: any) { if (a.id === id) a.on = (t as HTMLInputElement).checked; });
    }
  }
}
