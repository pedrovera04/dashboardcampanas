/* ===========================================================
   MAF · Vista 2 · Campañas
   Puerto directo de legacy-static/js/views/campaigns.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

let filtro = { texto: '', estado: '', categoria: '' };

@Component({
  selector: 'app-campaigns',
  standalone: true,
  template: '<div (click)="onClick($event)" (keydown)="onKeydown($event)" (input)="onInput($event)" (change)="onChange($event)" [innerHTML]="html"></div>'
})
export class CampaignsComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);

  html: SafeHtml = '';
  private buscarDeb: (...a: any[]) => void;

  constructor() {
    this.buscarDeb = this.ui.deb(() => {
      var input = this.elRef.nativeElement.querySelector('#fCampBuscar');
      filtro.texto = input ? input.value.trim() : '';
      this.repintarTabla();
    }, 180);
  }

  ngOnInit() {
    var ui = this.ui;
    this.chrome.set('Campañas', 'Envíos masivos sobre segmentos de la cartera',
      '<button type="button" class="btn btn--sm" data-global="exportar">' +
        ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>' +
        '<a class="btn btn--sm btn--primary" href="#/campanas/nueva">' + ui.icon('plus', 14) + 'Crear campaña</a>');
    this.repintar();
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }

  private repintarTabla() {
    var host = this.elRef.nativeElement;
    var t = host.querySelector('#campTabla');
    var r = host.querySelector('#campResumen');
    if (t) t.innerHTML = this.tabla();
    if (r) r.innerHTML = this.resumen();
  }

  private filtrar(): any[] {
    var d = this.d;
    return d.campanas.filter(function (c: any) {
      if (filtro.estado && c.estado !== filtro.estado) return false;
      if (filtro.categoria && c.categoria !== filtro.categoria) return false;
      if (filtro.texto) {
        var t = filtro.texto.toLowerCase();
        if ((c.nombre + ' ' + c.segmento + ' ' + c.plantilla).toLowerCase().indexOf(t) === -1) return false;
      }
      return true;
    });
  }

  private fila(c: any): string {
    var ui = this.ui;
    var sinDatos = '<span class="dim">—</span>';
    return '<tr class="is-clickable" tabindex="0" data-campana="' + c.id + '">' +
      '<td><span class="cell-main">' + ui.esc(c.nombre) + '</span>' +
        (c.alerta ? ' ' + ui.icon('alert', 13) : '') +
        '<br><span class="cell-sub">' + (c.inicio ? ui.fmtFecha(c.inicio) : 'Sin programar') +
        ' · ' + ui.esc(c.autor) + '</span></td>' +
      '<td>' + ui.badgeCampana(c.estado) + '</td>' +
      '<td><span class="cell-main">' + ui.esc(c.segmento) + '</span>' +
        '<br><span class="cell-sub tnum">' + ui.fmtInt(c.audiencia) + ' contactos</span></td>' +
      '<td><span class="mono small">' + ui.esc(c.plantilla) + '</span><br>' + ui.catTag(c.categoria) + '</td>' +
      '<td class="num">' + (c.enviados ? ui.fmtInt(c.enviados) : sinDatos) + '</td>' +
      '<td class="num">' + (c.entregados ? ui.fmtInt(c.entregados) : sinDatos) + '</td>' +
      '<td class="num">' + (c.leidos ? ui.fmtInt(c.leidos) : sinDatos) + '</td>' +
      '<td class="num">' + (c.respondidos ? ui.fmtInt(c.respondidos) : sinDatos) + '</td>' +
      '<td class="num">' + (c.costo ? ui.fmtUSD(c.costo) : sinDatos) + '</td>' +
      '</tr>';
  }

  private tabla(): string {
    var ui = this.ui, d = this.d;
    var lista = this.filtrar();
    if (!lista.length) {
      return '<div class="card__body">' + ui.estadoVacio({
        icono: 'search',
        titulo: 'Ninguna campaña coincide con el filtro',
        texto: 'Prueba con otro estado o categoría, o limpia la búsqueda para ver las ' +
               d.campanas.length + ' campañas del período.',
        accion: 'limpiar', accionTexto: 'Limpiar filtros'
      }) + '</div>';
    }
    return ui.tablaWrap('<table class="data" style="min-width:980px">' +
      '<caption class="sr-only">Listado de campañas</caption><thead><tr>' +
      '<th scope="col">Campaña</th><th scope="col">Estado</th><th scope="col">Audiencia</th>' +
      '<th scope="col">Plantilla</th><th scope="col" class="num">Enviados</th>' +
      '<th scope="col" class="num">Entregados</th><th scope="col" class="num">Leídos</th>' +
      '<th scope="col" class="num">Respondidos</th><th scope="col" class="num">Costo</th>' +
      '</tr></thead><tbody>' + lista.map((c) => this.fila(c)).join('') + '</tbody></table>');
  }

  private resumen(): string {
    var ui = this.ui, d = this.d;
    var lista = this.filtrar();
    var env = lista.reduce(function (a, c: any) { return a + c.enviados; }, 0);
    var cos = lista.reduce(function (a, c: any) { return a + c.costo; }, 0);
    return '<span class="small muted">' + lista.length + ' de ' + d.campanas.length + ' campañas · ' +
      ui.fmtInt(env) + ' mensajes enviados · ' + ui.fmtUSD(cos) + ' de costo Meta</span>';
  }

  private detalle(c: any) {
    var ui = this.ui, d = this.d;
    var embudo = [
      { etapa: 'Audiencia', n: c.audiencia },
      { etapa: 'Enviados', n: c.enviados },
      { etapa: 'Entregados', n: c.entregados },
      { etapa: 'Leídos', n: c.leidos },
      { etapa: 'Respondidos', n: c.respondidos }
    ];
    var base = c.audiencia || 1;

    ui.abrirModal({
      titulo: c.nombre,
      sub: d.labels.estadoCampana[c.estado] + ' · creada por ' + c.autor,
      ancho: 'wide',
      cuerpo:
        (c.alerta ? '<div class="callout callout--warn" style="margin-bottom:var(--sp-4)">' + ui.icon('alert') +
          '<span>' + ui.esc(c.alerta) + '</span></div>' : '') +
        '<div class="grid grid--2" style="margin-bottom:var(--sp-5)">' +
          '<div><h3 style="margin-bottom:var(--sp-3)">Configuración</h3><dl class="dl">' +
            '<dt>Segmento</dt><dd>' + ui.esc(c.segmento) + '</dd>' +
            '<dt>Plantilla</dt><dd class="mono">' + ui.esc(c.plantilla) + '</dd>' +
            '<dt>Categoría</dt><dd>' + ui.catTag(c.categoria) + '</dd>' +
            '<dt>Inicio</dt><dd>' + (c.inicio ? ui.fmtFechaHora(c.inicio) : 'Sin programar') + '</dd>' +
            '<dt>Término</dt><dd>' + (c.fin ? ui.fmtFechaHora(c.fin) : c.estado === 'en_curso' ? 'En curso' : '—') + '</dd>' +
            '<dt>Costo unitario</dt><dd>' + ui.fmtUSDUnit(d.precios[c.categoria]) + '</dd>' +
            '<dt>Costo total</dt><dd>' + ui.fmtUSD(c.costo) + '</dd>' +
          '</dl></div>' +
          '<div><h3 style="margin-bottom:var(--sp-3)">Embudo de entrega</h3><div class="funnel">' +
            embudo.map(function (e) {
              return '<div class="funnel__step"><div class="funnel__top">' +
                '<span>' + e.etapa + '</span>' +
                '<span class="n">' + ui.fmtInt(e.n) + '</span>' +
                '<span class="p">' + ui.fmtPct(e.n / base, 0) + '</span></div>' +
                ui.barra(e.n / base) + '</div>';
            }).join('') +
          '</div></div>' +
        '</div>' +
        (c.leads ? '<div class="callout callout--ok">' + ui.icon('target') +
          '<span><strong>' + ui.fmtInt(c.leads) + ' leads calificados</strong> derivados a ejecutivos comerciales. ' +
          'Costo por lead ' + ui.fmtUSD(c.costo / c.leads) + '.</span></div>' : '') +
        (c.recuperado ? '<div class="callout callout--ok">' + ui.icon('money') +
          '<span><strong>' + ui.fmtCLP(c.recuperado) + ' recuperados</strong> en pagos atribuidos a esta campaña.</span></div>' : '') +
        (c.estado === 'borrador' ? '<div class="callout">' + ui.icon('info') +
          '<span>Esta campaña todavía no se envía. Falta definir la ventana horaria y confirmar el presupuesto.</span></div>' : ''),
      pie:
        '<button type="button" class="btn" data-cerrar>Cerrar</button>' +
        (c.estado === 'en_curso'
          ? '<button type="button" class="btn btn--danger" data-pausar>' + ui.icon('pause', 14) + 'Pausar envío</button>'
          : c.estado === 'borrador'
            ? '<a class="btn btn--primary" href="#/campanas/nueva">' + ui.icon('edit', 14) + 'Continuar edición</a>'
            : '<button type="button" class="btn" data-duplicar>' + ui.icon('copy', 14) + 'Duplicar campaña</button>'),
      alMontar: function (modal: HTMLElement) {
        var p = modal.querySelector('[data-pausar]');
        if (p) p.addEventListener('click', function () {
          ui.cerrarModal();
          ui.toast('Campaña pausada', c.nombre + ' dejó de enviar. Los mensajes en cola se descartan.', 'warn');
        });
        var dup = modal.querySelector('[data-duplicar]');
        if (dup) dup.addEventListener('click', function () {
          ui.cerrarModal();
          ui.toast('Campaña duplicada', 'Se creó un borrador con la misma configuración.', 'ok');
        });
      }
    });
  }

  private render(): string {
    var ui = this.ui;
    return '<section class="card">' +
      '<div class="toolbar">' +
        '<div class="field grow" style="gap:var(--sp-1)">' +
          '<label class="sr-only" for="fCampBuscar">Buscar campaña</label>' +
          '<input class="input input--search" id="fCampBuscar" type="search" placeholder="Buscar por nombre, segmento o plantilla" value="' + ui.esc(filtro.texto) + '">' +
        '</div>' +
        '<div class="field" style="gap:var(--sp-1)">' +
          '<label class="sr-only" for="fCampEstado">Filtrar por estado</label>' +
          '<select class="select" id="fCampEstado">' +
            '<option value="">Todos los estados</option>' +
            Object.keys(this.d.labels.estadoCampana).map((k) => {
              return '<option value="' + k + '"' + (filtro.estado === k ? ' selected' : '') + '>' +
                this.d.labels.estadoCampana[k] + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="field" style="gap:var(--sp-1)">' +
          '<label class="sr-only" for="fCampCat">Filtrar por categoría</label>' +
          '<select class="select" id="fCampCat">' +
            '<option value="">Todas las categorías</option>' +
            '<option value="marketing"' + (filtro.categoria === 'marketing' ? ' selected' : '') + '>Marketing</option>' +
            '<option value="utility"' + (filtro.categoria === 'utility' ? ' selected' : '') + '>Utility</option>' +
            '<option value="authentication"' + (filtro.categoria === 'authentication' ? ' selected' : '') + '>Authentication</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div id="campTabla">' + this.tabla() + '</div>' +
      '<div class="card__foot" id="campResumen">' + this.resumen() + '</div>' +
    '</section>';
  }

  onInput(e: Event) {
    var t = e.target as HTMLElement;
    if (t.id === 'fCampBuscar') this.buscarDeb();
  }

  onChange(e: Event) {
    var t = e.target as HTMLSelectElement;
    if (t.id === 'fCampEstado') { filtro.estado = t.value; this.repintarTabla(); }
    if (t.id === 'fCampCat') { filtro.categoria = t.value; this.repintarTabla(); }
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    if (target.closest('[data-accion="limpiar"]')) {
      filtro = { texto: '', estado: '', categoria: '' };
      var host = this.elRef.nativeElement;
      var b = host.querySelector('#fCampBuscar'); if (b) b.value = '';
      var s1 = host.querySelector('#fCampEstado'); if (s1) s1.value = '';
      var s2 = host.querySelector('#fCampCat'); if (s2) s2.value = '';
      this.repintarTabla();
      return;
    }
    var tr = target.closest('[data-campana]');
    if (tr) this.abrir(tr.getAttribute('data-campana'));
  }

  onKeydown(e: KeyboardEvent) {
    var target = e.target as HTMLElement;
    var tr = target.closest('[data-campana]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.abrir(tr.getAttribute('data-campana'));
    }
  }

  private abrir(id: string | null) {
    var c = this.d.campanas.filter(function (x: any) { return x.id === id; })[0];
    if (c) this.detalle(c);
  }
}
