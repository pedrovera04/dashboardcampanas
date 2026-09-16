/* ===========================================================
   MAF · Router, navegación y arranque
   =========================================================== */
(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  /* ---------- Navegación ---------- */
  var NAV = [
    { grupo: 'General', items: [
      { ruta: 'dashboard', label: 'Dashboard', icono: 'dashboard' }
    ]},
    { grupo: 'Activación', items: [
      { ruta: 'campanas', label: 'Campañas', icono: 'send' },
      { ruta: 'audiencias', label: 'Audiencias', icono: 'users' },
      { ruta: 'plantillas', label: 'Plantillas', icono: 'template' },
      { ruta: 'journeys', label: 'Journeys', icono: 'flow' }
    ]},
    { grupo: 'Operación', items: [
      { ruta: 'conversaciones', label: 'Conversaciones', icono: 'inbox', contador: function () {
        return d.conversaciones.reduce(function (a, c) { return a + c.noLeidos; }, 0);
      } },
      { ruta: 'agente', label: 'Agente IA', icono: 'bot' }
    ]},
    { grupo: 'Control', items: [
      { ruta: 'gobernanza', label: 'Gobernanza', icono: 'shield' },
      { ruta: 'reportes', label: 'Reportes', icono: 'chart' }
    ]}
  ];

  function pintarNav(rutaActual) {
    var nav = document.getElementById('sidebarNav');
    nav.innerHTML = NAV.map(function (g) {
      return '<div class="nav-group">' +
        '<h2 class="nav-group__title">' + ui.esc(g.grupo) + '</h2><ul>' +
        g.items.map(function (it) {
          var activo = it.ruta === rutaActual;
          var n = it.contador ? it.contador() : 0;
          return '<li><a class="nav-link" href="#/' + it.ruta + '"' +
            (activo ? ' aria-current="page"' : '') + '>' +
            ui.icon(it.icono, 17) + '<span>' + ui.esc(it.label) + '</span>' +
            (n > 0 ? '<span class="count" aria-label="' + n + ' sin leer">' + n + '</span>' : '') +
            '</a></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  /* ---------- Íconos del chasis ---------- */
  document.getElementById('brandMark').innerHTML = ui.logo(30, 'MAF');
  document.getElementById('burger').innerHTML = ui.icon('menu', 20);
  document.getElementById('sidebarClose').innerHTML = ui.icon('x', 18);

  /* ---------- Sidebar móvil ---------- */
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var burger = document.getElementById('burger');

  function abrirMenu() {
    sidebar.classList.add('is-open');
    scrim.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    var primero = sidebar.querySelector('.nav-link');
    if (primero) primero.focus();
  }
  function cerrarMenu(devolverFoco) {
    sidebar.classList.remove('is-open');
    scrim.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    if (devolverFoco) burger.focus();
  }
  burger.addEventListener('click', abrirMenu);
  scrim.addEventListener('click', function () { cerrarMenu(); });
  document.getElementById('sidebarClose').addEventListener('click', function () { cerrarMenu(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) cerrarMenu(true);
  });

  /* ---------- Router ---------- */
  var RUTAS = {
    dashboard: 'dashboard',
    campanas: 'campanas',
    audiencias: 'audiencias',
    plantillas: 'plantillas',
    journeys: 'journeys',
    conversaciones: 'conversaciones',
    agente: 'agente',
    gobernanza: 'gobernanza',
    reportes: 'reportes'
  };

  var vistaActual = null;

  function parsearHash() {
    var h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    var partes = h.split('/').filter(Boolean);
    return { ruta: partes[0] || 'dashboard', params: partes.slice(1) };
  }

  function navegar() {
    var r = parsearHash();
    ui.cerrarModal(); // un modal abierto no debe sobrevivir al cambio de ruta
    var navActiva = RUTAS[r.ruta] ? r.ruta : 'dashboard';
    var nombreVista = navActiva;
    // Sub-rutas que tienen su propia vista pero marcan el mismo ítem del menú
    if (navActiva === 'campanas' && r.params[0] === 'nueva') nombreVista = 'campanaNueva';

    if (vistaActual && vistaActual.desmontar) {
      try { vistaActual.desmontar(); } catch (e) { /* noop */ }
    }

    var vista = MAF.vistas[nombreVista];
    vistaActual = vista;

    pintarNav(navActiva);
    cerrarMenu();

    var ctx = { params: r.params };
    var titulo = typeof vista.titulo === 'function' ? vista.titulo(ctx) : vista.titulo;
    var sub = typeof vista.subtitulo === 'function' ? vista.subtitulo(ctx) : vista.subtitulo;

    document.getElementById('pageTitle').textContent = titulo;
    document.getElementById('pageSubtitle').textContent = sub || '';
    document.title = 'MAF · ' + titulo;
    document.getElementById('topbarActions').innerHTML = vista.acciones ? vista.acciones(ctx) : '';

    // Se reemplaza el nodo completo para que no queden listeners de la vista
    // anterior escuchando sobre el contenedor.
    var viejo = document.getElementById('view');
    var cont = document.createElement('div');
    cont.id = 'view';
    viejo.replaceWith(cont);
    cont.innerHTML = vista.render(ctx);
    if (vista.montar) vista.montar(cont, ctx);

    window.scrollTo(0, 0);
    document.getElementById('contenido').focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', navegar);

  /* ---------- Acciones globales de la topbar ---------- */
  document.getElementById('topbarActions').addEventListener('click', function (e) {
    var b = e.target.closest('[data-global]');
    if (!b) return;
    var accion = b.getAttribute('data-global');
    if (accion === 'salud') return mostrarSalud();
    if (accion === 'exportar') {
      return ui.toast('Exportación solicitada', 'En el sistema real se genera un CSV y se envía por correo.', 'ok');
    }
    // El resto lo resuelve la vista activa, si declara el hook
    if (vistaActual && vistaActual.onAccion) vistaActual.onAccion(accion);
  });

  function mostrarSalud() {
    var c = d.cuenta;
    ui.abrirModal({
      titulo: 'Salud de la cuenta de WhatsApp',
      sub: c.nombreMostrado + ' · ' + c.numero,
      cuerpo:
        '<div class="health">' +
          '<div class="health__row"><span class="lbl">Estado del número</span>' +
            '<span class="val">' + ui.badge('Conectado y verificado', 'ok') + '</span></div>' +
          '<div class="health__row"><span class="lbl">Quality rating</span>' +
            '<span class="val">' + ui.badge('Alta', 'ok') + '</span></div>' +
          '<div class="health__row"><span class="lbl">Tier de mensajería</span>' +
            '<span class="val">' + c.tier + ' conversaciones / 24 h</span></div>' +
          '<div class="tier-scale" role="img" aria-label="Nivel 3 de 4">' +
            '<span class="on"></span><span class="on"></span><span class="on"></span><span></span></div>' +
          '<p class="small dim">El siguiente tier (100K) se alcanza manteniendo quality alta durante 7 días con el límite copado.</p>' +
          '<div class="health__row"><span class="lbl">Enviadas últimas 24 h</span>' +
            '<span class="val tnum">' + ui.fmtInt(c.enviadas24h) + ' de ' + ui.fmtInt(c.limiteDiario) + '</span></div>' +
          ui.barra(c.enviadas24h / c.limiteDiario, 'ok') +
          '<div class="health__row"><span class="lbl">ID de la cuenta (WABA)</span>' +
            '<span class="val mono small">' + c.wabaId + '</span></div>' +
          '<div class="callout callout--info">' + ui.icon('info') +
            '<span>El quality rating lo calcula Meta con los bloqueos y reportes de los últimos 7 días. Si baja a media, el límite de envío se congela.</span></div>' +
        '</div>',
      pie: '<button type="button" class="btn" data-cerrar>Cerrar</button>'
    });
  }
  MAF.mostrarSalud = mostrarSalud;

  /* ---------- Arranque ---------- */
  navegar();
})();
