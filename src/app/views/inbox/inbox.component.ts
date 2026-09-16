/* ===========================================================
   MAF · Vista 7 · Bandeja de conversaciones
   Puerto directo de legacy-static/js/views/inbox.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';
import { GroqDemoService } from '../../services/groq-demo.service';

let st: any = { filtro: 'todas', convId: 'v1', pane: 'list' };

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'sin_asignar', label: 'Sin asignar' },
  { id: 'mia', label: 'Asignadas a mí' },
  { id: 'bot', label: 'Bot' },
  { id: 'resuelta', label: 'Resueltas' }
];

const CAMPOS_MONEDA = ['Cuota mensual', 'Saldo insoluto', 'Monto', 'Pie ofrecido'];

@Component({
  selector: 'app-inbox',
  standalone: true,
  template: '<div (click)="onClick($event)" (input)="onInput($event)" (keydown)="onKeydown($event)" [innerHTML]="html"></div>'
})
export class InboxComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);
  private groq = inject(GroqDemoService);

  html: SafeHtml = '';
  private demoChat: { mensajes: any[]; cargando: boolean } = { mensajes: [], cargando: false };
  private demoModal: HTMLElement | null | undefined = null;

  ngOnInit() {
    var ui = this.ui, d = this.d;
    var sin = d.conversaciones.filter((c: any) => c.estado === 'sin_asignar').length;
    this.chrome.set('Conversaciones', 'Bandeja compartida entre el agente IA y los ejecutivos',
      (sin ? '<span class="badge badge--warn">' + sin + ' sin asignar</span>' : '') +
      '<button type="button" class="btn btn--sm" data-global="exportar">' + ui.icon('download', 14) +
      '<span class="hide-sm">Exportar</span></button>');
    this.repintar();
    this.irAlFinal();
  }

  private listaFiltrada(): any[] {
    return this.d.conversaciones.filter((c: any) => st.filtro === 'todas' || c.estado === st.filtro)
      .sort((a: any, b: any) => new Date(b.ultimo).getTime() - new Date(a.ultimo).getTime());
  }

  private conv(): any { return this.d.conversaciones.filter((c: any) => c.id === st.convId)[0]; }

  private itemConv(c: any): string {
    var ui = this.ui;
    var ult = c.mensajes[c.mensajes.length - 1];
    var prev = (ult.tipo === 'handoff' || ult.tipo === 'sistema' ? '↪ ' : ult.dir === 'in' ? '' : 'Tú: ') +
      ult.texto.replace(/\n/g, ' ').slice(0, 58);

    return '<button type="button" class="conv-item" data-conv="' + c.id + '"' +
      (c.id === st.convId ? ' aria-current="true"' : '') + '>' +
      (c.noLeidos ? '<span class="unread-dot" aria-label="' + c.noLeidos + ' sin leer"></span>'
                  : '<span class="unread-dot" style="background:transparent" aria-hidden="true"></span>') +
      '<span class="avatar avatar--sm" aria-hidden="true">' + c.contactoRef.iniciales + '</span>' +
      '<span class="conv-item__txt">' +
        '<span class="conv-item__top"><strong>' + ui.esc(c.contactoRef.nombre.split(' ').slice(0, 2).join(' ')) + '</strong>' +
          '<time datetime="' + new Date(c.ultimo).toISOString() + '">' + ui.fmtRelativo(c.ultimo) + '</time></span>' +
        '<span class="conv-item__prev truncate">' + ui.esc(prev) + '</span>' +
        '<span class="conv-item__tags">' +
          (c.canal === 'bot' ? ui.badge('Bot', 'muted', true) : ui.badge(c.asignadoA ? c.asignadoA.split(' ')[0] : 'Sin asignar', c.asignadoA ? 'info' : 'warn', true)) +
          c.etiquetas.slice(0, 2).map(function (t: string) { return ui.badge(t, 'muted', true); }).join('') +
          (!c.ventana.abierta ? ui.badge('Ventana cerrada', 'warn', true) : '') +
        '</span>' +
      '</span></button>';
  }

  private panelLista(): string {
    var ui = this.ui, d = this.d;
    var ls = this.listaFiltrada();
    return '<div class="inbox__pane inbox__pane--list">' +
      '<div class="inbox__head">' +
        '<strong class="grow">Bandeja</strong>' +
        '<span class="small dim">' + ls.length + ' de ' + d.conversaciones.length + '</span>' +
      '</div>' +
      '<div class="conv-filters" role="group" aria-label="Filtrar conversaciones">' +
        FILTROS.map(function (f) {
          var n = f.id === 'todas' ? d.conversaciones.length
            : d.conversaciones.filter(function (c: any) { return c.estado === f.id; }).length;
          return '<button type="button" data-filtro="' + f.id + '" aria-pressed="' + (st.filtro === f.id) + '">' +
            f.label + (n ? ' ' + n : '') + '</button>';
        }).join('') +
      '</div>' +
      '<div class="inbox__scroll">' +
        (ls.length
          ? ls.map((c: any) => this.itemConv(c)).join('')
          : ui.estadoVacio({
              icono: 'inbox',
              titulo: 'Nada por acá',
              texto: 'No hay conversaciones con este filtro. Cambia a «Todas» para ver el resto de la bandeja.'
            })) +
      '</div>' +
    '</div>';
  }

  private ticks(estado: string): string {
    var ui = this.ui;
    if (estado === 'leido') return '<span style="color:#34b7f1">' + ui.icon('checks', 14) + '</span>';
    if (estado === 'entregado') return ui.icon('checks', 14);
    return ui.icon('check', 14);
  }

  private mensaje(m: any, anterior: any): string {
    var ui = this.ui, d = this.d;
    var sep = '';
    if (!anterior || new Date(m.t).toDateString() !== new Date(anterior.t).toDateString()) {
      var hoy = new Date(m.t).toDateString() === d.HOY.toDateString();
      sep = '<div class="day-sep">' + (hoy ? 'hoy' : ui.fmtFecha(m.t)) + '</div>';
    }

    if (m.tipo === 'handoff') {
      return sep + '<div class="sys-note sys-note--handoff">' + ui.icon('handoff', 13) +
        '<span>' + ui.esc(m.texto) + ' · ' + ui.fmtHora(m.t) + '</span></div>';
    }
    if (m.tipo === 'sistema') {
      return sep + '<div class="sys-note">' + ui.icon('check', 13) +
        '<span>' + ui.esc(m.texto) + ' · ' + ui.fmtHora(m.t) + '</span></div>';
    }

    var esSalida = m.dir === 'out';
    var autor = '';
    if (esSalida) {
      if (m.autor === 'bot') autor = '<div class="bubble__author bubble__author--bot">Agente IA</div>';
      else if (m.autor === 'Sistema') autor = '<div class="bubble__author">Plantilla · ' + ui.esc(m.nombrePlantilla) + '</div>';
      else autor = '<div class="bubble__author">' + ui.esc(m.autor) + '</div>';
    }

    return sep + '<div class="bubble bubble--' + (esSalida ? 'out' : 'in') + '">' +
      autor +
      '<div>' + ui.nl2br(m.texto) + '</div>' +
      '<div class="bubble__meta">' + ui.fmtHora(m.t) + (esSalida ? this.ticks(m.estado) : '') + '</div>' +
      '</div>';
  }

  private panelHilo(): string {
    var ui = this.ui;
    var c = this.conv();
    if (!c) return '<div class="inbox__pane inbox__pane--thread"></div>';

    var abierta = c.ventana.abierta;

    return '<div class="inbox__pane inbox__pane--thread">' +
      '<div class="inbox__head">' +
        '<button type="button" class="icon-btn inbox__back" data-pane="list" aria-label="Volver a la lista">' +
          ui.icon('chevronLeft', 18) + '</button>' +
        '<span class="avatar avatar--sm" aria-hidden="true">' + c.contactoRef.iniciales + '</span>' +
        '<span class="grow" style="min-width:0">' +
          '<strong class="truncate" style="display:block">' + ui.esc(c.contactoRef.nombre) + '</strong>' +
          '<span class="small dim mono">' + ui.esc(c.contactoRef.telefono) + '</span></span>' +
        (c.id === 'v8'
          ? '<button type="button" class="btn btn--sm btn--primary" data-demo-ia>' + ui.icon('bot', 14) + '<span class="hide-sm">Iniciar conversación</span></button>'
          : '') +
        (c.estado !== 'resuelta'
          ? '<button type="button" class="btn btn--sm" data-resolver>' + ui.icon('check', 14) + '<span class="hide-sm">Resolver</span></button>'
          : ui.badge('Resuelta', 'muted')) +
        '<button type="button" class="icon-btn inbox__back" data-pane="ctx" aria-label="Ver contexto del cliente">' +
          ui.icon('user', 18) + '</button>' +
      '</div>' +

      '<div class="window-bar window-bar--' + (abierta ? 'open' : 'closed') + '">' +
        ui.icon(abierta ? 'clock' : 'lock', 14) +
        '<span>' + (abierta
          ? 'Ventana de 24 h <strong>abierta</strong> · quedan ' + ui.fmtDuracion(c.ventana.restanteMin) + ' para responder con texto libre'
          : 'Ventana de 24 h <strong>cerrada</strong> · solo se puede reabrir con una plantilla aprobada') + '</span>' +
      '</div>' +

      '<div class="thread" id="hiloScroll">' +
        c.mensajes.map((m: any, i: number) => this.mensaje(m, c.mensajes[i - 1])).join('') +
      '</div>' +

      '<div class="composer">' +
        (abierta
          ? '<div class="composer__row">' +
              '<label class="sr-only" for="msgTxt">Escribir mensaje a ' + ui.esc(c.contactoRef.nombre) + '</label>' +
              '<textarea class="textarea grow" id="msgTxt" rows="1" placeholder="Escribe una respuesta…"></textarea>' +
              '<button type="button" class="btn btn--primary" data-enviar aria-label="Enviar mensaje">' +
                ui.icon('send', 16) + '<span class="hide-sm">Enviar</span></button>' +
            '</div>' +
            '<p class="small dim" style="margin-top:var(--sp-2)">Mientras la ventana esté abierta no hay costo adicional por mensaje.</p>'
          : '<div class="callout callout--warn">' + ui.icon('lock') +
            '<span class="grow">Pasaron más de 24 horas desde el último mensaje del cliente. Para retomar hay que enviar una plantilla aprobada, que se cobra como conversación nueva.</span>' +
            '<button type="button" class="btn btn--sm" data-reabrir>Enviar plantilla</button></div>') +
      '</div>' +
    '</div>';
  }

  private panelContexto(): string {
    var ui = this.ui;
    var c = this.conv();
    if (!c) return '';
    var datos = c.contexto.datos;

    return '<div class="inbox__pane inbox__pane--ctx">' +
      '<div class="inbox__head">' +
        '<button type="button" class="icon-btn inbox__back" data-pane="thread" aria-label="Volver a la conversación">' +
          ui.icon('chevronLeft', 18) + '</button>' +
        '<strong class="grow">Contexto</strong>' +
      '</div>' +
      '<div class="inbox__scroll">' +

        '<div class="ctx-section">' +
          '<div class="row gap-3" style="margin-bottom:var(--sp-3)">' +
            '<span class="avatar" aria-hidden="true">' + c.contactoRef.iniciales + '</span>' +
            '<span style="min-width:0">' +
              '<strong style="display:block">' + ui.esc(c.contactoRef.nombre) + '</strong>' +
              '<span class="small dim mono">' + ui.esc(c.contactoRef.rut) + '</span></span>' +
          '</div>' +
          '<dl class="dl">' +
            '<dt>Teléfono</dt><dd class="mono">' + ui.esc(c.contactoRef.telefono) + '</dd>' +
            '<dt>Tipo</dt><dd>' + (c.tipo === 'cliente' ? 'Cliente vigente' : 'Prospecto') + '</dd>' +
            '<dt>Cola</dt><dd>' + ui.esc(c.cola) + '</dd>' +
            '<dt>Atiende</dt><dd>' + (c.canal === 'bot' ? 'Agente IA' : (c.asignadoA || 'Sin asignar')) + '</dd>' +
          '</dl>' +
        '</div>' +

        (c.contexto.alerta
          ? '<div class="ctx-section"><div class="callout callout--warn">' + ui.icon('alert') +
            '<span class="small">' + ui.esc(c.contexto.alerta) + '</span></div></div>'
          : '') +

        '<div class="ctx-section">' +
          '<h3>' + ui.esc(c.contexto.titulo) + '</h3>' +
          '<dl class="dl">' +
            Object.keys(datos).map(function (k) {
              var v = datos[k];
              var esMoneda = CAMPOS_MONEDA.indexOf(k) !== -1 && typeof v === 'number';
              var txt = esMoneda ? ui.fmtCLP(v) : ui.esc(v);
              var resalte = (k === 'Días de mora' && v > 0) ? ' style="color:var(--danger);font-weight:600"' : '';
              return '<dt>' + ui.esc(k) + '</dt><dd' + resalte + '>' + txt + '</dd>';
            }).join('') +
          '</dl>' +
        '</div>' +

        '<div class="ctx-section">' +
          '<h3>Etiquetas</h3>' +
          '<div class="row wrap gap-2">' +
            c.etiquetas.map(function (t: string) { return '<span class="chip">' + ui.esc(t) + '</span>'; }).join('') +
            '<button type="button" class="chip chip--accent" data-etiqueta>' + ui.icon('plus', 12) + 'Agregar</button>' +
          '</div>' +
        '</div>' +

        '<div class="ctx-section">' +
          '<h3>Acciones</h3>' +
          '<div class="stack gap-2">' +
            '<button type="button" class="btn btn--sm" data-asignar>' + ui.icon('user', 14) + 'Asignarme la conversación</button>' +
            '<button type="button" class="btn btn--sm" data-derivar>' + ui.icon('handoff', 14) + 'Derivar a otra cola</button>' +
            '<button type="button" class="btn btn--sm" data-ficha>' + ui.icon('external', 14) + 'Abrir ficha en el core</button>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';
  }

  private render(): string {
    return '<div class="inbox" id="inbox" data-pane="' + st.pane + '">' +
      this.panelLista() + this.panelHilo() + this.panelContexto() + '</div>';
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }

  private irAlFinal() {
    setTimeout(() => {
      var h = this.elRef.nativeElement.querySelector('#hiloScroll');
      if (h) h.scrollTop = h.scrollHeight;
    });
  }

  onInput(e: Event) {
    var t = e.target as HTMLTextAreaElement;
    if (t.id === 'msgTxt') {
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 120) + 'px';
    }
  }

  onKeydown(e: KeyboardEvent) {
    var t = e.target as HTMLElement;
    if (t.id === 'msgTxt' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.enviar();
    }
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var ui = this.ui;

    var f = target.closest('[data-filtro]');
    if (f) { st.filtro = f.getAttribute('data-filtro'); this.repintar(); this.irAlFinal(); return; }

    var cv = target.closest('[data-conv]');
    if (cv) {
      st.convId = cv.getAttribute('data-conv');
      var c = this.conv();
      if (c) c.noLeidos = 0;
      st.pane = 'thread';
      this.repintar();
      this.irAlFinal();
      return;
    }

    if (target.closest('[data-enviar]')) { this.enviar(); return; }

    if (target.closest('[data-demo-ia]')) { this.abrirDemoIA(); return; }

    if (target.closest('[data-resolver]')) {
      var cr = this.conv();
      cr.estado = 'resuelta';
      cr.mensajes.push({ tipo: 'sistema', t: new Date(this.d.HOY.getTime()), texto: 'Conversación marcada como resuelta por Camila Mardones' });
      ui.toast('Conversación resuelta', 'Sale de la bandeja activa y queda en el historial del contacto.', 'ok');
      this.repintar();
      this.irAlFinal();
      return;
    }

    if (target.closest('[data-reabrir]')) {
      var d = this.d;
      ui.abrirModal({
        titulo: 'Reabrir la conversación con una plantilla',
        sub: 'La ventana de 24 horas está cerrada',
        cuerpo:
          '<p class="muted" style="margin-bottom:var(--sp-4)">Elige una plantilla aprobada. El envío abre una conversación nueva y tiene costo.</p>' +
          '<div class="stack gap-2">' +
            d.plantillas.filter(function (p: any) { return p.estado === 'aprobada' && p.categoria === 'utility'; })
              .map(function (p: any, i: number) {
                return '<label class="radio-card"><input type="radio" name="tplReabrir" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>' +
                  '<span class="radio-card__txt"><strong class="mono">' + ui.esc(p.nombre) + '</strong>' +
                  '<small>' + ui.esc(p.body.slice(0, 90)) + '…</small></span></label>';
              }).join('') +
          '</div>' +
          '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('money') +
            '<span>Costo del envío: ' + ui.fmtUSDUnit(d.precios.utility) + '. Se registra en el presupuesto de cobranza.</span></div>',
        pie: '<button type="button" class="btn" data-cerrar>Cancelar</button>' +
             '<button type="button" class="btn btn--primary" data-confirmar-reabrir>Enviar plantilla</button>',
        alMontar: function (modal: HTMLElement) {
          modal.querySelector('[data-confirmar-reabrir]')!.addEventListener('click', function () {
            ui.cerrarModal();
            ui.toast('Plantilla enviada', 'Si el cliente responde, se abre una nueva ventana de 24 horas.', 'ok');
          });
        }
      });
      return;
    }

    if (target.closest('[data-asignar]')) {
      var ca = this.conv();
      ca.estado = 'mia'; ca.canal = 'humano'; ca.asignadoA = 'Camila Mardones';
      ui.toast('Conversación asignada', 'Quedó en «Asignadas a mí». El SLA de primera respuesta corre desde ahora.', 'ok');
      this.repintar();
      this.irAlFinal();
      return;
    }
    if (target.closest('[data-derivar]')) {
      ui.toast('Derivación', 'En el sistema real se elige la cola de destino y se agrega una nota interna.', 'ok');
      return;
    }
    if (target.closest('[data-ficha]')) {
      ui.toast('Ficha del core', 'Abre el contrato en el sistema de cartera, en una pestaña nueva.', 'ok');
      return;
    }
    if (target.closest('[data-etiqueta]')) {
      ui.toast('Etiquetas', 'Permiten agrupar conversaciones para los reportes de cobranza y comercial.', 'ok');
      return;
    }

    // Fallback: los botones de volver entre paneles (móvil) son el único uso
    // legítimo de data-pane para clic; se revisan al final para que no
    // intercepten clics en botones de acción anidados bajo #inbox[data-pane].
    var pn = target.closest('[data-pane]');
    if (pn) { st.pane = pn.getAttribute('data-pane'); this.repintar(); this.irAlFinal(); }
  }

  private enviar() {
    var host = this.elRef.nativeElement;
    var ta = host.querySelector('#msgTxt') as HTMLTextAreaElement | null;
    if (!ta || !ta.value.trim()) { if (ta) ta.focus(); return; }
    var c = this.conv();
    c.mensajes.push({ dir: 'out', autor: 'Camila Mardones', t: new Date(this.d.HOY.getTime()), estado: 'entregado', texto: ta.value.trim() });
    c.ultimo = new Date(this.d.HOY.getTime());
    if (c.estado === 'sin_asignar') { c.estado = 'mia'; c.canal = 'humano'; c.asignadoA = 'Camila Mardones'; }
    this.repintar();
    this.irAlFinal();
    setTimeout(() => {
      var nueva = this.elRef.nativeElement.querySelector('#msgTxt');
      if (nueva) nueva.focus();
    });
  }

  /* ---------- Chat simulado · IA (demo con Groq real, exclusivo de Patricio) ---------- */
  private horaAhora() { return this.ui.fmtHora(new Date()); }

  private demoBurbuja(m: any): string {
    var ui = this.ui;
    var esUser = m.rol === 'user';
    // Groq suele escribir **negrita** al estilo WhatsApp; el texto ya viene
    // escapado por nl2br, así que envolver en <strong> acá es seguro.
    var texto = ui.nl2br(m.texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return '<div class="bubble bubble--' + (esUser ? 'out' : 'in') + '">' +
      (!esUser ? '<div class="bubble__author bubble__author--bot">Agente IA · MAF</div>' : '') +
      '<div>' + texto + '</div>' +
      '<div class="bubble__meta">' + m.hora + '</div>' +
      '</div>';
  }

  private demoCuerpo(): string {
    var ui = this.ui;
    var vacio = !this.demoChat.mensajes.length;
    return '<div class="thread" id="demoChatHilo" style="max-height:min(50vh,420px);min-height:160px;overflow:auto;margin:0 calc(-1 * var(--sp-5));padding:0 var(--sp-5)">' +
        (vacio
          ? '<p class="small dim" style="text-align:center;padding:var(--sp-6) 0">' +
            (this.demoChat.cargando ? 'Escribiendo el primer mensaje…' : '') + '</p>'
          : this.demoChat.mensajes.map((m: any) => this.demoBurbuja(m)).join('')) +
      '</div>' +
      '<div class="composer__row" style="margin-top:var(--sp-4)">' +
        '<label class="sr-only" for="demoChatInput">Escribe como si fueras Patricio</label>' +
        '<textarea class="textarea grow" id="demoChatInput" rows="1" placeholder="Escribe como si fueras Patricio…"' +
          (this.demoChat.cargando || vacio ? ' disabled' : '') + '></textarea>' +
        '<button type="button" class="btn btn--primary" id="demoChatEnviar"' + (this.demoChat.cargando || vacio ? ' disabled' : '') + '>' +
          (this.demoChat.cargando ? 'Pensando…' : 'Enviar') + '</button>' +
      '</div>' +
      '<p class="small dim" style="margin-top:var(--sp-2)">Demostración: le contestas a la IA como si fueras Patricio Sandoval. Usa el modelo real de Groq, con la ficha de crédito de Patricio como única fuente de datos.</p>';
  }

  private pintarDemo() {
    if (!this.demoModal) return;
    var body = this.demoModal.querySelector('.modal__body') as HTMLElement | null;
    if (!body) return;
    body.innerHTML = this.demoCuerpo();
    var ta = body.querySelector('#demoChatInput') as HTMLTextAreaElement | null;
    var btn = body.querySelector('#demoChatEnviar');
    if (btn) btn.addEventListener('click', () => this.enviarDemo());
    if (ta) {
      ta.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviarDemo(); }
      });
      ta.focus();
    }
    var hilo = body.querySelector('#demoChatHilo');
    if (hilo) hilo.scrollTop = hilo.scrollHeight;
  }

  private abrirDemoIA() {
    var conv = this.conv();
    if (!conv) return;
    this.demoChat = { mensajes: [], cargando: true };
    this.demoModal = this.ui.abrirModal({
      titulo: 'Chat simulado · IA — ' + conv.contactoRef.nombre,
      sub: 'Escribe como si fueras Patricio; te responde la IA real (Groq)',
      ancho: 'wide',
      cuerpo: this.demoCuerpo(),
      pie: '<button type="button" class="btn" data-cerrar>Cerrar</button>'
    });

    this.groq.preguntar(conv.id, [{
      role: 'user',
      content: 'Redacta el primer mensaje de WhatsApp para Patricio, como si se lo estuvieras escribiendo tú (la empresa) recién ahora, sin que sea respuesta a nada. Salúdalo por su nombre, breve y cálido.'
    }]).then((texto) => {
      this.demoChat.mensajes.push({ rol: 'assistant', texto, hora: this.horaAhora() });
    }).catch((e: any) => {
      this.demoChat.mensajes.push({ rol: 'assistant', texto: '⚠️ ' + e.message, hora: this.horaAhora() });
    }).finally(() => {
      this.demoChat.cargando = false;
      this.pintarDemo();
    });
  }

  private enviarDemo() {
    var conv = this.conv();
    var body = this.demoModal?.querySelector('.modal__body');
    var ta = body?.querySelector('#demoChatInput') as HTMLTextAreaElement | null;
    if (!conv || !ta || !ta.value.trim() || this.demoChat.cargando) return;

    var texto = ta.value.trim();
    this.demoChat.mensajes.push({ rol: 'user', texto, hora: this.horaAhora() });
    this.demoChat.cargando = true;
    this.pintarDemo();

    var historial = this.demoChat.mensajes.slice(-10).map((m: any) => ({ role: m.rol, content: m.texto }));
    this.groq.preguntar(conv.id, historial).then((respuesta) => {
      this.demoChat.mensajes.push({ rol: 'assistant', texto: respuesta, hora: this.horaAhora() });
    }).catch((e: any) => {
      this.demoChat.mensajes.push({ rol: 'assistant', texto: '⚠️ ' + e.message, hora: this.horaAhora() });
    }).finally(() => {
      this.demoChat.cargando = false;
      this.pintarDemo();
    });
  }
}
