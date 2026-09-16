/* ===========================================================
   MAF · Vista 5 · Biblioteca de plantillas
   =========================================================== */
window.MAF = window.MAF || {}; MAF.vistas = MAF.vistas || {};

(function () {
  'use strict';
  var ui = MAF.ui, d = MAF.data;

  var st = { editando: null, filtro: '', borrador: null };

  function clonar(p) { return JSON.parse(JSON.stringify(p)); }

  /* ---------- Listado ---------- */
  function lista() {
    var texto = st.filtro.toLowerCase();
    var ps = d.plantillas.filter(function (p) {
      return !texto || (p.nombre + ' ' + p.body).toLowerCase().indexOf(texto) !== -1;
    });

    if (!ps.length) {
      return '<div class="card__body">' + ui.estadoVacio({
        icono: 'search',
        titulo: 'No hay plantillas que coincidan',
        texto: 'Revisa la búsqueda. La biblioteca tiene ' + d.plantillas.length +
               ' plantillas entre aprobadas, en revisión, rechazadas y pausadas.'
      }) + '</div>';
    }

    return ui.tablaWrap('<table class="data" style="min-width:900px">' +
      '<caption class="sr-only">Plantillas registradas en Meta</caption><thead><tr>' +
      '<th scope="col">Plantilla</th><th scope="col">Categoría</th><th scope="col">Idioma</th>' +
      '<th scope="col">Estado</th><th scope="col">Quality</th>' +
      '<th scope="col" class="num">Usos</th><th scope="col">Actualizada</th><th scope="col"><span class="sr-only">Acciones</span></th>' +
      '</tr></thead><tbody>' +
      ps.map(function (p) {
        return '<tr>' +
          '<td><span class="cell-main mono">' + ui.esc(p.nombre) + '</span>' +
            '<br><span class="cell-sub">' + ui.esc(p.body.slice(0, 64).replace(/\n/g, ' ')) + '…</span></td>' +
          '<td>' + ui.catTag(p.categoria) + '</td>' +
          '<td class="mono small">' + p.idioma + '</td>' +
          '<td>' + ui.badgePlantilla(p.estado) +
            (p.motivoRechazo ? '<br><span class="cell-sub">' + (p.estado === 'rechazada' ? 'Ver motivo' : 'Pausada por MAF') + '</span>' : '') + '</td>' +
          '<td>' + ui.badgeQuality(p.quality) + '</td>' +
          '<td class="num">' + ui.fmtInt(p.usos) + '</td>' +
          '<td class="small">' + ui.fmtFecha(p.actualizada) + '</td>' +
          '<td><button type="button" class="btn btn--sm" data-editar="' + p.id + '">' +
            ui.icon('eye', 14) + 'Abrir</button></td>' +
        '</tr>';
      }).join('') + '</tbody></table>');
  }

  /* ---------- Vista previa ---------- */
  function variablesDe(body) {
    var vs = [], m, re = /\{\{(\d+)\}\}/g;
    while ((m = re.exec(body)) !== null) if (vs.indexOf(m[1]) === -1) vs.push(m[1]);
    return vs;
  }

  function burbuja(p) {
    var cuerpo = ui.esc(p.body)
      .replace(/\{\{(\d+)\}\}/g, function (m, n) {
        var v = (p.variables || []).filter(function (x) { return String(x.n) === n; })[0];
        return '<span class="var-token">' + ui.esc(v ? v.ejemplo : m) + '</span>';
      })
      .replace(/\n/g, '<br>');

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
          }).join('') + '</div>' : '') +
      '</div>';
  }

  function telefono(p) {
    return '<div class="phone">' +
      '<div class="phone__bar"><span class="phone__avatar" aria-hidden="true">' + ui.logo(17) + '</span>' +
        '<span><strong>MAF Chile</strong><small>en línea</small></span></div>' +
      '<div class="phone__screen">' +
        '<div class="day-sep">hoy</div>' + burbuja(p) +
      '</div></div>';
  }

  /* ---------- Editor ---------- */
  function editor() {
    var p = st.borrador;
    var vars = variablesDe(p.body);

    return '<section class="card">' +
      '<div class="card__head">' +
        '<button type="button" class="icon-btn" data-volver aria-label="Volver a la biblioteca">' + ui.icon('chevronLeft', 18) + '</button>' +
        '<div class="grow"><h2 class="mono">' + ui.esc(p.nombre) + '</h2>' +
          '<p>' + d.labels.categoria[p.categoria] + ' · ' + p.idioma + ' · ' + ui.fmtInt(p.usos) + ' envíos acumulados</p></div>' +
        ui.badgePlantilla(p.estado) + ui.badgeQuality(p.quality) +
      '</div>' +

      '<div class="card__body">' +
        (p.motivoRechazo
          ? '<div class="callout callout--' + (p.estado === 'rechazada' ? 'danger' : 'warn') + '" style="margin-bottom:var(--sp-5)">' +
            ui.icon('alert') + '<span><strong>' +
            (p.estado === 'rechazada' ? 'Rechazada por Meta. ' : 'Pausada. ') + '</strong>' +
            ui.esc(p.motivoRechazo) + '</span></div>'
          : '') +

        '<div class="tpl-grid">' +
          '<div>' +
            '<div class="row gap-3 wrap">' +
              '<div class="field grow" style="min-width:200px">' +
                '<label class="field__label" for="tplNombre">Nombre interno</label>' +
                '<input class="input mono" id="tplNombre" type="text" value="' + ui.esc(p.nombre) + '">' +
                '<p class="field__hint">Minúsculas y guiones bajos. Meta no permite cambiarlo una vez aprobada.</p>' +
              '</div>' +
              '<div class="field" style="min-width:160px">' +
                '<label class="field__label" for="tplCat">Categoría Meta</label>' +
                '<select class="select" id="tplCat">' +
                  ['marketing', 'utility', 'authentication'].map(function (c) {
                    return '<option value="' + c + '"' + (p.categoria === c ? ' selected' : '') + '>' +
                      d.labels.categoria[c] + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div class="field" style="min-width:130px">' +
                '<label class="field__label" for="tplIdioma">Idioma</label>' +
                '<select class="select" id="tplIdioma">' +
                  '<option value="es_CL"' + (p.idioma === 'es_CL' ? ' selected' : '') + '>Español (Chile)</option>' +
                  '<option value="es"' + (p.idioma === 'es' ? ' selected' : '') + '>Español</option>' +
                  '<option value="en_US">Inglés (EE. UU.)</option>' +
                '</select>' +
              '</div>' +
            '</div>' +

            '<div class="field" style="margin-top:var(--sp-5)">' +
              '<label class="field__label" for="tplHeader">Encabezado <span class="opt">(opcional, máx. 60 caracteres)</span></label>' +
              '<input class="input" id="tplHeader" type="text" maxlength="60" value="' + ui.esc(p.header.valor) + '">' +
            '</div>' +

            '<div class="field">' +
              '<label class="field__label" for="tplBody">Cuerpo del mensaje</label>' +
              '<textarea class="textarea" id="tplBody" rows="7" maxlength="1024" aria-describedby="tplBodyHint">' + ui.esc(p.body) + '</textarea>' +
              '<p class="field__hint" id="tplBodyHint">Usa <code>{{1}}</code>, <code>{{2}}</code>… para las variables. ' +
                '<span class="tnum">' + p.body.length + '/1024</span> caracteres.</p>' +
            '</div>' +

            '<div class="field">' +
              '<label class="field__label" for="tplFooter">Pie <span class="opt">(opcional, máx. 60 caracteres)</span></label>' +
              '<input class="input" id="tplFooter" type="text" maxlength="60" value="' + ui.esc(p.footer) + '">' +
              '<p class="field__hint">En plantillas de marketing conviene dejar la instrucción de baja.</p>' +
            '</div>' +

            '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Variables detectadas</h3>' +
            (vars.length
              ? '<ul class="metric-list">' + vars.map(function (n) {
                  var v = (p.variables || []).filter(function (x) { return String(x.n) === n; })[0];
                  return '<li><span class="var-token">{{' + n + '}}</span>' +
                    '<span class="grow">' + ui.esc(v ? v.descripcion : 'Sin descripción') + '</span>' +
                    '<span class="val small" style="font-weight:400">Ejemplo: ' + ui.esc(v ? v.ejemplo : '—') + '</span></li>';
                }).join('') + '</ul>'
              : '<p class="small dim">Esta plantilla no usa variables.</p>') +

            '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Botones</h3>' +
            (p.botones.length
              ? '<div class="stack gap-2">' + p.botones.map(function (b, i) {
                  return '<div class="row gap-2">' +
                    '<label class="sr-only" for="btnTipo' + i + '">Tipo del botón ' + (i + 1) + '</label>' +
                    '<select class="select" id="btnTipo' + i + '" data-btn-tipo="' + i + '" style="max-width:170px">' +
                      '<option value="quick_reply"' + (b.tipo === 'quick_reply' ? ' selected' : '') + '>Respuesta rápida</option>' +
                      '<option value="url"' + (b.tipo === 'url' ? ' selected' : '') + '>Enlace</option>' +
                      '<option value="copy_code"' + (b.tipo === 'copy_code' ? ' selected' : '') + '>Copiar código</option>' +
                    '</select>' +
                    '<label class="sr-only" for="btnTxt' + i + '">Texto del botón ' + (i + 1) + '</label>' +
                    '<input class="input grow" id="btnTxt' + i + '" data-btn-txt="' + i + '" type="text" maxlength="25" value="' + ui.esc(b.texto) + '">' +
                    '<button type="button" class="icon-btn" data-btn-quitar="' + i + '" aria-label="Quitar botón ' + (i + 1) + '">' +
                      ui.icon('trash', 16) + '</button>' +
                    '</div>';
                }).join('') + '</div>'
              : '<p class="small dim">Sin botones.</p>') +
            (p.botones.length < 3
              ? '<button type="button" class="btn btn--sm" style="margin-top:var(--sp-3)" data-btn-agregar>' +
                ui.icon('plus', 14) + 'Agregar botón</button>'
              : '<p class="small dim" style="margin-top:var(--sp-2)">Máximo 3 botones por plantilla.</p>') +
          '</div>' +

          '<div>' +
            '<h3 style="margin-bottom:var(--sp-3)">Previsualización</h3>' +
            '<div id="tplPreview">' + telefono(p) + '</div>' +
            '<div class="callout" style="margin-top:var(--sp-4)">' + ui.icon('info') +
              '<span class="small">Así se ve en el teléfono del cliente. Los valores en azul son los datos que se reemplazan al enviar.</span></div>' +
            '<dl class="dl" style="margin-top:var(--sp-4)">' +
              '<dt>Costo por envío</dt><dd>' + ui.fmtUSDUnit(d.precios[p.categoria]) + '</dd>' +
              '<dt>Última edición</dt><dd>' + ui.fmtFecha(p.actualizada) + '</dd>' +
              '<dt>Envíos acumulados</dt><dd>' + ui.fmtInt(p.usos) + '</dd>' +
            '</dl>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card__foot">' +
        '<span class="small muted grow">Cualquier cambio en el cuerpo obliga a un nuevo envío a revisión de Meta (24 a 48 h).</span>' +
        '<button type="button" class="btn" data-volver>Descartar</button>' +
        '<button type="button" class="btn btn--primary" data-enviar-revision>' +
          ui.icon('send', 14) + 'Guardar y enviar a revisión</button>' +
      '</div>' +
    '</section>';
  }

  /* ---------- Vista ---------- */
  MAF.vistas.plantillas = {
    titulo: 'Biblioteca de plantillas',
    subtitulo: 'Mensajes aprobados por Meta, con su categoría y estado',
    acciones: function () {
      return '<button type="button" class="btn btn--sm btn--primary" data-global="nueva-plantilla">' +
        ui.icon('plus', 14) + 'Nueva plantilla</button>';
    },
    render: function () {
      if (st.editando && st.borrador) return editor();
      return '<section class="card">' +
        '<div class="toolbar">' +
          '<div class="field grow" style="gap:var(--sp-1)">' +
            '<label class="sr-only" for="tplBuscar">Buscar plantilla</label>' +
            '<input class="input input--search" id="tplBuscar" type="search" placeholder="Buscar por nombre o contenido" value="' + ui.esc(st.filtro) + '">' +
          '</div>' +
          '<span class="small muted">' + d.plantillas.filter(function (p) { return p.estado === 'aprobada'; }).length +
            ' aprobadas · ' + d.plantillas.filter(function (p) { return p.estado !== 'aprobada'; }).length + ' con alguna restricción</span>' +
        '</div>' +
        '<div id="tplLista">' + lista() + '</div>' +
      '</section>';
    },
    montar: function (root) { enlazar(root); },
    onAccion: function (a) { if (a === 'nueva-plantilla') modalNuevaPlantilla(); },
    desmontar: function () { st.editando = null; st.borrador = null; }
  };

  function repintar(root) {
    root.innerHTML = MAF.vistas.plantillas.render();
    document.getElementById('topbarActions').innerHTML = MAF.vistas.plantillas.acciones();
    enlazarDirectos(root); // los delegados ya están sobre root desde montar
  }

  function refrescarPreview(root) {
    var prev = root.querySelector('#tplPreview');
    if (prev) prev.innerHTML = telefono(st.borrador);
  }

  /* Elementos que se reemplazan en cada repintado */
  function enlazarDirectos(root) {
    var buscar = root.querySelector('#tplBuscar');
    if (buscar) {
      buscar.addEventListener('input', ui.deb(function () {
        st.filtro = buscar.value.trim();
        var l = root.querySelector('#tplLista');
        if (l) l.innerHTML = lista();
      }, 180));
    }
  }

  /* Delegados sobre root: se registran una sola vez */
  function modalNuevaPlantilla() {
    ui.abrirModal({
      titulo: 'Nueva plantilla',
      sub: 'Antes de escribir, define la categoría: determina el precio y las reglas de uso.',
      cuerpo:
        '<div class="stack gap-3">' +
          '<label class="radio-card"><input type="radio" name="nuevaCat" value="marketing" checked>' +
            '<span class="radio-card__txt"><strong>Marketing · ' + ui.fmtUSDUnit(d.precios.marketing) + ' por envío</strong>' +
            '<small>Promociones, reactivación y renovación. Exige opt-in y respeta el límite de frecuencia.</small></span></label>' +
          '<label class="radio-card"><input type="radio" name="nuevaCat" value="utility">' +
            '<span class="radio-card__txt"><strong>Utility · ' + ui.fmtUSDUnit(d.precios.utility) + ' por envío</strong>' +
            '<small>Avisos sobre un contrato vigente: cuotas, pagos, cambios de estado. No puede tener contenido promocional.</small></span></label>' +
          '<label class="radio-card"><input type="radio" name="nuevaCat" value="authentication">' +
            '<span class="radio-card__txt"><strong>Authentication · ' + ui.fmtUSDUnit(d.precios.authentication) + ' por envío</strong>' +
            '<small>Solo códigos de un solo uso. Formato restringido por Meta.</small></span></label>' +
        '</div>' +
        '<div class="callout callout--warn" style="margin-top:var(--sp-4)">' + ui.icon('alert') +
          '<span>Meta reclasifica automáticamente las plantillas mal categorizadas. ' +
          'Una utility con contenido promocional se cobra como marketing.</span></div>',
      pie: '<button type="button" class="btn" data-cerrar>Cancelar</button>' +
           '<button type="button" class="btn btn--primary" data-crear>Continuar</button>',
      alMontar: function (modal) {
        modal.querySelector('[data-crear]').addEventListener('click', function () {
          ui.cerrarModal();
          ui.toast('Borrador creado', 'En el sistema real se abre el editor con la plantilla vacía.', 'ok');
        });
      }
    });
  }

  function enlazar(root) {
    enlazarDirectos(root);

    root.addEventListener('click', function (e) {
      var ed = e.target.closest('[data-editar]');
      if (ed) {
        st.editando = ed.getAttribute('data-editar');
        st.borrador = clonar(d.plantillas.filter(function (p) { return p.id === st.editando; })[0]);
        repintar(root);
        return;
      }
      if (e.target.closest('[data-volver]')) {
        st.editando = null; st.borrador = null; repintar(root); return;
      }
      if (e.target.closest('[data-btn-agregar]')) {
        st.borrador.botones.push({ tipo: 'quick_reply', texto: 'Nuevo botón' });
        repintar(root);
        return;
      }
      var q = e.target.closest('[data-btn-quitar]');
      if (q) {
        st.borrador.botones.splice(parseInt(q.getAttribute('data-btn-quitar'), 10), 1);
        repintar(root);
        return;
      }
      if (e.target.closest('[data-enviar-revision]')) {
        ui.toast('Plantilla enviada a revisión', '«' + st.borrador.nombre + '» queda en estado «en revisión». Meta responde en 24 a 48 horas.', 'ok');
        st.editando = null; st.borrador = null;
        repintar(root);
        return;
      }
    });

    root.addEventListener('input', function (e) {
      if (!st.borrador) return;
      var t = e.target;
      if (t.id === 'tplHeader') { st.borrador.header = { tipo: t.value ? 'texto' : 'ninguno', valor: t.value }; refrescarPreview(root); }
      if (t.id === 'tplBody') { st.borrador.body = t.value; refrescarPreview(root); }
      if (t.id === 'tplFooter') { st.borrador.footer = t.value; refrescarPreview(root); }
      if (t.id === 'tplNombre') st.borrador.nombre = t.value;
      if (t.hasAttribute('data-btn-txt')) {
        st.borrador.botones[parseInt(t.getAttribute('data-btn-txt'), 10)].texto = t.value;
        refrescarPreview(root);
      }
    });

    root.addEventListener('change', function (e) {
      if (!st.borrador) return;
      var t = e.target;
      if (t.id === 'tplCat') { st.borrador.categoria = t.value; repintar(root); }
      if (t.id === 'tplIdioma') st.borrador.idioma = t.value;
      if (t.hasAttribute('data-btn-tipo')) {
        st.borrador.botones[parseInt(t.getAttribute('data-btn-tipo'), 10)].tipo = t.value;
        refrescarPreview(root);
      }
    });
  }
})();
