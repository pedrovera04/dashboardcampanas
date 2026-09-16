/* ===========================================================
   MAF · Vista 10 · Reportes
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  /* El panel de costos falla la primera vez a propósito: la maqueta debe
     mostrar también cómo se ve un error recuperable. */
  var st = { tab: 'comercial', costosIntento: 0, costosCargando: false };

  var TABS = [
    { id: 'comercial', label: 'Comercial' },
    { id: 'cobranza', label: 'Cobranza' },
    { id: 'costos', label: 'Costos' }
  ];

  /* ---------- Comercial ---------- */
  function panelComercial() {
    var r = d.reportes.comercial;
    var base = r.embudo[0].n || 1;
    var totalCosto = r.porJourney.reduce(function (a, f) { return a + f.costoUsd; }, 0);
    var totalLeads = r.porJourney.reduce(function (a, f) { return a + f.calificados; }, 0);
    var totalCierres = r.porJourney.reduce(function (a, f) { return a + f.cerrados; }, 0);

    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('target', 14) + 'Leads calificados</span>' +
        '<span class="kpi__value">' + ui.fmtInt(totalLeads) + '</span>' +
        '<span class="kpi__foot">Derivados a un ejecutivo con contexto</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Costo por lead</span>' +
        '<span class="kpi__value">' + ui.fmtUSD(totalCosto / totalLeads) + '</span>' +
        '<span class="kpi__foot">Solo costo Meta, sin horas de ejecutivo</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('check', 14) + 'Cierres atribuidos</span>' +
        '<span class="kpi__value">' + ui.fmtInt(totalCierres) + '</span>' +
        '<span class="kpi__foot">' + ui.fmtPct(totalCierres / totalLeads) + ' de los leads</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Costo por cierre</span>' +
        '<span class="kpi__value">' + ui.fmtUSD(totalCosto / totalCierres) + '</span>' +
        '<span class="kpi__foot">Inversión Meta por operación cerrada</span></div>' +
    '</div>' +

    /* Ancho completo: 7 columnas no caben en una columna angosta. */
    '<section class="card" style="margin-bottom:var(--sp-4)">' +
      '<div class="card__head"><h2>Conversión por journey</h2>' +
        '<p>Del mensaje entregado al cierre comercial</p></div>' +
      '<div class="card__body card__body--flush">' +
        ui.tablaWrap('<table class="data" style="min-width:760px">' +
          '<caption class="sr-only">Conversión por journey</caption><thead><tr>' +
          '<th scope="col">Journey</th><th scope="col" class="num">Contactados</th>' +
          '<th scope="col" class="num">Respondieron</th><th scope="col" class="num">Leads</th>' +
          '<th scope="col" class="num">Cierres</th><th scope="col" class="num">Costo</th>' +
          '<th scope="col" class="num">Costo/lead</th></tr></thead><tbody>' +
          r.porJourney.map(function (f) {
            return '<tr><td class="cell-main">' + ui.esc(f.nombre) + '</td>' +
              '<td class="num">' + ui.fmtInt(f.contactados) + '</td>' +
              '<td class="num">' + ui.fmtInt(f.respondieron) +
                '<br><span class="cell-sub">' + ui.fmtPct(f.respondieron / f.contactados, 1) + '</span></td>' +
              '<td class="num">' + ui.fmtInt(f.calificados) + '</td>' +
              '<td class="num">' + ui.fmtInt(f.cerrados) + '</td>' +
              '<td class="num">' + ui.fmtUSD(f.costoUsd) + '</td>' +
              '<td class="num">' + (f.calificados ? ui.fmtUSD(f.costoUsd / f.calificados) : '<span class="dim">—</span>') + '</td></tr>';
          }).join('') +
          '<tr><td class="cell-main">Total</td>' +
            '<td class="num cell-main">' + ui.fmtInt(r.porJourney.reduce(function (a, f) { return a + f.contactados; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(r.porJourney.reduce(function (a, f) { return a + f.respondieron; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(totalLeads) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(totalCierres) + '</td>' +
            '<td class="num cell-main">' + ui.fmtUSD(totalCosto) + '</td>' +
            '<td class="num cell-main">' + ui.fmtUSD(totalCosto / totalLeads) + '</td></tr>' +
          '</tbody></table>') +
      '</div>' +
      '<div class="card__foot"><span class="small muted">La encuesta postventa no genera leads: se mide aparte porque consume presupuesto marketing sin retorno comercial directo.</span></div>' +
    '</section>' +

    '<div class="grid grid--2">' +
      '<section class="card">' +
        '<div class="card__head"><h2>Embudo del mes</h2>' +
          '<p>Porcentajes sobre los mensajes entregados</p></div>' +
        '<div class="card__body"><div class="funnel">' +
          r.embudo.map(function (e) {
            return '<div class="funnel__step"><div class="funnel__top">' +
              '<span>' + e.etapa + '</span><span class="n">' + ui.fmtInt(e.n) + '</span>' +
              '<span class="p">' + ui.fmtPct(e.n / base, 0) + '</span></div>' +
              ui.barra(e.n / base) + '</div>';
          }).join('') +
        '</div></div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card__head"><h2>Lectura del período</h2></div>' +
        '<div class="card__body stack gap-3">' +
          '<div class="callout callout--ok">' + ui.icon('target') +
            '<span class="small">Los preaprobados sin cierre convierten a lead al doble que las cotizaciones frías: conviene priorizarlos en el presupuesto de marketing.</span></div>' +
          '<div class="callout callout--warn">' + ui.icon('alert') +
            '<span class="small">La encuesta postventa consumió ' + ui.fmtUSD(r.porJourney[2].costoUsd) +
            ' sin generar leads, y terminó con la plantilla pausada por bloqueos.</span></div>' +
          '<ul class="metric-list" style="margin-top:var(--sp-2)">' +
            '<li>Respuesta sobre entregados<span class="val">' + ui.fmtPct(r.embudo[2].n / base) + '</span></li>' +
            '<li>Lead por cada respuesta<span class="val">' + ui.fmtPct(totalLeads / r.embudo[2].n) + '</span></li>' +
            '<li>Cierre por cada lead<span class="val">' + ui.fmtPct(totalCierres / totalLeads) + '</span></li>' +
          '</ul>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  /* ---------- Cobranza ---------- */
  function panelCobranza() {
    var c = d.reportes.cobranza;
    var totalCartera = c.contactabilidad.reduce(function (a, t) { return a + t.cartera; }, 0);
    var totalRecuperado = c.contactabilidad.reduce(function (a, t) { return a + t.recuperado; }, 0);
    var totalContactados = c.contactabilidad.reduce(function (a, t) { return a + t.contactados; }, 0);
    var costoTotal = totalContactados * c.costoPorContacto;
    var maxCosto = Math.max.apply(null, c.comparativoCanal.map(function (x) { return x.costoContacto; }));

    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('users', 14) + 'Cartera en mora</span>' +
        '<span class="kpi__value">' + ui.fmtInt(totalCartera) + '</span>' +
        '<span class="kpi__foot">Contratos con al menos 1 día de atraso</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('phone', 14) + 'Contactabilidad</span>' +
        '<span class="kpi__value">' + ui.fmtPct(totalContactados / totalCartera) + '</span>' +
        '<span class="kpi__foot">Mensajes entregados sobre la cartera</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Monto recuperado</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(totalRecuperado) + '</span>' +
        '<span class="kpi__foot">Pagos dentro de los 7 días del contacto</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Costo por contacto</span>' +
        '<span class="kpi__value">' + ui.fmtUSDUnit(c.costoPorContacto) + '</span>' +
        '<span class="kpi__foot">' + ui.fmtUSD(costoTotal) + ' de gasto total del mes</span></div>' +
    '</div>' +

    /* La tabla va a ancho completo: con 7 columnas no cabe en una columna angosta
       y los montos quedaban cortados. */
    '<section class="card" style="margin-bottom:var(--sp-4)">' +
      '<div class="card__head"><h2>Contactabilidad y recuperación por tramo</h2>' +
        '<p>El producto opera los tramos de 1 a 30 días. El tramo 31-60 se muestra como referencia.</p></div>' +
      '<div class="card__body card__body--flush">' +
        ui.tablaWrap('<table class="data" style="min-width:820px">' +
          '<caption class="sr-only">Recuperación por tramo de mora</caption><thead><tr>' +
          '<th scope="col">Tramo</th><th scope="col" class="num">Cartera</th>' +
          '<th scope="col" class="num">Contactados</th><th scope="col" class="num">Respondieron</th>' +
          '<th scope="col" class="num">Pagaron</th><th scope="col" class="num">Recuperado</th>' +
          '<th scope="col" class="num">Efectividad</th></tr></thead><tbody>' +
          c.contactabilidad.map(function (t) {
            return '<tr><td class="cell-main">' + t.tramo + '</td>' +
              '<td class="num">' + ui.fmtInt(t.cartera) + '</td>' +
              '<td class="num">' + ui.fmtInt(t.contactados) + '</td>' +
              '<td class="num">' + ui.fmtInt(t.respondieron) + '</td>' +
              '<td class="num">' + ui.fmtInt(t.pagaron) + '</td>' +
              '<td class="num">' + ui.fmtCLP(t.recuperado) + '</td>' +
              '<td class="num">' + ui.fmtPct(t.pagaron / t.cartera, 1) + '</td></tr>';
          }).join('') +
          '<tr><td class="cell-main">Total</td>' +
            '<td class="num cell-main">' + ui.fmtInt(totalCartera) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(totalContactados) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(c.contactabilidad.reduce(function (a, t) { return a + t.respondieron; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(c.contactabilidad.reduce(function (a, t) { return a + t.pagaron; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtCLP(totalRecuperado) + '</td>' +
            '<td class="num cell-main">—</td></tr>' +
          '</tbody></table>') +
      '</div>' +
    '</section>' +

    '<div class="grid grid--2">' +
      '<section class="card">' +
        '<div class="card__head"><h2>Costo por contacto según canal</h2>' +
          '<p>Pesos chilenos por contacto efectivo</p></div>' +
        '<div class="card__body">' +
          '<div class="funnel">' +
            c.comparativoCanal.map(function (x) {
              return '<div class="funnel__step"><div class="funnel__top">' +
                '<span>' + ui.esc(x.canal) + '</span>' +
                '<span class="n">' + ui.fmtCLP(x.costoContacto) + '</span></div>' +
                ui.barra(x.costoContacto / maxCosto, x.canal === 'WhatsApp' ? 'ok' : null) +
                '<span class="small dim">Contactabilidad ' + ui.fmtPct(x.contactabilidad, 0) +
                ' · recuperación ' + ui.fmtPct(x.recuperacion, 0) + '</span></div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card__head"><h2>Lectura del período</h2></div>' +
        '<div class="card__body stack gap-3">' +
          '<div class="callout callout--ok">' + ui.icon('money') +
            '<span class="small">WhatsApp cuesta 62 veces menos que una llamada saliente y contacta a más del doble de la cartera.</span></div>' +
          '<div class="callout callout--info">' + ui.icon('clock') +
            '<span class="small">La efectividad cae a la mitad después del día 15. Adelantar el primer contacto al día 1 es la palanca con mayor retorno.</span></div>' +
          '<div class="callout callout--warn">' + ui.icon('alert') +
            '<span class="small">El tramo 31-60 queda fuera del alcance actual: por normativa de cobranza exige un tratamiento distinto y no se gestiona por este canal.</span></div>' +
          '<ul class="metric-list" style="margin-top:var(--sp-2)">' +
            '<li>Gasto del mes en cobranza<span class="val">' + ui.fmtUSD(costoTotal) + '</span></li>' +
            '<li>Recuperado por dólar invertido<span class="val">' + ui.fmtCLP(totalRecuperado / costoTotal) + '</span></li>' +
          '</ul>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  /* ---------- Costos ---------- */
  function panelCostos() {
    if (st.costosCargando) {
      return '<div class="card"><div class="card__body">' + ui.skeletonTabla(6, 4) + '</div></div>';
    }
    if (st.costosIntento === 0) {
      return '<div class="card"><div class="card__body">' + ui.estadoError({
        titulo: 'No pudimos traer el detalle de costos',
        texto: 'La API de facturación de Meta no respondió. Los datos de envíos sí están disponibles en las otras pestañas.',
        detalle: 'Error 504 · graph.facebook.com/v21.0/billing · 15 sep 2026, 11:42',
        accion: 'reintentar-costos'
      }) + '</div></div>';
    }

    var s = d.reportes.costos.serie;
    var max = Math.max.apply(null, s.map(function (m) { return m.marketing + m.utility + m.auth; }));
    var ultimo = s[s.length - 1];
    var k = d.kpis;
    var partes = [
      { label: 'Marketing', color: ui.COLORES_CAT.marketing },
      { label: 'Utility', color: ui.COLORES_CAT.utility },
      { label: 'Authentication', color: ui.COLORES_CAT.authentication }
    ];

    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Gasto del mes a la fecha</span>' +
        '<span class="kpi__value">' + ui.fmtUSD(k.costos.total) + '</span>' +
        '<span class="kpi__foot">15 de 30 días transcurridos</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('chart', 14) + 'Proyección de cierre</span>' +
        '<span class="kpi__value">' + ui.fmtUSD(k.proyeccionMes) + '</span>' +
        '<span class="kpi__foot">Al ritmo actual de envío</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('send', 14) + 'Costo medio por mensaje</span>' +
        '<span class="kpi__value">' + ui.fmtUSDUnit(k.costos.total / k.totalEnviados) + '</span>' +
        '<span class="kpi__foot">Mezcla actual de categorías</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('alert', 14) + 'Peso de marketing</span>' +
        '<span class="kpi__value">' + ui.fmtPct(k.costos.marketing / k.costos.total) + '</span>' +
        '<span class="kpi__foot">Del costo total, con ' + ui.fmtPct(k.enviadosPorCategoria.marketing / k.totalEnviados) + ' de los envíos</span></div>' +
    '</div>' +

    '<div class="grid grid--main-aside">' +
      '<section class="card">' +
        '<div class="card__head"><div class="grow"><h2>Evolución del costo por categoría</h2>' +
          '<p>Últimos 6 meses, en dólares</p></div></div>' +
        '<div class="card__body">' +
          '<div class="chart-bars" role="img" aria-label="Gráfico de barras apiladas del costo mensual por categoría, de abril a septiembre">' +
            s.map(function (m) {
              var total = m.marketing + m.utility + m.auth;
              return '<div class="chart-bars__col">' +
                '<span class="small tnum dim">' + Math.round(total) + '</span>' +
                '<div class="chart-bars__stack" style="height:' + (total / max * 100) + '%">' +
                  '<span style="background:' + ui.COLORES_CAT.authentication + ';height:' + (m.auth / total * 100) + '%"></span>' +
                  '<span style="background:' + ui.COLORES_CAT.utility + ';height:' + (m.utility / total * 100) + '%"></span>' +
                  '<span style="background:' + ui.COLORES_CAT.marketing + ';height:' + (m.marketing / total * 100) + '%"></span>' +
                '</div>' +
                '<span class="chart-bars__lbl">' + m.mes + '</span></div>';
            }).join('') +
          '</div>' +
          '<div style="margin-top:var(--sp-4)">' + ui.leyenda(partes) + '</div>' +
        '</div>' +
        '<div class="card__foot"><span class="small muted">Septiembre está a mitad de mes: la barra muestra lo gastado hasta el día 15.</span></div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card__head"><h2>Desglose de septiembre</h2></div>' +
        '<div class="card__body">' +
          '<ul class="metric-list">' +
            ['marketing', 'utility', 'authentication'].map(function (cat) {
              return '<li>' + ui.catTag(cat) +
                '<span class="grow small dim">' + ui.fmtInt(k.enviadosPorCategoria[cat]) + ' mensajes</span>' +
                '<span class="val">' + ui.fmtUSD(k.costos[cat]) + '</span></li>';
            }).join('') +
            '<li><span class="strong">Total</span>' +
              '<span class="grow small dim">' + ui.fmtInt(k.totalEnviados) + ' mensajes</span>' +
              '<span class="val">' + ui.fmtUSD(k.costos.total) + '</span></li>' +
          '</ul>' +
          '<div class="callout callout--warn" style="margin-top:var(--sp-4)">' + ui.icon('alert') +
            '<span class="small">Marketing concentra el ' + ui.fmtPct(k.costos.marketing / k.costos.total, 0) +
            ' del gasto. Mover avisos operativos a plantillas utility es la palanca de ahorro más directa.</span></div>' +
          '<dl class="dl" style="margin-top:var(--sp-4)">' +
            '<dt>Marketing</dt><dd>' + ui.fmtUSDUnit(d.precios.marketing) + ' por conversación</dd>' +
            '<dt>Utility</dt><dd>' + ui.fmtUSDUnit(d.precios.utility) + ' por conversación</dd>' +
            '<dt>Authentication</dt><dd>' + ui.fmtUSDUnit(d.precios.authentication) + ' por conversación</dd>' +
            '<dt>Servicio</dt><dd>Sin costo (respuestas dentro de la ventana de 24 h)</dd>' +
          '</dl>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function contenidoTab() {
    if (st.tab === 'comercial') return panelComercial();
    if (st.tab === 'cobranza') return panelCobranza();
    return panelCostos();
  }

  MAF.vistas.reportes = {
    titulo: 'Reportes',
    subtitulo: 'Resultados comerciales, de cobranza y de costo',
    acciones: function () {
      return '<button type="button" class="btn btn--sm" data-global="exportar">' +
        ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>';
    },
    render: function () {
      return '<div class="tabs" role="tablist" aria-label="Tipos de reporte" style="margin-bottom:var(--sp-4);background:var(--surface);border-radius:var(--radius-lg) var(--radius-lg) 0 0;padding:0 var(--sp-3);border:1px solid var(--border);border-bottom-color:var(--border)">' +
          TABS.map(function (t) {
            return '<button type="button" class="tab" role="tab" id="rtab-' + t.id + '" ' +
              'aria-selected="' + (st.tab === t.id) + '" aria-controls="panel-rep" data-rtab="' + t.id + '">' +
              ui.esc(t.label) + '</button>';
          }).join('') +
        '</div>' +
        '<div id="panel-rep" role="tabpanel" aria-labelledby="rtab-' + st.tab + '" tabindex="0">' +
          contenidoTab() + '</div>';
    },
    montar: function (root) { enlazar(root); }
  };

  /* Listeners delegados sobre root, registrados una sola vez en montar. */
  function repintar(root) {
    root.innerHTML = MAF.vistas.reportes.render();
  }

  function enlazar(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-rtab]');
      if (t) { st.tab = t.getAttribute('data-rtab'); repintar(root); return; }

      if (e.target.closest('[data-accion="reintentar-costos"]')) {
        st.costosCargando = true;
        repintar(root);
        setTimeout(function () {
          st.costosCargando = false;
          st.costosIntento = 1;
          repintar(root);
          ui.toast('Datos de facturación al día', 'La API de Meta respondió en el segundo intento.', 'ok');
        }, 900);
      }
    });

    root.addEventListener('keydown', function (e) {
      var t = e.target.closest('[role="tab"]');
      if (!t) return;
      var idx = TABS.map(function (x) { return x.id; }).indexOf(t.getAttribute('data-rtab'));
      var nuevo = null;
      if (e.key === 'ArrowRight') nuevo = (idx + 1) % TABS.length;
      if (e.key === 'ArrowLeft') nuevo = (idx - 1 + TABS.length) % TABS.length;
      if (nuevo === null) return;
      e.preventDefault();
      st.tab = TABS[nuevo].id;
      repintar(root);
      var btn = root.querySelector('[data-rtab="' + st.tab + '"]');
      if (btn) btn.focus();
    });
  }
})();
