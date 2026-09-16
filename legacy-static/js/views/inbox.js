/* ===========================================================
   MAF · Vista 7 · Bandeja de conversaciones
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  var st = { filtro: 'todas', convId: 'v1', pane: 'list' };

  var FILTROS = [
    { id: 'todas', label: 'Todas' },
    { id: 'sin_asignar', label: 'Sin asignar' },
    { id: 'mia', label: 'Asignadas a mí' },
    { id: 'bot', label: 'Bot' },
    { id: 'resuelta', label: 'Resueltas' }
  ];

  function listaFiltrada() {
    return d.conversaciones.filter(function (c) {
      return st.filtro === 'todas' || c.estado === st.filtro;
    }).sort(function (a, b) { return new Date(b.ultimo) - new Date(a.ultimo); });
  }

  function conv() { return d.conversaciones.filter(function (c) { return c.id === st.convId; })[0]; }

  /* ---------- Columna 1: lista ---------- */
  function itemConv(c) {
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
          c.etiquetas.slice(0, 2).map(function (t) { return ui.badge(t, 'muted', true); }).join('') +
          (!c.ventana.abierta ? ui.badge('Ventana cerrada', 'warn', true) : '') +
        '</span>' +
      '</span></button>';
  }

  function panelLista() {
    var ls = listaFiltrada();
    return '<div class="inbox__pane inbox__pane--list">' +
      '<div class="inbox__head">' +
        '<strong class="grow">Bandeja</strong>' +
        '<span class="small dim">' + ls.length + ' de ' + d.conversaciones.length + '</span>' +
      '</div>' +
      '<div class="conv-filters" role="group" aria-label="Filtrar conversaciones">' +
        FILTROS.map(function (f) {
          var n = f.id === 'todas' ? d.conversaciones.length
            : d.conversaciones.filter(function (c) { return c.estado === f.id; }).length;
          return '<button type="button" data-filtro="' + f.id + '" aria-pressed="' + (st.filtro === f.id) + '">' +
            f.label + (n ? ' ' + n : '') + '</button>';
        }).join('') +
      '</div>' +
      '<div class="inbox__scroll">' +
        (ls.length
          ? ls.map(itemConv).join('')
          : ui.estadoVacio({
              icono: 'inbox',
              titulo: 'Nada por acá',
              texto: 'No hay conversaciones con este filtro. Cambia a «Todas» para ver el resto de la bandeja.'
            })) +
      '</div>' +
    '</div>';
  }

  /* ---------- Columna 2: hilo ---------- */
  function ticks(estado) {
    if (estado === 'leido') return '<span style="color:#34b7f1">' + ui.icon('checks', 14) + '</span>';
    if (estado === 'entregado') return ui.icon('checks', 14);
    return ui.icon('check', 14);
  }

  function mensaje(m, anterior) {
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
      '<div class="bubble__meta">' + ui.fmtHora(m.t) + (esSalida ? ticks(m.estado) : '') + '</div>' +
      '</div>';
  }

  function panelHilo() {
    var c = conv();
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
        c.mensajes.map(function (m, i) { return mensaje(m, c.mensajes[i - 1]); }).join('') +
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

  /* ---------- Columna 3: contexto ---------- */
  /* Campos del contexto que van en pesos; el resto se muestra tal cual */
  var CAMPOS_MONEDA = ['Cuota mensual', 'Saldo insoluto', 'Monto', 'Pie ofrecido'];

  function panelContexto() {
    var c = conv();
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
            c.etiquetas.map(function (t) { return '<span class="chip">' + ui.esc(t) + '</span>'; }).join('') +
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

  /* ---------- Vista ---------- */
  MAF.vistas.conversaciones = {
    titulo: 'Conversaciones',
    subtitulo: 'Bandeja compartida entre el agente IA y los ejecutivos',
    acciones: function () {
      var sin = d.conversaciones.filter(function (c) { return c.estado === 'sin_asignar'; }).length;
      return (sin ? '<span class="badge badge--warn">' + sin + ' sin asignar</span>' : '') +
        '<button type="button" class="btn btn--sm" data-global="exportar">' + ui.icon('download', 14) +
        '<span class="hide-sm">Exportar</span></button>';
    },
    render: function () {
      return '<div class="inbox" id="inbox" data-pane="' + st.pane + '">' +
        panelLista() + panelHilo() + panelContexto() + '</div>';
    },
    montar: function (root) {
      enlazar(root);
      irAlFinal(root);
    }
  };

  function irAlFinal(root) {
    var h = root.querySelector('#hiloScroll');
    if (h) h.scrollTop = h.scrollHeight;
  }

  function repintar(root) {
    root.innerHTML = MAF.vistas.conversaciones.render();
    enlazarDirectos(root); // los delegados ya están sobre root desde montar
    irAlFinal(root);
  }

  /* El compositor se vuelve a crear con cada repintado del hilo */
  function enlazarDirectos(root) {
    var ta = root.querySelector('#msgTxt');
    if (!ta) return;
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(root); }
    });
  }

  /* Delegados sobre root: se registran una sola vez */
  function enlazar(root) {
    enlazarDirectos(root);

    root.addEventListener('click', function (e) {
      var f = e.target.closest('[data-filtro]');
      if (f) { st.filtro = f.getAttribute('data-filtro'); repintar(root); return; }

      var cv = e.target.closest('[data-conv]');
      if (cv) {
        st.convId = cv.getAttribute('data-conv');
        var c = conv();
        if (c) c.noLeidos = 0;
        st.pane = 'thread';
        repintar(root);
        return;
      }

      var pn = e.target.closest('[data-pane]');
      if (pn) { st.pane = pn.getAttribute('data-pane'); repintar(root); return; }

      if (e.target.closest('[data-enviar]')) { enviar(root); return; }

      if (e.target.closest('[data-resolver]')) {
        var cr = conv();
        cr.estado = 'resuelta';
        cr.mensajes.push({ tipo: 'sistema', t: new Date(d.HOY.getTime()), texto: 'Conversación marcada como resuelta por Camila Mardones' });
        ui.toast('Conversación resuelta', 'Sale de la bandeja activa y queda en el historial del contacto.', 'ok');
        repintar(root);
        return;
      }

      if (e.target.closest('[data-reabrir]')) {
        ui.abrirModal({
          titulo: 'Reabrir la conversación con una plantilla',
          sub: 'La ventana de 24 horas está cerrada',
          cuerpo:
            '<p class="muted" style="margin-bottom:var(--sp-4)">Elige una plantilla aprobada. El envío abre una conversación nueva y tiene costo.</p>' +
            '<div class="stack gap-2">' +
              d.plantillas.filter(function (p) { return p.estado === 'aprobada' && p.categoria === 'utility'; })
                .map(function (p, i) {
                  return '<label class="radio-card"><input type="radio" name="tplReabrir" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>' +
                    '<span class="radio-card__txt"><strong class="mono">' + ui.esc(p.nombre) + '</strong>' +
                    '<small>' + ui.esc(p.body.slice(0, 90)) + '…</small></span></label>';
                }).join('') +
            '</div>' +
            '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('money') +
              '<span>Costo del envío: ' + ui.fmtUSDUnit(d.precios.utility) + '. Se registra en el presupuesto de cobranza.</span></div>',
          pie: '<button type="button" class="btn" data-cerrar>Cancelar</button>' +
               '<button type="button" class="btn btn--primary" data-confirmar-reabrir>Enviar plantilla</button>',
          alMontar: function (modal) {
            modal.querySelector('[data-confirmar-reabrir]').addEventListener('click', function () {
              ui.cerrarModal();
              ui.toast('Plantilla enviada', 'Si el cliente responde, se abre una nueva ventana de 24 horas.', 'ok');
            });
          }
        });
        return;
      }

      if (e.target.closest('[data-asignar]')) {
        var ca = conv();
        ca.estado = 'mia'; ca.canal = 'humano'; ca.asignadoA = 'Camila Mardones';
        ui.toast('Conversación asignada', 'Quedó en «Asignadas a mí». El SLA de primera respuesta corre desde ahora.', 'ok');
        repintar(root);
        return;
      }
      if (e.target.closest('[data-derivar]')) {
        ui.toast('Derivación', 'En el sistema real se elige la cola de destino y se agrega una nota interna.', 'ok');
        return;
      }
      if (e.target.closest('[data-ficha]')) {
        ui.toast('Ficha del core', 'Abre el contrato en el sistema de cartera, en una pestaña nueva.', 'ok');
        return;
      }
      if (e.target.closest('[data-etiqueta]')) {
        ui.toast('Etiquetas', 'Permiten agrupar conversaciones para los reportes de cobranza y comercial.', 'ok');
      }
    });

  }

  function enviar(root) {
    var ta = root.querySelector('#msgTxt');
    if (!ta || !ta.value.trim()) { if (ta) ta.focus(); return; }
    var c = conv();
    c.mensajes.push({ dir: 'out', autor: 'Camila Mardones', t: new Date(d.HOY.getTime()), estado: 'entregado', texto: ta.value.trim() });
    c.ultimo = new Date(d.HOY.getTime());
    if (c.estado === 'sin_asignar') { c.estado = 'mia'; c.canal = 'humano'; c.asignadoA = 'Camila Mardones'; }
    repintar(root);
    var nueva = root.querySelector('#msgTxt');
    if (nueva) nueva.focus();
  }
})();
