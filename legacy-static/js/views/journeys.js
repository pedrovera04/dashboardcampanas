/* ===========================================================
   MAF · Vista 6 · Journeys automatizados
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  var st = { journeyId: 'j1' };

  var ICONO = { trigger: 'zap', condition: 'split', wait: 'clock', send: 'send', human: 'handoff', end: 'flag' };
  var KIND = { trigger: 'Disparador', condition: 'Condición', wait: 'Espera', send: 'Envío de plantilla', human: 'Derivación a humano', end: 'Cierre' };

  function journey() { return d.journeys.filter(function (j) { return j.id === st.journeyId; })[0]; }

  function buscarNodo(j, id) {
    var todos = j.nodos.concat(j.nodosExtra || []);
    return todos.filter(function (n) { return n.id === id; })[0];
  }

  function nodo(n) {
    return '<button type="button" class="node node--' + n.tipo + '" data-nodo="' + n.id + '">' +
      '<span class="node__icon">' + ui.icon(ICONO[n.tipo], 15) + '</span>' +
      '<span class="node__txt">' +
        '<span class="node__kind">' + KIND[n.tipo] + '</span>' +
        '<span class="node__title">' + ui.esc(n.titulo) + '</span>' +
        '<span class="node__desc">' + ui.esc(n.desc) + '</span>' +
      '</span></button>';
  }

  function conector(etiqueta) {
    return '<div class="connector">' + (etiqueta ? '<span class="connector__label">' + ui.esc(etiqueta) + '</span>' : '') + '</div>';
  }

  function flujo(j) {
    var ramaId = Object.keys(j.ramas || {})[0] || null;
    var corte = ramaId ? j.nodos.map(function (n) { return n.id; }).indexOf(ramaId) : j.nodos.length - 1;

    var html = '<div class="flow__col">';
    for (var i = 0; i <= corte; i++) {
      html += nodo(j.nodos[i]);
      if (i < corte) html += conector();
    }

    if (ramaId) {
      var rama = j.ramas[ramaId];
      html += conector();
      html += '<div class="branch">' +
        '<div class="branch__side"><span class="branch__tag branch__tag--yes">Sí</span>' +
          rama.si.map(function (id, k) {
            var n = buscarNodo(j, id);
            return (k > 0 ? conector() : '') + (n ? nodo(n) : '');
          }).join('') +
        '</div>' +
        '<div class="branch__side"><span class="branch__tag branch__tag--no">No</span>' +
          rama.no.map(function (id, k) {
            var n = buscarNodo(j, id);
            return (k > 0 ? conector() : '') + (n ? nodo(n) : '');
          }).join('') +
        '</div>' +
      '</div>';
    }
    html += '</div>';
    return '<div class="flow">' + html + '</div>';
  }

  function selector() {
    return '<div class="stack gap-3">' +
      d.journeys.map(function (j) {
        var activo = j.id === st.journeyId;
        return '<button type="button" class="conv-item" data-journey="' + j.id + '"' +
          (activo ? ' aria-current="true"' : '') + '>' +
          '<span class="conv-item__txt">' +
            '<span class="conv-item__top"><strong>' + ui.esc(j.nombre) + '</strong></span>' +
            '<span class="conv-item__prev">' + ui.esc(j.descripcion) + '</span>' +
            '<span class="conv-item__tags">' +
              ui.badge(j.estado === 'activo' ? 'Activo' : 'Borrador', j.estado === 'activo' ? 'ok' : 'muted') +
              ui.badge(j.objetivo === 'comercial' ? 'Comercial' : 'Cobranza', 'info', true) +
            '</span>' +
          '</span></button>';
      }).join('') + '</div>';
  }

  function estadisticas(j) {
    return '<div class="journey-stats">' +
      '<div><span class="n">' + ui.fmtInt(j.activos) + '</span><span class="l">Contactos en curso</span></div>' +
      '<div><span class="n">' + ui.fmtInt(j.completados) + '</span><span class="l">Completados</span></div>' +
      '<div><span class="n">' + (j.objetivo === 'comercial' ? ui.fmtInt(j.leads) : ui.fmtPct(j.conversion)) + '</span>' +
        '<span class="l">' + (j.objetivo === 'comercial' ? 'Leads generados' : 'Pago en plazo') + '</span></div>' +
      '<div><span class="n">' + (j.objetivo === 'comercial' ? ui.fmtPct(j.conversion) : ui.fmtUSD(j.completados * d.precios.utility)) + '</span>' +
        '<span class="l">' + (j.objetivo === 'comercial' ? 'Conversión a lead' : 'Costo acumulado') + '</span></div>' +
    '</div>';
  }

  function detalleNodo(n) {
    ui.abrirModal({
      titulo: n.titulo,
      sub: KIND[n.tipo],
      cuerpo:
        '<p class="muted" style="margin-bottom:var(--sp-4)">' + ui.esc(n.desc) + '</p>' +
        '<dl class="dl">' +
          Object.keys(n.detalle).map(function (k) {
            return '<dt>' + ui.esc(k) + '</dt><dd>' + ui.esc(n.detalle[k]) + '</dd>';
          }).join('') +
        '</dl>' +
        (n.tipo === 'send'
          ? '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('info') +
            '<span>Los envíos del journey se contabilizan en el mismo presupuesto Meta que las campañas manuales.</span></div>'
          : n.tipo === 'human'
            ? '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('handoff') +
              '<span>Al derivar, la conversación aparece en la bandeja con todo el contexto del contacto y el historial del bot.</span></div>'
            : ''),
      pie: '<button type="button" class="btn" data-cerrar>Cerrar</button>' +
           '<button type="button" class="btn btn--primary" data-editar-nodo>' + ui.icon('edit', 14) + 'Editar nodo</button>',
      alMontar: function (modal) {
        modal.querySelector('[data-editar-nodo]').addEventListener('click', function () {
          ui.cerrarModal();
          ui.toast('Edición de nodo', 'En el sistema real se abre el panel de configuración del nodo.', 'ok');
        });
      }
    });
  }

  MAF.vistas.journeys = {
    titulo: 'Journeys',
    subtitulo: 'Flujos automatizados que corren solos sobre la cartera',
    acciones: function () {
      return '<button type="button" class="btn btn--sm btn--primary" data-global="nuevo-journey">' +
        ui.icon('plus', 14) + 'Nuevo journey</button>';
    },
    render: function () {
      var j = journey();
      return '<div class="grid grid--aside-main">' +
        '<div class="stack gap-4">' +
          '<section class="card">' +
            '<div class="card__head"><h2>Journeys configurados</h2></div>' +
            '<div class="card__body">' + selector() + '</div>' +
          '</section>' +
          '<section class="card">' +
            '<div class="card__head"><h2>Leyenda</h2></div>' +
            '<div class="card__body"><ul class="metric-list">' +
              Object.keys(KIND).map(function (k) {
                return '<li><span class="node__icon" style="width:24px;height:24px">' + ui.icon(ICONO[k], 13) + '</span>' +
                  '<span class="grow small">' + KIND[k] + '</span></li>';
              }).join('') +
            '</ul></div>' +
          '</section>' +
        '</div>' +

        '<section class="card">' +
          '<div class="card__head">' +
            '<div class="grow"><h2>' + ui.esc(j.nombre) + '</h2><p>' + ui.esc(j.descripcion) + '</p></div>' +
            ui.badge(j.estado === 'activo' ? 'Activo' : 'Borrador', j.estado === 'activo' ? 'ok' : 'muted') +
          '</div>' +
          '<div class="card__body">' +
            estadisticas(j) +
            '<p class="small dim" style="margin:var(--sp-4) 0 var(--sp-3)">Haz clic en cualquier nodo para ver su configuración.</p>' +
            flujo(j) +
          '</div>' +
          '<div class="card__foot">' +
            '<span class="small muted grow">' + j.nodos.length + (j.nodosExtra.length ? ' + ' + j.nodosExtra.length : '') + ' nodos · última ejecución hoy 06:00</span>' +
            (j.estado === 'activo'
              ? '<button type="button" class="btn btn--danger" data-pausar-journey>' + ui.icon('pause', 14) + 'Pausar journey</button>'
              : '<button type="button" class="btn btn--primary" data-activar-journey>' + ui.icon('play', 14) + 'Publicar journey</button>') +
          '</div>' +
        '</section>' +
      '</div>';
    },
    montar: function (root) { enlazar(root); },
    onAccion: function (a) {
      if (a === 'nuevo-journey') {
        ui.toast('Nuevo journey', 'En el sistema real se abre el lienzo en blanco con el catálogo de nodos.', 'ok');
      }
    }
  };

  function enlazar(root) {
    root.addEventListener('click', function (e) {
      var jb = e.target.closest('[data-journey]');
      if (jb) {
        st.journeyId = jb.getAttribute('data-journey');
        root.innerHTML = MAF.vistas.journeys.render();
        return;
      }
      var nb = e.target.closest('[data-nodo]');
      if (nb) {
        var n = buscarNodo(journey(), nb.getAttribute('data-nodo'));
        if (n) detalleNodo(n);
        return;
      }
      if (e.target.closest('[data-pausar-journey]')) {
        ui.toast('Journey pausado', 'Deja de captar contactos nuevos. Los que están en curso terminan su recorrido.', 'warn');
        return;
      }
      if (e.target.closest('[data-activar-journey]')) {
        ui.toast('Falta aprobación', 'La plantilla renovacion_contrato_v2 requiere visto bueno de Riesgo y Legal antes de publicar.', 'warn');
      }
    });
  }
})();
