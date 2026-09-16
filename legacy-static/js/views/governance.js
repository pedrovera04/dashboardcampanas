/* ===========================================================
   MAF · Vista 9 · Gobernanza y consentimiento
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  var st = { tab: 'optin', busqueda: '' };

  var TABS = [
    { id: 'optin', label: 'Registro de opt-in' },
    { id: 'optout', label: 'Opt-out' },
    { id: 'auditoria', label: 'Log de auditoría' }
  ];

  function conteos() {
    var base = d.contactos;
    var vig = base.filter(function (c) { return c.consentimiento === 'vigente'; }).length;
    var rev = base.filter(function (c) { return c.consentimiento === 'revocado'; }).length;
    var sin = base.filter(function (c) { return c.consentimiento === 'sin_registro'; }).length;
    return { total: base.length, vigente: vig, revocado: rev, sinRegistro: sin };
  }

  function resumen() {
    var c = conteos();
    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('users', 14) + 'Contactos en la base</span>' +
        '<span class="kpi__value">' + ui.fmtInt(c.total) + '</span>' +
        '<span class="kpi__foot">Sincronizados del CRM y del core de cartera</span></div>' +

      '<div class="kpi"><span class="kpi__label">' + ui.icon('check', 14) + 'Con consentimiento vigente</span>' +
        '<span class="kpi__value">' + ui.fmtInt(c.vigente) + '<small>' + ui.fmtPct(c.vigente / c.total, 1) + '</small></span>' +
        '<span class="kpi__foot">Contactables por campañas de marketing</span></div>' +

      '<div class="kpi"><span class="kpi__label">' + ui.icon('alert', 14) + 'Sin registro de opt-in</span>' +
        '<span class="kpi__value">' + ui.fmtInt(c.sinRegistro) + '</span>' +
        '<span class="kpi__foot">Excluidos automáticamente de todo envío marketing</span></div>' +

      '<div class="kpi"><span class="kpi__label">' + ui.icon('ban', 14) + 'Consentimiento revocado</span>' +
        '<span class="kpi__value">' + ui.fmtInt(c.revocado) + '</span>' +
        '<span class="kpi__foot">' + d.optOuts.length + ' bajas nuevas en los últimos 7 días</span></div>' +
    '</div>';
  }

  function tablaOptIn() {
    var q = st.busqueda.toLowerCase();
    var filas = d.optIns.filter(function (o) {
      return !q || (o.contacto + ' ' + o.rut).toLowerCase().indexOf(q) !== -1;
    });

    if (!filas.length) {
      return '<div class="card__body">' + ui.estadoVacio({
        icono: 'search',
        titulo: 'Sin resultados',
        texto: 'Ningún contacto coincide con «' + st.busqueda + '». Busca por nombre o por RUT.'
      }) + '</div>';
    }

    return ui.tablaWrap('<table class="data" style="min-width:880px">' +
      '<caption class="sr-only">Registro de consentimiento por contacto</caption><thead><tr>' +
      '<th scope="col">Contacto</th><th scope="col">RUT</th><th scope="col">Teléfono</th>' +
      '<th scope="col">Estado</th><th scope="col">Fecha</th><th scope="col">Canal</th>' +
      '<th scope="col">Evidencia</th></tr></thead><tbody>' +
      filas.map(function (o) {
        return '<tr><td class="cell-main">' + ui.esc(o.contacto) + '</td>' +
          '<td class="mono">' + ui.esc(o.rut) + '</td>' +
          '<td class="mono small">' + ui.esc(o.telefono) + '</td>' +
          '<td>' + ui.badgeConsent(o.estado) + '</td>' +
          '<td class="small">' + ui.fmtFecha(o.fecha) + '</td>' +
          '<td class="small">' + (o.canal ? d.labels.canalOptIn[o.canal] : '<span class="dim">—</span>') + '</td>' +
          '<td class="small muted">' + ui.esc(o.evidencia) + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  function tablaOptOut() {
    return ui.tablaWrap('<table class="data" style="min-width:760px">' +
      '<caption class="sr-only">Contactos que solicitaron baja</caption><thead><tr>' +
      '<th scope="col">Contacto</th><th scope="col">RUT</th><th scope="col">Fecha de baja</th>' +
      '<th scope="col">Motivo</th><th scope="col">Origen</th><th scope="col">Alcance</th></tr></thead><tbody>' +
      d.optOuts.map(function (o) {
        return '<tr><td class="cell-main">' + ui.esc(o.contacto) + '</td>' +
          '<td class="mono">' + ui.esc(o.rut) + '</td>' +
          '<td class="small">' + ui.fmtFecha(o.fecha) + '</td>' +
          '<td>' + ui.esc(o.motivo) + '</td>' +
          '<td class="small muted">' + ui.esc(o.origen) + '</td>' +
          '<td>' + ui.badge(o.alcance, o.alcance === 'Todo' ? 'danger' : 'warn') + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  function tablaAuditoria() {
    return ui.tablaWrap('<table class="data" style="min-width:880px">' +
      '<caption class="sr-only">Log de auditoría</caption><thead><tr>' +
      '<th scope="col">Fecha y hora</th><th scope="col">Usuario</th><th scope="col">Acción</th>' +
      '<th scope="col">Objeto</th><th scope="col">Detalle</th><th scope="col">IP</th></tr></thead><tbody>' +
      d.auditoria.map(function (a) {
        return '<tr><td class="small nowrap">' + ui.fmtFechaHora(a.t) + '</td>' +
          '<td>' + (a.actor === 'Sistema' || a.actor === 'Meta Business' || a.actor === 'Agente IA'
            ? '<span class="chip">' + ui.esc(a.actor) + '</span>'
            : '<span class="cell-main">' + ui.esc(a.actor) + '</span>') + '</td>' +
          '<td>' + ui.esc(a.accion) + '</td>' +
          '<td class="small">' + ui.esc(a.objeto) + '</td>' +
          '<td class="small muted">' + ui.esc(a.detalle) + '</td>' +
          '<td class="mono small dim">' + ui.esc(a.ip) + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  function contenidoTab() {
    if (st.tab === 'optin') return tablaOptIn();
    if (st.tab === 'optout') return tablaOptOut();
    return tablaAuditoria();
  }

  function pie() {
    if (st.tab === 'optin') {
      return '<span class="small muted grow">Se muestran los primeros ' + d.optIns.length +
        ' registros de ' + ui.fmtInt(conteos().total) + '. La evidencia se conserva 6 años.</span>' +
        '<button type="button" class="btn btn--sm" data-global-exp>' + ui.icon('download', 14) + 'Exportar registro</button>';
    }
    if (st.tab === 'optout') {
      return '<span class="small muted grow">Las bajas se aplican en menos de 5 minutos a todas las campañas y journeys activos.</span>';
    }
    return '<span class="small muted grow">El log es inmutable y se retiene por 24 meses. Incluye accesos a datos personales.</span>' +
      '<button type="button" class="btn btn--sm" data-global-exp>' + ui.icon('download', 14) + 'Exportar log</button>';
  }

  MAF.vistas.gobernanza = {
    titulo: 'Gobernanza y consentimiento',
    subtitulo: 'Trazabilidad del opt-in, las bajas y todo lo que hace el equipo',
    acciones: function () {
      return '<button type="button" class="btn btn--sm" data-global="exportar">' +
        ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>';
    },
    render: function () {
      return resumen() +
        '<div class="callout callout--info" style="margin-bottom:var(--sp-4)">' + ui.icon('shield') +
          '<span>Toda campaña de marketing se filtra contra este registro antes de salir. Un contacto sin opt-in vigente nunca se incluye, aunque el segmento lo contenga.</span></div>' +

        '<section class="card">' +
          '<div class="tabs" role="tablist" aria-label="Secciones de gobernanza">' +
            TABS.map(function (t) {
              return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" ' +
                'aria-selected="' + (st.tab === t.id) + '" aria-controls="panel-gob" data-tab="' + t.id + '">' +
                ui.esc(t.label) + '</button>';
            }).join('') +
          '</div>' +

          (st.tab === 'optin'
            ? '<div class="toolbar" style="border-radius:0">' +
                '<div class="field grow" style="gap:var(--sp-1)">' +
                  '<label class="sr-only" for="gobBuscar">Buscar contacto</label>' +
                  '<input class="input input--search" id="gobBuscar" type="search" placeholder="Buscar por nombre o RUT" value="' + ui.esc(st.busqueda) + '">' +
                '</div></div>'
            : '') +

          '<div id="panel-gob" role="tabpanel" aria-labelledby="tab-' + st.tab + '" tabindex="0">' +
            contenidoTab() + '</div>' +
          '<div class="card__foot">' + pie() + '</div>' +
        '</section>';
    },
    montar: function (root) { enlazar(root); }
  };

  function repintar(root) {
    root.innerHTML = MAF.vistas.gobernanza.render();
    enlazarDirectos(root); // los delegados ya están sobre root desde montar
  }

  /* El buscador se vuelve a crear en cada repintado */
  function enlazarDirectos(root) {
    var b = root.querySelector('#gobBuscar');
    if (!b) return;
    b.addEventListener('input', ui.deb(function () {
      st.busqueda = b.value.trim();
      var panel = root.querySelector('#panel-gob');
      if (panel) panel.innerHTML = contenidoTab();
    }, 180));
  }

  /* Delegados sobre root: se registran una sola vez */
  function enlazar(root) {
    enlazarDirectos(root);

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]');
      if (t) { st.tab = t.getAttribute('data-tab'); st.busqueda = ''; repintar(root); return; }
      if (e.target.closest('[data-global-exp]')) {
        ui.toast('Exportación solicitada', 'El archivo se genera con marca de auditoría y se envía a tu correo.', 'ok');
      }
    });

    /* Navegación con flechas entre pestañas */
    root.addEventListener('keydown', function (e) {
      var t = e.target.closest('[role="tab"]');
      if (!t) return;
      var idx = TABS.map(function (x) { return x.id; }).indexOf(t.getAttribute('data-tab'));
      var nuevo = null;
      if (e.key === 'ArrowRight') nuevo = (idx + 1) % TABS.length;
      if (e.key === 'ArrowLeft') nuevo = (idx - 1 + TABS.length) % TABS.length;
      if (nuevo === null) return;
      e.preventDefault();
      st.tab = TABS[nuevo].id;
      repintar(root);
      var btn = root.querySelector('[data-tab="' + st.tab + '"]');
      if (btn) btn.focus();
    });

  }
})();
