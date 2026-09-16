/* ===========================================================
   MAF · Vista 10 · Reportes
   Puerto directo de legacy-static/js/views/reports.js, ampliado con
   Ingresos, Gastos (antes "Costos"), Usuarios nuevos, y el quiebre de
   cartera al día / mora temprana / mora antigua dentro de Cobranza.
   Los gráficos usan Chart.js sobre <canvas>, dibujados a mano después
   de cada repintado (el resto de la vista se renderiza como HTML).
   =========================================================== */
import { Component, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Chart, registerables } from 'chart.js';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

Chart.register(...registerables);
Chart.defaults.font.family = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#525f6d';
// Sin animación: Chart.js anima vía requestAnimationFrame, y ese bucle corría
// dentro de la zona de Angular y disparaba un ciclo de detección de cambios
// en cada frame sin parar nunca, saturando el hilo principal. Además de
// desactivar la animación, la creación de cada gráfico se hace fuera de la
// zona (ver crearGrafico) para que Chart.js nunca vuelva a interferir así.
Chart.defaults.animation = false;
Chart.defaults.animations = {} as any;

/* El panel de gastos falla la primera vez a propósito: la maqueta debe
   mostrar también cómo se ve un error recuperable. */
let st: any = { tab: 'comercial', costosIntento: 0, costosCargando: false };

const TABS = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'cobranza', label: 'Cobranza' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'usuarios', label: 'Usuarios' }
];

/* Misma paleta que ya usan los badges y ui.COLORES_CAT, para que los
   gráficos no introduzcan colores nuevos que no existan en el resto de
   la maqueta (ver src/styles/base.css y ui.service.ts). */
