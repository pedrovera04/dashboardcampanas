/* ===========================================================
   MAF · Vista 1 · Dashboard
   Puerto directo de legacy-static/js/views/dashboard.js.
   =========================================================== */
import { Component, OnInit, ElementRef, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

let cargado = false; // la primera visita muestra el estado de carga

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: '<div (click)="onClick($event)" [innerHTML]="html"></div>'
})
export class DashboardComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private el = inject(ElementRef);

  html: SafeHtml = '';

  ngOnInit() {
    this.chrome.set('Dashboard', 'Septiembre 2026 · datos al 15 de septiembre', this.acciones());
    this.repintar();

    if (!cargado) {
      setTimeout(() => {
        cargado = true;
        this.repintar();
      }, 650);
    }
  }

  private acciones() {
    var ui = this.ui;
    return '<button type="button" class="btn btn--sm" data-global="salud">' +
      ui.icon('shield', 14) + '<span class="hide-sm">Salud de la cuenta</span></button>' +
      '<a class="btn btn--sm btn--primary" href="#/campanas/nueva">' + ui.icon('plus', 14) + 'Nueva campaña</a>';
  }

  private repintar() {
    this.html = this.sanitizer.bypassSecurityTrustHtml(this.render());
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    if (target.closest('[data-accion="salud"]')) this.ui.mostrarSalud();
  }

  private render(): string {
    var ui = this.ui;
    if (!cargado) {
      return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' + ui.skeletonKpis(5) + '</div>' +
        '<div class="grid grid--main-aside">' +
          '<div class="card"><div class="card__body">' + ui.skeletonTabla(5, 4) + '</div></div>' +
          '<div class="card"><div class="card__body">' + ui.skeletonTabla(4, 2) + '</div></div>' +
        '</div>';
    }
    return this.contenido();
  }

  private contenido(): string {
    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' + this.kpis() + '</div>' +
      '<div class="grid grid--main-aside" style="margin-bottom:var(--sp-4)">' +
        this.tarjetaCampanas() + this.tarjetaSalud() +
      '</div>' +
      '<div class="grid grid--main-aside">' +
        this.tarjetaActividad() + this.tarjetaCategorias() +
      '</div>';
  }

  private kpis(): string {
    var ui = this.ui, k = this.d.kpis;
    var cats = [
      { label: 'Marketing', valor: k.enviadosPorCategoria.marketing, color: ui.COLORES_CAT.marketing },
      { label: 'Utility', valor: k.enviadosPorCategoria.utility, color: ui.COLORES_CAT.utility },
      { label: 'Authentication', valor: k.enviadosPorCategoria.authentication, color: ui.COLORES_CAT.authentication }
    ];

    return '' +
      '<div class="kpi">' +
        '<span class="kpi__label">' + ui.icon('send', 14) + 'Mensajes enviados</span>' +
        '<span class="kpi__value">' + ui.fmtInt(k.totalEnviados) + '</span>' +
        ui.barraApilada(cats) +
        '<span class="kpi__foot">' + ui.delta(k.deltaEnviados, 'vs. mes anterior') + '</span>' +
      '</div>' +

      '<div class="kpi">' +
        '<span class="kpi__label">' + ui.icon('money', 14) + 'Costo Meta acumulado</span>' +
        '<span class="kpi__value">' + ui.fmtUSD(k.costos.total) + '</span>' +
        '<span class="kpi__foot">' + ui.delta(k.deltaCosto, '· proyección mes ' + ui.fmtUSD(k.proyeccionMes)) + '</span>' +
      '</div>' +

      '<div class="kpi">' +
        '<span class="kpi__label">' + ui.icon('inbox', 14) + 'Tasa de respuesta</span>' +
        '<span class="kpi__value">' + ui.fmtPct(k.tasaRespuesta) + '</span>' +
        '<span class="kpi__foot">' + ui.delta(k.tasaRespuesta - k.tasaRespuestaPrev, 'sobre entregados') + '</span>' +
      '</div>' +

      '<div class="kpi">' +
        '<span class="kpi__label">' + ui.icon('target', 14) + 'Leads generados</span>' +
        '<span class="kpi__value">' + ui.fmtInt(k.leads) + '</span>' +
        '<span class="kpi__foot">Costo por lead ' + ui.fmtUSD(k.costoPorLead) + '</span>' +
      '</div>' +

      '<div class="kpi">' +
        '<span class="kpi__label">' + ui.icon('money', 14) + 'Mora recuperada</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(k.moraRecuperada) + '</span>' +
        '<span class="kpi__foot wrap">' + ui.delta((k.moraRecuperada - k.moraRecuperadaPrev) / k.moraRecuperadaPrev) +
          '<span class="dim">' + ui.fmtInt(k.contratosRegularizados) + ' contratos al día</span></span>' +
      '</div>';
  }

  private tarjetaCategorias(): string {
    var ui = this.ui, d = this.d, k = d.kpis;
    var filas = [
      { cat: 'marketing', n: k.enviadosPorCategoria.marketing, costo: k.costos.marketing,
        nota: 'Límite de frecuencia: 1 cada 30 días por contacto' },
      { cat: 'utility', n: k.enviadosPorCategoria.utility, costo: k.costos.utility,
        nota: 'Solo transaccional sobre un contrato vigente' },
      { cat: 'authentication', n: k.enviadosPorCategoria.authentication, costo: k.costos.authentication,
        nota: 'Códigos de verificación del portal' }
    ];

    return '<section class="card">' +
      '<div class="card__head"><h2>Mensajes y costo por categoría</h2>' +
        '<p>Septiembre 2026, del 1 al 15. El precio lo define Meta según la categoría de la plantilla.</p></div>' +
      '<div class="card__body">' +
        '<ul class="metric-list">' +
          filas.map(function (f) {
            return '<li>' +
              '<span style="width:10px;height:10px;border-radius:2px;flex:none;background:' + (ui.COLORES_CAT as any)[f.cat] + '"></span>' +
              '<span class="grow"><span class="strong">' + d.labels.categoria[f.cat] + '</span>' +
                '<br><span class="small dim">' + ui.esc(f.nota) + '</span></span>' +
              '<span class="val">' + ui.fmtInt(f.n) + '<br>' +
                '<span class="small muted" style="font-weight:400">' + ui.fmtUSD(f.costo) + '</span></span>' +
              '</li>';
          }).join('') +
        '</ul>' +
      '</div>' +
      '<div class="card__foot">' +
        '<span class="small muted">Precio unitario Chile: marketing ' + ui.fmtUSDUnit(d.precios.marketing) +
        ' · utility ' + ui.fmtUSDUnit(d.precios.utility) + ' · authentication ' + ui.fmtUSDUnit(d.precios.authentication) + '</span>' +
      '</div>' +
    '</section>';
  }

  private tarjetaSalud(): string {
    var ui = this.ui, d = this.d, c = d.cuenta;
    return '<section class="card">' +
      '<div class="card__head"><h2>Salud de la cuenta</h2>' +
        '<button type="button" class="btn btn--sm right" data-accion="salud">Ver detalle</button></div>' +
      '<div class="card__body">' +
        '<div class="health">' +
          '<div class="health__row"><span class="lbl">Número</span>' +
            '<span class="val mono">' + c.numero + '</span></div>' +
          '<div class="health__row"><span class="lbl">Quality rating</span>' +
            '<span class="val">' + ui.badge('Alta', 'ok') + '</span></div>' +
          '<div class="health__row"><span class="lbl">Tier de mensajería</span>' +
            '<span class="val">' + c.tier + ' / 24 h</span></div>' +
          '<div class="tier-scale" role="img" aria-label="Tier 3 de 4">' +
            '<span class="on"></span><span class="on"></span><span class="on"></span><span></span></div>' +
          '<div>' +
            '<div class="health__row" style="margin-bottom:var(--sp-2)">' +
              '<span class="lbl">Uso del límite diario</span>' +
              '<span class="val tnum">' + ui.fmtInt(c.enviadas24h) + ' / ' + ui.fmtInt(c.limiteDiario) + '</span></div>' +
            ui.barra(c.enviadas24h / c.limiteDiario, 'ok') +
          '</div>' +
          '<div class="health__row"><span class="lbl">Entregabilidad del mes</span>' +
            '<span class="val tnum">' + ui.fmtPct(d.kpis.entregabilidad) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  private tarjetaActividad(): string {
    var ui = this.ui, d = this.d;
    return '<section class="card">' +
      '<div class="card__head"><h2>Actividad reciente</h2></div>' +
      '<div class="card__body">' +
        '<ul class="timeline">' +
          d.actividad.map(function (a: any) {
            return '<li>' +
              '<span class="timeline__dot timeline__dot--' + a.color + '">' + ui.icon(a.icono, 14) + '</span>' +
              '<span class="timeline__txt grow">' + ui.esc(a.texto) +
                '<small>' + ui.esc(a.detalle) + ' · ' + ui.fmtRelativo(a.t) + '</small></span>' +
              '</li>';
          }).join('') +
        '</ul>' +
      '</div>' +
    '</section>';
  }

  private tarjetaCampanas(): string {
    var ui = this.ui, d = this.d;
    var activas = d.campanas.filter(function (c: any) { return c.estado === 'en_curso' || c.estado === 'programada'; });
    return '<section class="card">' +
      '<div class="card__head"><h2>Campañas activas y programadas</h2>' +
        '<a class="btn btn--sm right" href="#/campanas">Ver todas</a></div>' +
      '<div class="card__body card__body--flush">' +
        ui.tablaWrap('<table class="data"><caption class="sr-only">Campañas en curso o programadas</caption>' +
          '<thead><tr><th scope="col">Campaña</th><th scope="col">Categoría</th><th scope="col">Estado</th>' +
          '<th scope="col" class="num">Audiencia</th><th scope="col" class="num">Enviados</th>' +
          '<th scope="col" class="num">Costo</th></tr></thead><tbody>' +
          activas.map(function (c: any) {
            return '<tr><td><span class="cell-main">' + ui.esc(c.nombre) + '</span>' +
              '<br><span class="cell-sub">' + ui.esc(c.segmento) + '</span></td>' +
              '<td>' + ui.catTag(c.categoria) + '</td>' +
              '<td>' + ui.badgeCampana(c.estado) + '</td>' +
              '<td class="num">' + ui.fmtInt(c.audiencia) + '</td>' +
              '<td class="num">' + (c.enviados ? ui.fmtInt(c.enviados) : '<span class="dim">—</span>') + '</td>' +
              '<td class="num">' + ui.fmtUSD(c.costo) + '</td></tr>';
          }).join('') +
        '</tbody></table>') +
      '</div>' +
    '</section>';
  }
}
