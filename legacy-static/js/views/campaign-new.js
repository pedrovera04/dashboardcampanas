/* ===========================================================
   MAF · Vista 3 · Crear campaña (asistente de 4 pasos)
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  var PASOS = [
    { n: 1, titulo: 'Audiencia', desc: 'A quién le hablamos' },
    { n: 2, titulo: 'Plantilla', desc: 'Qué mensaje enviamos' },
    { n: 3, titulo: 'Programación', desc: 'Cuándo y a qué ritmo' },
    { n: 4, titulo: 'Resumen', desc: 'Revisión y confirmación' }
  ];

  var st = nuevoEstado();

  function nuevoEstado() {
    return {
      paso: 1,
      nombre: '',
      segmentoId: '',
      plantillaId: '',
      mapeo: {},
      excluirSinOptIn: true,
      excluirContactados: true,
      modo: 'programado',
      fecha: '2026-09-18',
      horaIni: '09:00',
      horaFin: '19:00',
      velocidad: '600',
      siLimite: 'omitir',
      errores: {}
    };
  }

  function segmento() { return d.segmentos.filter(function (s) { return s.id === st.segmentoId; })[0]; }
  function plantilla() { return d.plantillas.filter(function (p) { return p.id === st.plantillaId; })[0]; }

  /* Audiencia final tras aplicar las exclusiones del paso 1 */
  function audienciaFinal() {
    var s = segmento();
    if (!s) return 0;
    var base = st.excluirSinOptIn ? s.conOptIn : s.tamano;
    if (st.excluirContactados) base = Math.round(base * 0.91); // 9% ya recibió marketing en 30 días
    return base;
  }

  function costoEstimado() {
    var p = plantilla();
    if (!p) return 0;
    return audienciaFinal() * d.precios[p.categoria];
  }

  /* ---------- Stepper ---------- */
  function stepper() {
    return '<ol class="stepper">' + PASOS.map(function (p) {
      var estado = p.n === st.paso ? 'actual' : p.n < st.paso ? 'hecho' : 'pendiente';
      return '<li><button type="button" class="step-btn' + (estado === 'hecho' ? ' is-done' : '') + '"' +
        (estado === 'actual' ? ' aria-current="step"' : '') +
        (p.n > st.paso ? ' disabled' : '') +
        ' data-ir="' + p.n + '">' +
        '<span class="num">' + (estado === 'hecho' ? ui.icon('check', 13) : p.n) + '</span>' +
        '<span><span style="display:block">' + p.titulo + '</span>' +
        '<span class="dim" style="font-weight:400">' + p.desc + '</span></span></button></li>';
    }).join('') + '</ol>';
  }

  /* ---------- Paso 1 ---------- */
  function paso1() {
    var s = segmento();
    return '<fieldset>' +
      '<legend style="margin-bottom:var(--sp-3)">Selecciona un segmento guardado</legend>' +
      (st.errores.segmento ? '<p class="field__error" style="margin-bottom:var(--sp-3)">' +
        ui.icon('alertCircle', 13) + ui.esc(st.errores.segmento) + '</p>' : '') +
      '<div class="stack gap-2">' +
        d.segmentos.map(function (sg) {
          var sinOptIn = sg.tamano - sg.conOptIn;
          return '<label class="radio-card">' +
            '<input type="radio" name="segmento" value="' + sg.id + '"' +
              (st.segmentoId === sg.id ? ' checked' : '') + '>' +
            '<span class="radio-card__txt grow">' +
              '<strong>' + ui.esc(sg.nombre) + '</strong>' +
              '<small>' + ui.esc(sg.descripcion) + '</small>' +
              '<span class="row wrap gap-2" style="margin-top:var(--sp-2)">' +
                ui.badge(ui.fmtInt(sg.tamano) + ' contactos', 'muted', true) +
                ui.badge(ui.fmtInt(sg.conOptIn) + ' con opt-in vigente', 'ok', true) +
                (sinOptIn > 0 ? ui.badge(ui.fmtInt(sinOptIn) + ' sin consentimiento', 'warn', true) : '') +
              '</span>' +
            '</span></label>';
        }).join('') +
      '</div></fieldset>' +

      '<div style="margin-top:var(--sp-5)">' +
        '<h3 style="margin-bottom:var(--sp-2)">Exclusiones</h3>' +
        '<label class="check"><input type="checkbox" id="excOptIn"' + (st.excluirSinOptIn ? ' checked' : '') + '>' +
          '<span class="check__txt">Excluir contactos sin consentimiento vigente' +
          '<small>Obligatorio para plantillas de marketing. Los opt-out siempre se excluyen.</small></span></label>' +
        '<label class="check"><input type="checkbox" id="excCont"' + (st.excluirContactados ? ' checked' : '') + '>' +
          '<span class="check__txt">Excluir a quien ya recibió marketing en los últimos 30 días' +
          '<small>Evita superar el límite de frecuencia y que Meta baje el quality rating.</small></span></label>' +
      '</div>' +

      (s ? '<div class="count-box" style="margin-top:var(--sp-5)">' +
        '<span class="n" id="conteoPaso1">' + ui.fmtInt(audienciaFinal()) + '</span>' +
        '<span class="lbl">contactos recibirán el mensaje, de ' + ui.fmtInt(s.tamano) +
        ' que tiene el segmento</span></div>' : '');
  }

  /* ---------- Paso 2 ---------- */
  function contactoEjemplo() {
    var s = segmento();
    if (!s) return d.contactos[0];
    var res = d.evaluarSegmento(s.reglas, s.logica);
    return res[0] || d.contactos[0];
  }

  function valorVariable(v) {
    var c = contactoEjemplo();
    var campo = st.mapeo[v.n];
    if (!campo) return '{{' + v.n + '}}';
    if (campo === '__fijo__') return v.ejemplo;
    var val = c[campo];
    if (val === null || val === undefined) return v.ejemplo;
    if (campo === 'nombre') return String(val).split(' ')[0];
    if (campo === 'cuotaMensual' || campo === 'montoCotizado' || campo === 'saldoInsoluto') return ui.fmtCLP(val);
    if (campo === 'proximoVencimiento' || campo === 'fechaCotizacion') return ui.fmtFechaLarga(val);
    return String(val);
  }

  function burbujaPreview(p, resaltarVars) {
    if (!p) return '';
    var cuerpo = ui.esc(p.body);
    cuerpo = cuerpo.replace(/\{\{(\d)\}\}/g, function (m, n) {
      var v = (p.variables || []).filter(function (x) { return String(x.n) === n; })[0];
      var txt = v ? valorVariable(v) : m;
      return resaltarVars ? '<span class="var-token">' + ui.esc(txt) + '</span>' : ui.esc(txt);
    }).replace(/\n/g, '<br>');

    return '<div class="bubble bubble--out">' +
      (p.header && p.header.tipo === 'texto' && p.header.valor
        ? '<div class="bubble__header">' + ui.esc(p.header.valor) + '</div>' : '') +
      '<div>' + cuerpo + '</div>' +
      (p.footer ? '<div class="bubble__footer">' + ui.esc(p.footer) + '</div>' : '') +
      '<div class="bubble__meta">' + ui.fmtHora(d.HOY) + ui.icon('checks', 14) + '</div>' +
      ((p.botones || []).length
        ? '<div class="bubble__btns">' + p.botones.map(function (b) {
            return '<button type="button" tabindex="-1">' +
              (b.tipo === 'url' ? ui.icon('external', 13) : b.tipo === 'copy_code' ? ui.icon('copy', 13) : ui.icon('inbox', 13)) +
              ui.esc(b.texto) + '</button>';
          }).join('') + '</div>'
        : '') +
      '</div>';
  }

  function telefono(p) {
    return '<div class="phone">' +
      '<div class="phone__bar"><span class="phone__avatar" aria-hidden="true">' + ui.logo(17) + '</span>' +
        '<span><strong>MAF Chile</strong><small>cuenta de empresa</small></span></div>' +
      '<div class="phone__screen">' +
        '<div class="day-sep" style="align-self:center">hoy</div>' +
        (p ? burbujaPreview(p, true) : '<p class="small" style="text-align:center;color:var(--wa-meta);padding:var(--sp-6) 0">Elige una plantilla para ver la vista previa</p>') +
      '</div></div>';
  }

  function paso2() {
    var aprobadas = d.plantillas.filter(function (p) { return p.estado === 'aprobada'; });
    var p = plantilla();
    var c = contactoEjemplo();

    return '<div class="tpl-grid">' +
      '<div>' +
        '<div class="field">' +
          '<label class="field__label" for="selPlantilla">Plantilla aprobada por Meta</label>' +
          '<select class="select" id="selPlantilla"' + (st.errores.plantilla ? ' aria-invalid="true" aria-describedby="errPlantilla"' : '') + '>' +
            '<option value="">Selecciona una plantilla…</option>' +
            aprobadas.map(function (x) {
              return '<option value="' + x.id + '"' + (st.plantillaId === x.id ? ' selected' : '') + '>' +
                ui.esc(x.nombre) + ' · ' + d.labels.categoria[x.categoria] + '</option>';
            }).join('') +
          '</select>' +
          (st.errores.plantilla
            ? '<p class="field__error" id="errPlantilla">' + ui.icon('alertCircle', 13) + ui.esc(st.errores.plantilla) + '</p>'
            : '<p class="field__hint">Solo aparecen las plantillas en estado aprobada. Las rechazadas o pausadas no se pueden enviar.</p>') +
        '</div>' +

        (p ? '<div class="callout callout--' + (p.categoria === 'marketing' ? 'warn' : 'info') + '" style="margin-top:var(--sp-4)">' +
          ui.icon(p.categoria === 'marketing' ? 'alert' : 'info') +
          '<span>' + (p.categoria === 'marketing'
            ? '<strong>Categoría marketing.</strong> Cuesta ' + ui.fmtUSDUnit(d.precios.marketing) +
              ' por mensaje y aplica el límite de frecuencia por contacto.'
            : '<strong>Categoría utility.</strong> Cuesta ' + ui.fmtUSDUnit(d.precios.utility) +
              ' por mensaje. Solo puede usarse sobre un contrato vigente del destinatario.') +
          '</span></div>' : '') +

        (p && p.variables.length
          ? '<div style="margin-top:var(--sp-5)">' +
              '<h3 style="margin-bottom:var(--sp-1)">Mapeo de variables</h3>' +
              '<p class="small dim" style="margin-bottom:var(--sp-3)">Cada variable de la plantilla se reemplaza por un campo del contacto al momento del envío.</p>' +
              p.variables.map(function (v) {
                return '<div class="field">' +
                  '<label class="field__label" for="var' + v.n + '">' +
                    '<span class="var-token">{{' + v.n + '}}</span> ' + ui.esc(v.descripcion) + '</label>' +
                  '<select class="select" id="var' + v.n + '" data-var="' + v.n + '">' +
                    '<option value="">Sin asignar</option>' +
                    '<option value="__fijo__"' + (st.mapeo[v.n] === '__fijo__' ? ' selected' : '') + '>Texto fijo · «' + ui.esc(v.ejemplo) + '»</option>' +
                    camposDisponibles().map(function (cp) {
                      return '<option value="' + cp.id + '"' + (st.mapeo[v.n] === cp.id ? ' selected' : '') + '>' +
                        ui.esc(cp.label) + '</option>';
                    }).join('') +
                  '</select>' +
                  '</div>';
              }).join('') +
              (st.errores.mapeo ? '<p class="field__error" style="margin-top:var(--sp-3)">' +
                ui.icon('alertCircle', 13) + ui.esc(st.errores.mapeo) + '</p>' : '') +
            '</div>'
          : '') +
      '</div>' +

      '<div>' +
        '<h3 style="margin-bottom:var(--sp-3)">Vista previa en vivo</h3>' +
        telefono(p) +
        '<p class="small dim" style="margin-top:var(--sp-3);text-align:center">' +
          'Datos de ejemplo tomados de <strong>' + ui.esc(c.nombre) + '</strong>, un contacto real del segmento.</p>' +
      '</div>' +
    '</div>';
  }

  function camposDisponibles() {
    return [
      { id: 'nombre', label: 'Nombre del contacto' },
      { id: 'modelo', label: 'Modelo cotizado o financiado' },
      { id: 'montoCotizado', label: 'Monto de la cotización' },
      { id: 'cuotaMensual', label: 'Valor de la cuota' },
      { id: 'cuotasRestantes', label: 'Cuotas restantes' },
      { id: 'proximoVencimiento', label: 'Fecha de vencimiento' },
      { id: 'fechaCotizacion', label: 'Fecha de la cotización' },
      { id: 'diasMora', label: 'Días de mora' },
      { id: 'sucursal', label: 'Sucursal de origen' },
      { id: 'contrato', label: 'Número de contrato' }
    ];
  }

  /* ---------- Paso 3 ---------- */
  function paso3() {
    var horas = Math.ceil(audienciaFinal() / parseInt(st.velocidad, 10));
    return '<div class="grid grid--2">' +
      '<div>' +
        '<fieldset><legend style="margin-bottom:var(--sp-3)">Momento del envío</legend>' +
          '<div class="stack gap-2">' +
            '<label class="radio-card"><input type="radio" name="modo" value="ahora"' +
              (st.modo === 'ahora' ? ' checked' : '') + '>' +
              '<span class="radio-card__txt"><strong>Enviar al confirmar</strong>' +
              '<small>El primer mensaje sale apenas termines el asistente.</small></span></label>' +
            '<label class="radio-card"><input type="radio" name="modo" value="programado"' +
              (st.modo === 'programado' ? ' checked' : '') + '>' +
              '<span class="radio-card__txt"><strong>Programar para una fecha</strong>' +
              '<small>Recomendado: permite revisar el resumen con el equipo antes del envío.</small></span></label>' +
          '</div>' +
        '</fieldset>' +

        '<div class="field" style="margin-top:var(--sp-4)">' +
          '<label class="field__label" for="fFecha">Fecha de inicio</label>' +
          '<input class="input" type="date" id="fFecha" value="' + st.fecha + '" min="2026-09-15"' +
            (st.modo === 'ahora' ? ' disabled' : '') + '>' +
        '</div>' +

        '<div class="row gap-3" style="margin-top:var(--sp-4);align-items:flex-end">' +
          '<div class="field grow"><label class="field__label" for="fHoraIni">Ventana horaria · desde</label>' +
            '<input class="input" type="time" id="fHoraIni" value="' + st.horaIni + '"></div>' +
          '<div class="field grow"><label class="field__label" for="fHoraFin">hasta</label>' +
            '<input class="input" type="time" id="fHoraFin" value="' + st.horaFin + '"></div>' +
        '</div>' +
        '<p class="field__hint" style="margin-top:var(--sp-2)">Fuera de esta ventana el envío se pausa y retoma al día siguiente. La Ley 21.484 de cobranza restringe los contactos fuera de horario hábil.</p>' +
      '</div>' +

      '<div>' +
        '<div class="field">' +
          '<label class="field__label" for="fVelocidad">Velocidad de envío</label>' +
          '<select class="select" id="fVelocidad">' +
            '<option value="300"' + (st.velocidad === '300' ? ' selected' : '') + '>300 mensajes por hora · conservadora</option>' +
            '<option value="600"' + (st.velocidad === '600' ? ' selected' : '') + '>600 mensajes por hora · recomendada</option>' +
            '<option value="1200"' + (st.velocidad === '1200' ? ' selected' : '') + '>1.200 mensajes por hora · rápida</option>' +
            '<option value="3000"' + (st.velocidad === '3000' ? ' selected' : '') + '>3.000 mensajes por hora · máxima del tier</option>' +
          '</select>' +
          '<p class="field__hint">Un envío lento reparte las respuestas entrantes y evita saturar la bandeja de los ejecutivos.</p>' +
        '</div>' +

        '<div class="field" style="margin-top:var(--sp-4)">' +
          '<label class="field__label" for="fLimite">Si un contacto supera el límite de frecuencia</label>' +
          '<select class="select" id="fLimite">' +
            '<option value="omitir"' + (st.siLimite === 'omitir' ? ' selected' : '') + '>Omitirlo y registrar el motivo</option>' +
            '<option value="reintentar"' + (st.siLimite === 'reintentar' ? ' selected' : '') + '>Reintentar cuando se libere la ventana</option>' +
            '<option value="utility"' + (st.siLimite === 'utility' ? ' selected' : '') + '>Sustituir por una plantilla utility equivalente</option>' +
          '</select>' +
          '<p class="field__hint">Meta limita cuántos mensajes de marketing puede recibir una persona en un período. Los rechazos igual se facturan si el mensaje sale.</p>' +
        '</div>' +

        '<div class="callout callout--info" style="margin-top:var(--sp-5)">' + ui.icon('clock') +
          '<span>Con esta configuración el envío completo toma cerca de <strong>' + horas +
          (horas === 1 ? ' hora' : ' horas') + '</strong> de ventana activa.</span></div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- Paso 4 ---------- */
  function paso4() {
    var s = segmento(), p = plantilla(), n = audienciaFinal(), costo = costoEstimado();
    var sinMapear = p ? p.variables.filter(function (v) { return !st.mapeo[v.n]; }).length : 0;

    return '<div class="grid grid--2">' +
      '<div>' +
        '<div class="field">' +
          '<label class="field__label" for="fNombre">Nombre de la campaña</label>' +
          '<input class="input" id="fNombre" type="text" value="' + ui.esc(st.nombre) + '" ' +
            'placeholder="Ej: Reactivación cotizaciones · septiembre"' +
            (st.errores.nombre ? ' aria-invalid="true" aria-describedby="errNombre"' : '') + '>' +
          (st.errores.nombre
            ? '<p class="field__error" id="errNombre">' + ui.icon('alertCircle', 13) + ui.esc(st.errores.nombre) + '</p>'
            : '<p class="field__hint">Con este nombre aparece en el listado y en los reportes.</p>') +
        '</div>' +

        '<h3 style="margin:var(--sp-5) 0 var(--sp-3)">Resumen de la configuración</h3>' +
        '<dl class="dl">' +
          '<dt>Segmento</dt><dd>' + ui.esc(s ? s.nombre : '—') + '</dd>' +
          '<dt>Audiencia final</dt><dd>' + ui.fmtInt(n) + ' contactos</dd>' +
          '<dt>Plantilla</dt><dd class="mono">' + ui.esc(p ? p.nombre : '—') + '</dd>' +
          '<dt>Categoría</dt><dd>' + (p ? ui.catTag(p.categoria) : '—') + '</dd>' +
          '<dt>Inicio</dt><dd>' + (st.modo === 'ahora' ? 'Al confirmar' : ui.fmtFecha(new Date(st.fecha + 'T12:00:00'))) + '</dd>' +
          '<dt>Ventana</dt><dd>' + st.horaIni + ' a ' + st.horaFin + '</dd>' +
          '<dt>Velocidad</dt><dd>' + ui.fmtInt(st.velocidad) + ' msj/hora</dd>' +
          '<dt>Si hay límite</dt><dd>' + ({ omitir: 'Omitir el contacto', reintentar: 'Reintentar después', utility: 'Sustituir por utility' })[st.siLimite] + '</dd>' +
        '</dl>' +
      '</div>' +

      '<div>' +
        '<div class="card" style="background:var(--surface-2)">' +
          '<div class="card__head"><h2>Costo estimado</h2></div>' +
          '<div class="card__body">' +
            '<p class="kpi__value" style="font-size:var(--fs-32)">' + ui.fmtUSD(costo) + '</p>' +
            '<p class="small muted" style="margin-top:var(--sp-2)">' +
              ui.fmtInt(n) + ' mensajes × ' + ui.fmtUSDUnit(p ? d.precios[p.categoria] : 0) + ' por conversación ' +
              (p ? d.labels.categoria[p.categoria].toLowerCase() : '') + '</p>' +
            '<hr style="border:0;border-top:1px solid var(--border);margin:var(--sp-4) 0">' +
            '<ul class="metric-list">' +
              '<li>Gasto del mes a la fecha<span class="val">' + ui.fmtUSD(d.kpis.costos.total) + '</span></li>' +
              '<li>Con esta campaña<span class="val">' + ui.fmtUSD(d.kpis.costos.total + costo) + '</span></li>' +
              '<li>Proyección de cierre de mes<span class="val">' + ui.fmtUSD(d.kpis.proyeccionMes + costo) + '</span></li>' +
            '</ul>' +
            '<p class="small dim" style="margin-top:var(--sp-3)">Meta cobra por conversación abierta, no por mensaje. Las respuestas dentro de la ventana de 24 horas no tienen costo adicional.</p>' +
          '</div>' +
        '</div>' +

        (sinMapear > 0
          ? '<div class="callout callout--warn" style="margin-top:var(--sp-4)">' + ui.icon('alert') +
            '<span>Hay <strong>' + sinMapear + ' variable(s) sin mapear</strong>. Vuelve al paso 2 antes de confirmar.</span></div>'
          : '<div class="callout callout--ok" style="margin-top:var(--sp-4)">' + ui.icon('check') +
            '<span>Todas las variables están mapeadas y la audiencia tiene consentimiento vigente.</span></div>') +

        '<div class="callout" style="margin-top:var(--sp-3)">' + ui.icon('shield') +
          '<span>Al confirmar queda registro en el log de auditoría con tu usuario, la audiencia exacta y la plantilla enviada.</span></div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- Validación ---------- */
  function validar() {
    st.errores = {};
    if (st.paso === 1 && !st.segmentoId) st.errores.segmento = 'Elige un segmento para continuar.';
    if (st.paso === 2) {
      if (!st.plantillaId) st.errores.plantilla = 'Elige una plantilla aprobada.';
      else {
        var p = plantilla();
        var falta = p.variables.filter(function (v) { return !st.mapeo[v.n]; });
        if (falta.length) st.errores.mapeo = 'Falta asignar ' + falta.length + ' variable(s) de la plantilla.';
      }
    }
    if (st.paso === 4 && !st.nombre.trim()) st.errores.nombre = 'Ponle un nombre a la campaña.';
    return Object.keys(st.errores).length === 0;
  }

  /* ---------- Render ---------- */
  function cuerpo() {
    if (st.paso === 1) return paso1();
    if (st.paso === 2) return paso2();
    if (st.paso === 3) return paso3();
    return paso4();
  }

  function pie() {
    var ultimo = st.paso === 4;
    return '<a class="btn" href="#/campanas">Cancelar</a>' +
      (st.paso > 1 ? '<button type="button" class="btn" data-atras>' + ui.icon('chevronLeft', 14) + 'Atrás</button>' : '') +
      '<span class="grow"></span>' +
      '<span class="small dim nowrap">Paso ' + st.paso + ' de 4</span>' +
      (ultimo
        ? '<button type="button" class="btn btn--primary" data-confirmar>' + ui.icon('send', 14) +
          (st.modo === 'ahora' ? 'Confirmar y enviar' : 'Confirmar y programar') + '</button>'
        : '<button type="button" class="btn btn--primary" data-siguiente>Continuar' + ui.icon('chevronRight', 14) + '</button>');
  }

  MAF.vistas.campanaNueva = {
    titulo: 'Crear campaña',
    subtitulo: function () { return PASOS[st.paso - 1].titulo + ' · ' + PASOS[st.paso - 1].desc; },
    acciones: function () { return '<a class="btn btn--sm" href="#/campanas">' + ui.icon('x', 14) + 'Salir del asistente</a>'; },
    render: function () {
      return '<section class="card">' + stepper() +
        '<div class="wizard__body" id="wizCuerpo">' + cuerpo() + '</div>' +
        '<div class="wizard__foot" id="wizPie">' + pie() + '</div></section>';
    },
    montar: function (root) { enlazar(root); },
    desmontar: function () { st = nuevoEstado(); }
  };

  /* Los listeners son delegados sobre root y se registran una sola vez en montar;
     repintar solo reemplaza el contenido. */
  function repintar(root) {
    root.innerHTML = MAF.vistas.campanaNueva.render();
    document.getElementById('pageSubtitle').textContent = PASOS[st.paso - 1].titulo + ' · ' + PASOS[st.paso - 1].desc;
    var cuerpoEl = root.querySelector('.wizard__body');
    if (cuerpoEl) cuerpoEl.scrollIntoView({ block: 'nearest' });
  }

  function enlazar(root) {
    /* Paso 1 */
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'segmento') { st.segmentoId = t.value; st.errores = {}; repintar(root); }
      if (t.id === 'excOptIn') { st.excluirSinOptIn = t.checked; actualizarConteo(root); }
      if (t.id === 'excCont') { st.excluirContactados = t.checked; actualizarConteo(root); }

      /* Paso 2 */
      if (t.id === 'selPlantilla') {
        st.plantillaId = t.value;
        st.mapeo = {};
        var p = plantilla();
        if (p) p.variables.forEach(function (v) { st.mapeo[v.n] = v.campo; }); // prellenado sugerido
        st.errores = {};
        repintar(root);
      }
      if (t.hasAttribute && t.hasAttribute('data-var')) {
        st.mapeo[t.getAttribute('data-var')] = t.value;
        repintar(root);
      }

      /* Paso 3 */
      if (t.name === 'modo') { st.modo = t.value; repintar(root); }
      if (t.id === 'fFecha') st.fecha = t.value;
      if (t.id === 'fHoraIni') st.horaIni = t.value;
      if (t.id === 'fHoraFin') st.horaFin = t.value;
      if (t.id === 'fVelocidad') { st.velocidad = t.value; repintar(root); }
      if (t.id === 'fLimite') st.siLimite = t.value;
    });

    root.addEventListener('input', function (e) {
      if (e.target.id === 'fNombre') st.nombre = e.target.value;
    });

    root.addEventListener('click', function (e) {
      var ir = e.target.closest('[data-ir]');
      if (ir) { st.paso = parseInt(ir.getAttribute('data-ir'), 10); st.errores = {}; repintar(root); return; }

      if (e.target.closest('[data-atras]')) { st.paso--; st.errores = {}; repintar(root); return; }

      if (e.target.closest('[data-siguiente]')) {
        if (!validar()) { repintar(root); return; }
        st.paso++;
        repintar(root);
        return;
      }

      if (e.target.closest('[data-confirmar]')) {
        if (!validar()) { repintar(root); return; }
        confirmar();
      }
    });
  }

  function actualizarConteo(root) {
    var n = root.querySelector('#conteoPaso1');
    if (n) n.textContent = ui.fmtInt(audienciaFinal());
  }

  function confirmar() {
    var btn = document.querySelector('[data-confirmar]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Procesando…';

    setTimeout(function () {
      var n = audienciaFinal(), costo = costoEstimado();
      ui.toast(
        st.modo === 'ahora' ? 'Campaña en curso' : 'Campaña programada',
        '«' + st.nombre + '» · ' + ui.fmtInt(n) + ' contactos · ' + ui.fmtUSD(costo) + ' estimados.',
        'ok'
      );
      location.hash = '#/campanas';
    }, 900);
  }
})();