const PALETA = {
  accent: '#1a4fd6',
  ok: '#0b6b45',
  warn: '#8a5500',
  danger: '#b02418',
  marketing: '#8a3fb8',
  utility: '#1a4fd6',
  authentication: '#6e7885',
  grid: '#dce2e9'
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS: Record<string, string> = {
  ene: 'Enero', feb: 'Febrero', mar: 'Marzo', abr: 'Abril', may: 'Mayo', jun: 'Junio',
  jul: 'Julio', ago: 'Agosto', sep: 'Septiembre', oct: 'Octubre', nov: 'Noviembre', dic: 'Diciembre'
};

@Component({
  selector: 'app-reports',
  standalone: true,
  template: '<div (click)="onClick($event)" (keydown)="onKeydown($event)" [innerHTML]="html"></div>'
})
export class ReportsComponent implements OnInit, OnDestroy {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);
  private zone = inject(NgZone);

  html: SafeHtml = '';
  private charts: Record<string, Chart> = {};

  // Se guardan al construir cada panel para que el gráfico use exactamente
  // los mismos números que ya se ven en las tarjetas y tablas.
  private _comercial: any = null;
  private _cobranza: any = null;
  private _pagos: any = null;
  private _ingresos: any = null;
  private _gastosSerie: any = null;
  private _usuarios: any = null;

  ngOnInit() {
    this.chrome.set('Reportes', 'Resultados comerciales, de cobranza, ingresos, gastos y usuarios',
      '<button type="button" class="btn btn--sm" data-global="exportar">' +
        this.ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>');
    this.repintar();
  }

  ngOnDestroy() {
    Object.keys(this.charts).forEach((id) => this.destruirGrafico(id));
  }

  /* ---------- Utilidades de datos compartidas ---------- */
  private mesesRecientes(n: number): { mes: string; inicio: Date; fin: Date }[] {
    var hoy = this.d.HOY;
    // El generador de contactos nunca crea una fecha de consentimiento a menos
    // de 15 días de HOY (ver data.model.ts), así que el mes calendario en
    // curso siempre aparecería vacío. Se usa el último mes completo como
    // referencia en vez del mes parcial actual.
    var finUltimoMesCompleto = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var y = finUltimoMesCompleto.getFullYear(), m = finUltimoMesCompleto.getMonth() - 1 - i;
      var inicio = new Date(y, m, 1);
      var fin = new Date(y, m + 1, 1);
      out.push({ mes: MESES_CORTOS[((m % 12) + 12) % 12], inicio: inicio, fin: fin });
    }
    return out;
  }

  private datosPagos() {
    var clientes = this.d.contactos.filter((c: any) => c.tipo === 'cliente');
    var alDia = clientes.filter((c: any) => c.diasMora === 0);
    var temprana = clientes.filter((c: any) => c.diasMora > 0 && c.diasMora <= 30);
    var antigua = clientes.filter((c: any) => c.diasMora > 30);
    var suma = (arr: any[], k: string) => arr.reduce((a, c) => a + c[k], 0);
    return {
      total: clientes.length,
      alDia: { n: alDia.length, saldo: suma(alDia, 'saldoInsoluto') },
      temprana: { n: temprana.length, saldo: suma(temprana, 'saldoInsoluto') },
      antigua: { n: antigua.length, saldo: suma(antigua, 'saldoInsoluto') }
    };
  }

  private datosUsuariosNuevos() {
    var meses = this.mesesRecientes(6);
    var contactos = this.d.contactos;
    var series = meses.map((r) => {
      var enRango = contactos.filter((c: any) => c.consentimientoFecha >= r.inicio && c.consentimientoFecha < r.fin);
      var clientes = enRango.filter((c: any) => c.tipo === 'cliente').length;
      return { mes: r.mes, clientes: clientes, prospectos: enRango.length - clientes, total: enRango.length };
    });
    var delMes = series[series.length - 1];
    var mesAnterior = series[series.length - 2];
    var rangoActual = meses[meses.length - 1];
    var porSucursal: Record<string, number> = {};
    contactos
      .filter((c: any) => c.consentimientoFecha >= rangoActual.inicio && c.consentimientoFecha < rangoActual.fin)
      .forEach((c: any) => { porSucursal[c.sucursal] = (porSucursal[c.sucursal] || 0) + 1; });
    var sucursales = Object.keys(porSucursal)
      .map((k) => ({ sucursal: k, n: porSucursal[k] }))
      .sort((a, b) => b.n - a.n);
    return { series: series, delMes: delMes, mesAnterior: mesAnterior, sucursales: sucursales };
  }

  private datosIngresos() {
    var cuotasAlDia = this.d.contactos
      .filter((c: any) => c.tipo === 'cliente' && c.diasMora === 0)
      .reduce((a: number, c: any) => a + c.cuotaMensual, 0);
    var moraRecuperada = this.d.kpis.moraRecuperada;
    var carteraVigente = this.d.contactos
      .filter((c: any) => c.tipo === 'cliente')
      .reduce((a: number, c: any) => a + c.saldoInsoluto, 0);

    var factores = [0.58, 0.67, 0.78, 0.88, 0.95, 1];
    var meses = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
    var serie = meses.map((mes, i) => ({
      mes: mes,
      cuotas: Math.round(cuotasAlDia * factores[i]),
      mora: Math.round(moraRecuperada * factores[i])
    }));

    return {
      cuotasAlDia: cuotasAlDia,
      moraRecuperada: moraRecuperada,
      carteraVigente: carteraVigente,
      totalMes: cuotasAlDia + moraRecuperada,
      deltaMes: 0.062,
      serie: serie
    };
  }

  /* ---------- Comercial ---------- */
  private panelComercial(): string {
    var ui = this.ui, d = this.d;
    var r = d.reportes.comercial;
    this._comercial = r;
    var base = r.embudo[0].n || 1;
    var totalCosto = r.porJourney.reduce(function (a: number, f: any) { return a + f.costoUsd; }, 0);
    var totalLeads = r.porJourney.reduce(function (a: number, f: any) { return a + f.calificados; }, 0);
    var totalCierres = r.porJourney.reduce(function (a: number, f: any) { return a + f.cerrados; }, 0);

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
          r.porJourney.map(function (f: any) {
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
            '<td class="num cell-main">' + ui.fmtInt(r.porJourney.reduce(function (a: number, f: any) { return a + f.contactados; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(r.porJourney.reduce(function (a: number, f: any) { return a + f.respondieron; }, 0)) + '</td>' +
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
          '<p>Mensajes entregados en cada etapa</p></div>' +
        '<div class="card__body"><div class="chart-wrap">' +
          '<canvas id="chartEmbudo" role="img" aria-label="Embudo del mes: audiencia, entregados, leídos, respondieron y leads"></canvas>' +
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

  private dibujarComercial() {
    var ui = this.ui;
    var r = this._comercial;
    if (!r) return;
    this.crearGrafico('chartEmbudo', {
      type: 'bar',
      data: {
        labels: r.embudo.map((e: any) => e.etapa),
        datasets: [{ data: r.embudo.map((e: any) => e.n), backgroundColor: PALETA.accent, borderRadius: 4, maxBarThickness: 28 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => ' ' + ui.fmtInt(ctx.parsed.x) } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: PALETA.grid }, ticks: { callback: (v: any) => ui.fmtInt(v) } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  /* ---------- Cobranza (incluye pagos al día / mora temprana / mora antigua) ---------- */
  private panelCobranza(): string {
    var ui = this.ui, d = this.d;
    var c = d.reportes.cobranza;
    this._cobranza = c;
    var p = this.datosPagos();
    this._pagos = p;
    var totalCartera = c.contactabilidad.reduce(function (a: number, t: any) { return a + t.cartera; }, 0);
    var totalRecuperado = c.contactabilidad.reduce(function (a: number, t: any) { return a + t.recuperado; }, 0);
    var totalContactados = c.contactabilidad.reduce(function (a: number, t: any) { return a + t.contactados; }, 0);
    var costoTotal = totalContactados * c.costoPorContacto;

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

    '<section class="card" style="margin-bottom:var(--sp-4)">' +
      '<div class="card__head"><div class="grow"><h2>Pagos: al día, mora temprana y mora antigua</h2>' +
        '<p>Toda la cartera de clientes vigentes, por estado de pago</p></div></div>' +
      '<div class="card__body">' +
        '<div class="grid grid--main-aside">' +
          '<div class="chart-wrap chart-wrap--sm"><canvas id="chartPagos" role="img" aria-label="Distribución de clientes según estado de pago"></canvas></div>' +
          '<ul class="metric-list">' +
            '<li><span style="width:10px;height:10px;border-radius:2px;flex:none;background:' + PALETA.ok + '"></span>' +
              '<span class="grow">Al día<br><span class="small dim">0 días de mora</span></span>' +
              '<span class="val">' + ui.fmtInt(p.alDia.n) + '<br><span class="small muted" style="font-weight:400">' + ui.fmtCLPCorto(p.alDia.saldo) + '</span></span></li>' +
            '<li><span style="width:10px;height:10px;border-radius:2px;flex:none;background:' + PALETA.warn + '"></span>' +
              '<span class="grow">Mora temprana<br><span class="small dim">1 a 30 días</span></span>' +
              '<span class="val">' + ui.fmtInt(p.temprana.n) + '<br><span class="small muted" style="font-weight:400">' + ui.fmtCLPCorto(p.temprana.saldo) + '</span></span></li>' +
            '<li><span style="width:10px;height:10px;border-radius:2px;flex:none;background:' + PALETA.danger + '"></span>' +
              '<span class="grow">Mora antigua<br><span class="small dim">Más de 30 días</span></span>' +
              '<span class="val">' + ui.fmtInt(p.antigua.n) + '<br><span class="small muted" style="font-weight:400">' + ui.fmtCLPCorto(p.antigua.saldo) + '</span></span></li>' +
            '<li><span class="strong">Total cartera vigente</span>' +
              '<span class="val">' + ui.fmtInt(p.total) + '<br><span class="small muted" style="font-weight:400">' + ui.fmtCLPCorto(p.alDia.saldo + p.temprana.saldo + p.antigua.saldo) + '</span></span></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
    '</section>' +

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
          c.contactabilidad.map(function (t: any) {
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
            '<td class="num cell-main">' + ui.fmtInt(c.contactabilidad.reduce(function (a: number, t: any) { return a + t.respondieron; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtInt(c.contactabilidad.reduce(function (a: number, t: any) { return a + t.pagaron; }, 0)) + '</td>' +
            '<td class="num cell-main">' + ui.fmtCLP(totalRecuperado) + '</td>' +
            '<td class="num cell-main">—</td></tr>' +
          '</tbody></table>') +
      '</div>' +
    '</section>' +

    '<div class="grid grid--2">' +
      '<section class="card">' +
        '<div class="card__head"><h2>Costo por contacto según canal</h2>' +
          '<p>Pesos chilenos por contacto efectivo</p></div>' +
        '<div class="card__body"><div class="chart-wrap">' +
          '<canvas id="chartCanal" role="img" aria-label="Costo por contacto según canal"></canvas>' +
        '</div></div>' +
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

  private dibujarCobranza() {
    var ui = this.ui;
    var p = this._pagos, c = this._cobranza;
    if (p) {
      this.crearGrafico('chartPagos', {
        type: 'doughnut',
        data: {
          labels: ['Al día', 'Mora temprana', 'Mora antigua'],
          datasets: [{ data: [p.alDia.n, p.temprana.n, p.antigua.n], backgroundColor: [PALETA.ok, PALETA.warn, PALETA.danger], borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } },
            tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.label + ': ' + ui.fmtInt(ctx.parsed) + ' clientes' } }
          }
        }
      });
    }
    if (c) {
      var maxCosto = Math.max.apply(null, c.comparativoCanal.map((x: any) => x.costoContacto));
      this.crearGrafico('chartCanal', {
        type: 'bar',
        data: {
          labels: c.comparativoCanal.map((x: any) => x.canal),
          datasets: [{
            data: c.comparativoCanal.map((x: any) => x.costoContacto),
            backgroundColor: c.comparativoCanal.map((x: any) => (x.canal === 'WhatsApp' ? PALETA.ok : PALETA.accent)),
            borderRadius: 4, maxBarThickness: 28
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx: any) => ' ' + ui.fmtCLP(ctx.parsed.x) } }
          },
          scales: {
            x: { beginAtZero: true, max: maxCosto * 1.1, grid: { color: PALETA.grid }, ticks: { callback: (v: any) => ui.fmtCLP(v) } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  }

  /* ---------- Ingresos ---------- */
  private panelIngresos(): string {
    var ui = this.ui;
    var ing = this.datosIngresos();
    this._ingresos = ing;

    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('money', 14) + 'Recaudación del mes</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(ing.totalMes) + '</span>' +
        '<span class="kpi__foot">' + ui.delta(ing.deltaMes, 'vs. mes anterior') + '</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('check', 14) + 'Cuotas al día cobradas</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(ing.cuotasAlDia) + '</span>' +
        '<span class="kpi__foot">Clientes sin mora, cuota del mes</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('refresh', 14) + 'Mora recuperada</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(ing.moraRecuperada) + '</span>' +
        '<span class="kpi__foot">Tramos 1 a 30 días</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('users', 14) + 'Cartera vigente total</span>' +
        '<span class="kpi__value">' + ui.fmtCLPCorto(ing.carteraVigente) + '</span>' +
        '<span class="kpi__foot">Saldo insoluto de todos los créditos activos</span></div>' +
    '</div>' +

    '<div class="grid grid--main-aside">' +
      '<section class="card">' +
        '<div class="card__head"><h2>Recaudación por mes</h2><p>Cuotas al día + mora recuperada, últimos 6 meses</p></div>' +
        '<div class="card__body"><div class="chart-wrap">' +
          '<canvas id="chartIngresos" role="img" aria-label="Recaudación mensual: cuotas al día y mora recuperada"></canvas>' +
        '</div></div>' +
        '<div class="card__foot"><span class="small muted">Septiembre está a mitad de mes: la barra muestra lo recaudado hasta el día 15.</span></div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card__head"><h2>Composición de la recaudación</h2></div>' +
        '<div class="card__body">' +
          '<ul class="metric-list">' +
            '<li>Cuotas al día<span class="grow small dim">' + ui.fmtPct(ing.cuotasAlDia / ing.totalMes) + ' del total</span>' +
              '<span class="val">' + ui.fmtCLP(ing.cuotasAlDia) + '</span></li>' +
            '<li>Mora recuperada<span class="grow small dim">' + ui.fmtPct(ing.moraRecuperada / ing.totalMes) + ' del total</span>' +
              '<span class="val">' + ui.fmtCLP(ing.moraRecuperada) + '</span></li>' +
            '<li><span class="strong">Total recaudado</span><span class="grow"></span>' +
              '<span class="val">' + ui.fmtCLP(ing.totalMes) + '</span></li>' +
          '</ul>' +
          '<div class="callout callout--info" style="margin-top:var(--sp-4)">' + ui.icon('info') +
            '<span class="small">La cartera vigente total (' + ui.fmtCLPCorto(ing.carteraVigente) +
            ') es el saldo insoluto pendiente de todos los créditos activos, no ingreso del mes.</span></div>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  private dibujarIngresos() {
    var ui = this.ui;
    var ing = this._ingresos;
    if (!ing) return;
    this.crearGrafico('chartIngresos', {
      type: 'bar',
      data: {
        labels: ing.serie.map((m: any) => m.mes),
        datasets: [
          { label: 'Cuotas al día', data: ing.serie.map((m: any) => m.cuotas), backgroundColor: PALETA.accent, stack: 'a', borderRadius: 4, maxBarThickness: 40 },
          { label: 'Mora recuperada', data: ing.serie.map((m: any) => m.mora), backgroundColor: PALETA.ok, stack: 'a', borderRadius: 4, maxBarThickness: 40 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } },
          tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + ui.fmtCLP(ctx.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, stacked: true },
          y: { beginAtZero: true, stacked: true, grid: { color: PALETA.grid }, ticks: { callback: (v: any) => ui.fmtCLPCorto(v) } }
        }
      }
    });
  }

  /* ---------- Gastos (antes "Costos") ---------- */
  private panelGastos(): string {
    var ui = this.ui, d = this.d;
    if (st.costosCargando) {
      return '<div class="card"><div class="card__body">' + ui.skeletonTabla(6, 4) + '</div></div>';
    }
    if (st.costosIntento === 0) {
      return '<div class="card"><div class="card__body">' + ui.estadoError({
        titulo: 'No pudimos traer el detalle de gastos',
        texto: 'La API de facturación de Meta no respondió. Los datos de envíos sí están disponibles en las otras pestañas.',
        detalle: 'Error 504 · graph.facebook.com/v21.0/billing · 15 sep 2026, 11:42',
        accion: 'reintentar-costos'
      }) + '</div></div>';
    }

    var s = d.reportes.costos.serie;
    this._gastosSerie = s;
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
        '<div class="card__head"><div class="grow"><h2>Evolución del gasto por categoría</h2>' +
          '<p>Últimos 6 meses, en dólares</p></div></div>' +
        '<div class="card__body"><div class="chart-wrap">' +
          '<canvas id="chartGastos" role="img" aria-label="Gasto mensual por categoría, de abril a septiembre"></canvas>' +
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

  private dibujarGastos() {
    var ui = this.ui;
    var s = this._gastosSerie;
    if (!s) return;
    this.crearGrafico('chartGastos', {
      type: 'bar',
      data: {
        labels: s.map((m: any) => m.mes),
        datasets: [
          { label: 'Marketing', data: s.map((m: any) => m.marketing), backgroundColor: PALETA.marketing, stack: 'a', borderRadius: 4, maxBarThickness: 40 },
          { label: 'Utility', data: s.map((m: any) => m.utility), backgroundColor: PALETA.utility, stack: 'a', borderRadius: 4, maxBarThickness: 40 },
          { label: 'Authentication', data: s.map((m: any) => m.auth), backgroundColor: PALETA.authentication, stack: 'a', borderRadius: 4, maxBarThickness: 40 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + ui.fmtUSD(ctx.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, stacked: true },
          y: { beginAtZero: true, stacked: true, grid: { color: PALETA.grid }, ticks: { callback: (v: any) => ui.fmtUSD(v) } }
        }
      }
    });
  }

  /* ---------- Usuarios (altas nuevas) ---------- */
  private panelUsuarios(): string {
    var ui = this.ui;
    var u = this.datosUsuariosNuevos();
    this._usuarios = u;
    var pctClientes = u.delMes.total ? u.delMes.clientes / u.delMes.total : 0;
    var delta = u.mesAnterior.total ? (u.delMes.total - u.mesAnterior.total) / u.mesAnterior.total : 0;
    var maxSuc = u.sucursales.length ? u.sucursales[0].n : 1;
    var top = u.sucursales[0];
    var nombreMes = u.delMes.mes.charAt(0).toUpperCase() + u.delMes.mes.slice(1);

    return '<div class="grid grid--kpi" style="margin-bottom:var(--sp-4)">' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('users', 14) + 'Nuevos contactos · ' + nombreMes + '</span>' +
        '<span class="kpi__value">' + ui.fmtInt(u.delMes.total) + '</span>' +
        '<span class="kpi__foot">' + ui.delta(delta, 'vs. mes anterior') + '</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('user', 14) + 'Nuevos clientes</span>' +
        '<span class="kpi__value">' + ui.fmtInt(u.delMes.clientes) + '</span>' +
        '<span class="kpi__foot">' + ui.fmtPct(pctClientes) + ' de las altas del mes</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('target', 14) + 'Nuevos prospectos</span>' +
        '<span class="kpi__value">' + ui.fmtInt(u.delMes.prospectos) + '</span>' +
        '<span class="kpi__foot">Entraron al embudo comercial</span></div>' +
      '<div class="kpi"><span class="kpi__label">' + ui.icon('car', 14) + 'Sucursal con más altas</span>' +
        '<span class="kpi__value" style="font-size:var(--fs-20)">' + ui.esc(top ? top.sucursal.replace('Sucursal ', '') : '—') + '</span>' +
        '<span class="kpi__foot">' + ui.fmtInt(top ? top.n : 0) + ' altas en ' + nombreMes + '</span></div>' +
    '</div>' +

    '<div class="grid grid--main-aside">' +
      '<section class="card">' +
        '<div class="card__head"><h2>Altas de contactos por mes</h2><p>Clientes y prospectos nuevos, últimos 6 meses completos</p></div>' +
        '<div class="card__body"><div class="chart-wrap">' +
          '<canvas id="chartUsuarios" role="img" aria-label="Nuevos contactos por mes, clientes y prospectos"></canvas>' +
        '</div></div>' +
        '<div class="card__foot"><span class="small muted">' + MESES_LARGOS[u.delMes.mes] +
          ' es el último mes cerrado; septiembre todavía no tiene altas confirmadas.</span></div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card__head"><h2>Altas por sucursal</h2><p>' + nombreMes + '</p></div>' +
        '<div class="card__body">' +
          (u.sucursales.length
            ? '<div class="funnel">' + u.sucursales.slice(0, 8).map(function (sc) {
                return '<div class="funnel__step"><div class="funnel__top">' +
                  '<span>' + ui.esc(sc.sucursal) + '</span><span class="n">' + ui.fmtInt(sc.n) + '</span></div>' +
                  ui.barra(sc.n / maxSuc) + '</div>';
              }).join('') + '</div>'
            : '<p class="small dim">Sin altas registradas en ' + nombreMes + '.</p>') +
        '</div>' +
      '</section>' +
    '</div>';
  }

  private dibujarUsuarios() {
    var ui = this.ui;
    var u = this._usuarios;
    if (!u) return;
    this.crearGrafico('chartUsuarios', {
      type: 'bar',
      data: {
        labels: u.series.map((m: any) => m.mes),
        datasets: [
          { label: 'Clientes', data: u.series.map((m: any) => m.clientes), backgroundColor: PALETA.accent, stack: 'a', borderRadius: 4, maxBarThickness: 40 },
          { label: 'Prospectos', data: u.series.map((m: any) => m.prospectos), backgroundColor: PALETA.marketing, stack: 'a', borderRadius: 4, maxBarThickness: 40 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } },
          tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + ui.fmtInt(ctx.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, stacked: true },
          y: { beginAtZero: true, stacked: true, grid: { color: PALETA.grid }, ticks: { callback: (v: any) => ui.fmtInt(v) } }
        }
      }
    });
  }

  /* ---------- Orquestación de pestañas y gráficos ---------- */
  private contenidoTab(): string {
    if (st.tab === 'comercial') return this.panelComercial();
    if (st.tab === 'cobranza') return this.panelCobranza();
    if (st.tab === 'ingresos') return this.panelIngresos();
    if (st.tab === 'usuarios') return this.panelUsuarios();
    return this.panelGastos();
  }

  private render(): string {
    var ui = this.ui;
    return '<div class="tabs" role="tablist" aria-label="Tipos de reporte" style="margin-bottom:var(--sp-4);background:var(--surface);border-radius:var(--radius-lg) var(--radius-lg) 0 0;padding:0 var(--sp-3);border:1px solid var(--border);border-bottom-color:var(--border)">' +
        TABS.map(function (t) {
          return '<button type="button" class="tab" role="tab" id="rtab-' + t.id + '" ' +
            'aria-selected="' + (st.tab === t.id) + '" aria-controls="panel-rep" data-rtab="' + t.id + '">' +
            ui.esc(t.label) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="panel-rep" role="tabpanel" aria-labelledby="rtab-' + st.tab + '" tabindex="0">' +
        this.contenidoTab() + '</div>';
  }

  private repintar() {
    this.html = this.sanitizer.bypassSecurityTrustHtml(this.render());
    setTimeout(() => this.dibujarGraficos());
  }

  private destruirGrafico(id: string) {
    if (this.charts[id]) { this.zone.runOutsideAngular(() => this.charts[id].destroy()); delete this.charts[id]; }
  }

  private crearGrafico(id: string, config: any) {
    var canvas = this.elRef.nativeElement.querySelector('#' + id) as HTMLCanvasElement | null;
    if (!canvas) return;
    this.destruirGrafico(id);
    // Fuera de la zona de Angular: Chart.js no debe disparar detección de
    // cambios por sus propios eventos internos (resize, hover, etc.).
    this.zone.runOutsideAngular(() => {
      this.charts[id] = new Chart(canvas, config);
    });
  }

  private dibujarGraficos() {
    if (st.tab === 'comercial') this.dibujarComercial();
    else if (st.tab === 'cobranza') this.dibujarCobranza();
    else if (st.tab === 'ingresos') this.dibujarIngresos();
    else if (st.tab === 'usuarios') this.dibujarUsuarios();
    else this.dibujarGastos();
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var t = target.closest('[data-rtab]');
    if (t) { st.tab = t.getAttribute('data-rtab'); this.repintar(); return; }

    if (target.closest('[data-accion="reintentar-costos"]')) {
      st.costosCargando = true;
      this.repintar();
      setTimeout(() => {
        st.costosCargando = false;
        st.costosIntento = 1;
        this.repintar();
        this.ui.toast('Datos de facturación al día', 'La API de Meta respondió en el segundo intento.', 'ok');
      }, 900);
    }
  }

  onKeydown(e: KeyboardEvent) {
    var target = e.target as HTMLElement;
    var t = target.closest('[role="tab"]');
    if (!t) return;
    var idx = TABS.map((x) => x.id).indexOf(t.getAttribute('data-rtab')!);
    var nuevo: number | null = null;
    if (e.key === 'ArrowRight') nuevo = (idx + 1) % TABS.length;
    if (e.key === 'ArrowLeft') nuevo = (idx - 1 + TABS.length) % TABS.length;
    if (nuevo === null) return;
    e.preventDefault();
    st.tab = TABS[nuevo].id;
    this.repintar();
    setTimeout(() => {
      var btn = this.elRef.nativeElement.querySelector('[data-rtab="' + st.tab + '"]');
      if (btn) btn.focus();
    });
  }
}
