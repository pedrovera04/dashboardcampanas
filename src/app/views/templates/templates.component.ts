/* ===========================================================
   MAF · Vista 5 · Biblioteca de plantillas
   Puerto directo de legacy-static/js/views/templates.js.
   =========================================================== */
import { Component, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

let st: any = { editando: null, filtro: '', borrador: null };

function clonar(p: any) { return JSON.parse(JSON.stringify(p)); }

@Component({
  selector: 'app-templates',
  standalone: true,
  template: '<div (click)="onClick($event)" (input)="onInput($event)" (change)="onChange($event)" [innerHTML]="html"></div>'
})
export class TemplatesComponent implements OnInit, OnDestroy {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);

  html: SafeHtml = '';
  private buscarDeb: (...a: any[]) => void;

  constructor() {
    this.buscarDeb = this.ui.deb(() => {
      var b = this.elRef.nativeElement.querySelector('#tplBuscar');
      st.filtro = b ? b.value.trim() : '';
      var l = this.elRef.nativeElement.querySelector('#tplLista');
      if (l) l.innerHTML = this.lista();
    }, 180);
  }

  ngOnInit() {
    this.chrome.set('Biblioteca de plantillas', 'Mensajes aprobados por Meta, con su categoría y estado',
      '<button type="button" class="btn btn--sm btn--primary" data-global="nueva-plantilla">' +
        this.ui.icon('plus', 14) + 'Nueva plantilla</button>',
      (a) => { if (a === 'nueva-plantilla') this.modalNuevaPlantilla(); });
    this.repintar();
  }

  ngOnDestroy() {
    st.editando = null;
    st.borrador = null;
  }

  private lista(): string {
    var ui = this.ui, d = this.d;
    var texto = st.filtro.toLowerCase();
    var ps = d.plantillas.filter(function (p: any) {
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
      ps.map(function (p: any) {
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

  private variablesDe(body: string): string[] {
    var vs: string[] = [], m, re = /\{\{(\d+)\}\}/g;
    while ((m = re.exec(body)) !== null) if (vs.indexOf(m[1]) === -1) vs.push(m[1]);
    return vs;
  }

  private burbuja(p: any): string {
    var ui = this.ui;
    var cuerpo = ui.esc(p.body)
      .replace(/\{\{(\d+)\}\}/g, function (m: string, n: string) {
        var v = (p.variables || []).filter(function (x: any) { return String(x.n) === n; })[0];
        return '<span class="var-token">' + ui.esc(v ? v.ejemplo : m) + '</span>';
      })
      .replace(/\n/g, '<br>');

    return '<div class="bubble bubble--out">' +
      (p.header && p.header.tipo === 'texto' && p.header.valor
        ? '<div class="bubble__header">' + ui.esc(p.header.valor) + '</div>' : '') +
      '<div>' + cuerpo + '</div>' +
      (p.footer ? '<div class="bubble__footer">' + ui.esc(p.footer) + '</div>' : '') +
      '<div class="bubble__meta">' + ui.fmtHora(this.d.HOY) + ui.icon('checks', 14) + '</div>' +
      ((p.botones || []).length
        ? '<div class="bubble__btns">' + p.botones.map(function (b: any) {
            return '<button type="button" tabindex="-1">' +
              (b.tipo === 'url' ? ui.icon('external', 13) : b.tipo === 'copy_code' ? ui.icon('copy', 13) : ui.icon('inbox', 13)) +
              ui.esc(b.texto) + '</button>';
          }).join('') + '</div>' : '') +
      '</div>';
  }

  private telefono(p: any): string {
    var ui = this.ui;
    return '<div class="phone">' +
      '<div class="phone__bar"><span class="phone__avatar" aria-hidden="true">' + ui.logo(17) + '</span>' +
        '<span><strong>MAF Chile</strong><small>en línea</small></span></div>' +
      '<div class="phone__screen">' +
        '<div class="day-sep">hoy</div>' + this.burbuja(p) +
      '</div></div>';
  }

  private editor(): string {
    var ui = this.ui, d = this.d;
    var p = st.borrador;
    var vars = this.variablesDe(p.body);

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
                  var v = (p.variables || []).filter(function (x: any) { return String(x.n) === n; })[0];
                  return '<li><span class="var-token">{{' + n + '}}</span>' +
                    '<span class="grow">' + ui.esc(v ? v.descripcion : 'Sin descripción') + '</span>' +
                    '<span class="val small" style="font-weight:400">Ejemplo: ' + ui.esc(v ? v.ejemplo : '—') + '</span></li>';
                }).join('') + '</ul>'
              : '<p class="small dim">Esta plantilla no usa variables.</p>') +

            '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Botones</h3>' +
            (p.botones.length
              ? '<div class="stack gap-2">' + p.botones.map(function (b: any, i: number) {
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
            '<div id="tplPreview">' + this.telefono(p) + '</div>' +
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

  private render(): string {
    var ui = this.ui, d = this.d;
    if (st.editando && st.borrador) return this.editor();
    return '<section class="card">' +
      '<div class="toolbar">' +
        '<div class="field grow" style="gap:var(--sp-1)">' +
          '<label class="sr-only" for="tplBuscar">Buscar plantilla</label>' +
          '<input class="input input--search" id="tplBuscar" type="search" placeholder="Buscar por nombre o contenido" value="' + ui.esc(st.filtro) + '">' +
        '</div>' +
        '<span class="small muted">' + d.plantillas.filter(function (p: any) { return p.estado === 'aprobada'; }).length +
          ' aprobadas · ' + d.plantillas.filter(function (p: any) { return p.estado !== 'aprobada'; }).length + ' con alguna restricción</span>' +
      '</div>' +
      '<div id="tplLista">' + this.lista() + '</div>' +
    '</section>';
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }
  private refrescarPreview() {
    var prev = this.elRef.nativeElement.querySelector('#tplPreview');
    if (prev) prev.innerHTML = this.telefono(st.borrador);
  }

  private modalNuevaPlantilla() {
    var ui = this.ui, d = this.d;
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
      alMontar: function (modal: HTMLElement) {
        modal.querySelector('[data-crear]')!.addEventListener('click', function () {
          ui.cerrarModal();
          ui.toast('Borrador creado', 'En el sistema real se abre el editor con la plantilla vacía.', 'ok');
        });
      }
    });
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var ui = this.ui, d = this.d;

    var ed = target.closest('[data-editar]');
    if (ed) {
      st.editando = ed.getAttribute('data-editar');
      st.borrador = clonar(d.plantillas.filter(function (p: any) { return p.id === st.editando; })[0]);
      this.repintar();
      return;
    }
    if (target.closest('[data-volver]')) {
      st.editando = null; st.borrador = null; this.repintar(); return;
    }
    if (target.closest('[data-btn-agregar]')) {
      st.borrador.botones.push({ tipo: 'quick_reply', texto: 'Nuevo botón' });
      this.repintar();
      return;
    }
    var q = target.closest('[data-btn-quitar]');
    if (q) {
      st.borrador.botones.splice(parseInt(q.getAttribute('data-btn-quitar')!, 10), 1);
      this.repintar();
      return;
    }
    if (target.closest('[data-enviar-revision]')) {
      ui.toast('Plantilla enviada a revisión', '«' + st.borrador.nombre + '» queda en estado «en revisión». Meta responde en 24 a 48 horas.', 'ok');
      st.editando = null; st.borrador = null;
      this.repintar();
      return;
    }
  }

  onInput(e: Event) {
    var t = e.target as any;
    if (t.id === 'tplBuscar') { this.buscarDeb(); return; }
    if (!st.borrador) return;
    if (t.id === 'tplHeader') { st.borrador.header = { tipo: t.value ? 'texto' : 'ninguno', valor: t.value }; this.refrescarPreview(); }
    if (t.id === 'tplBody') { st.borrador.body = t.value; this.refrescarPreview(); }
    if (t.id === 'tplFooter') { st.borrador.footer = t.value; this.refrescarPreview(); }
    if (t.id === 'tplNombre') st.borrador.nombre = t.value;
    if (t.hasAttribute('data-btn-txt')) {
      st.borrador.botones[parseInt(t.getAttribute('data-btn-txt'), 10)].texto = t.value;
      this.refrescarPreview();
    }
  }

  onChange(e: Event) {
    if (!st.borrador) return;
    var t = e.target as any;
    if (t.id === 'tplCat') { st.borrador.categoria = t.value; this.repintar(); }
    if (t.id === 'tplIdioma') st.borrador.idioma = t.value;
    if (t.hasAttribute('data-btn-tipo')) {
      st.borrador.botones[parseInt(t.getAttribute('data-btn-tipo'), 10)].tipo = t.value;
      this.refrescarPreview();
    }
  }
}
