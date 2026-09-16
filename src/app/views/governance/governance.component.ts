/* ===========================================================
   MAF · Vista 9 · Gobernanza y consentimiento
   Puerto directo de legacy-static/js/views/governance.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

let st: any = { tab: 'optin', busqueda: '' };

const TABS = [
  { id: 'optin', label: 'Registro de opt-in' },
  { id: 'optout', label: 'Opt-out' },
  { id: 'auditoria', label: 'Log de auditoría' }
];

@Component({
  selector: 'app-governance',
  standalone: true,
  template: '<div (click)="onClick($event)" (input)="onInput($event)" (keydown)="onKeydown($event)" [innerHTML]="html"></div>'
})
export class GovernanceComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);

  html: SafeHtml = '';
  private buscarDeb: (...a: any[]) => void;

  constructor() {
    this.buscarDeb = this.ui.deb(() => {
      var b = this.elRef.nativeElement.querySelector('#gobBuscar');
      st.busqueda = b ? b.value.trim() : '';
      var panel = this.elRef.nativeElement.querySelector('#panel-gob');
      if (panel) panel.innerHTML = this.contenidoTab();
    }, 180);
  }

  ngOnInit() {
    this.chrome.set('Gobernanza y consentimiento', 'Trazabilidad del opt-in, las bajas y todo lo que hace el equipo',
      '<button type="button" class="btn btn--sm" data-global="exportar">' +
        this.ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>');
    this.repintar();
  }

  private conteos() {
    var base = this.d.contactos;
    var vig = base.filter((c: any) => c.consentimiento === 'vigente').length;
    var rev = base.filter((c: any) => c.consentimiento === 'revocado').length;
    var sin = base.filter((c: any) => c.consentimiento === 'sin_registro').length;
    return { total: base.length, vigente: vig, revocado: rev, sinRegistro: sin };
  }

  private resumen(): string {
    var ui = this.ui, d = this.d;
    var c = this.conteos();
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

  private tablaOptIn(): string {
    var ui = this.ui, d = this.d;
    var q = st.busqueda.toLowerCase();
    var filas = d.optIns.filter(function (o: any) {
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
      filas.map(function (o: any) {
        return '<tr><td class="cell-main">' + ui.esc(o.contacto) + '</td>' +
          '<td class="mono">' + ui.esc(o.rut) + '</td>' +
          '<td class="mono small">' + ui.esc(o.telefono) + '</td>' +
          '<td>' + ui.badgeConsent(o.estado) + '</td>' +
          '<td class="small">' + ui.fmtFecha(o.fecha) + '</td>' +
          '<td class="small">' + (o.canal ? d.labels.canalOptIn[o.canal] : '<span class="dim">—</span>') + '</td>' +
          '<td class="small muted">' + ui.esc(o.evidencia) + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  private tablaOptOut(): string {
    var ui = this.ui, d = this.d;
    return ui.tablaWrap('<table class="data" style="min-width:760px">' +
      '<caption class="sr-only">Contactos que solicitaron baja</caption><thead><tr>' +
      '<th scope="col">Contacto</th><th scope="col">RUT</th><th scope="col">Fecha de baja</th>' +
      '<th scope="col">Motivo</th><th scope="col">Origen</th><th scope="col">Alcance</th></tr></thead><tbody>' +
      d.optOuts.map(function (o: any) {
        return '<tr><td class="cell-main">' + ui.esc(o.contacto) + '</td>' +
          '<td class="mono">' + ui.esc(o.rut) + '</td>' +
          '<td class="small">' + ui.fmtFecha(o.fecha) + '</td>' +
          '<td>' + ui.esc(o.motivo) + '</td>' +
          '<td class="small muted">' + ui.esc(o.origen) + '</td>' +
          '<td>' + ui.badge(o.alcance, o.alcance === 'Todo' ? 'danger' : 'warn') + '</td></tr>';
      }).join('') + '</tbody></table>');
  }

  private tablaAuditoria(): string {
    var ui = this.ui, d = this.d;
    return ui.tablaWrap('<table class="data" style="min-width:880px">' +
      '<caption class="sr-only">Log de auditoría</caption><thead><tr>' +
      '<th scope="col">Fecha y hora</th><th scope="col">Usuario</th><th scope="col">Acción</th>' +
      '<th scope="col">Objeto</th><th scope="col">Detalle</th><th scope="col">IP</th></tr></thead><tbody>' +
      d.auditoria.map(function (a: any) {
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

  private contenidoTab(): string {
    if (st.tab === 'optin') return this.tablaOptIn();
    if (st.tab === 'optout') return this.tablaOptOut();
    return this.tablaAuditoria();
  }

  private pie(): string {
    var ui = this.ui, d = this.d;
    if (st.tab === 'optin') {
      return '<span class="small muted grow">Se muestran los primeros ' + d.optIns.length +
        ' registros de ' + ui.fmtInt(this.conteos().total) + '. La evidencia se conserva 6 años.</span>' +
        '<button type="button" class="btn btn--sm" data-global-exp>' + ui.icon('download', 14) + 'Exportar registro</button>';
    }
    if (st.tab === 'optout') {
      return '<span class="small muted grow">Las bajas se aplican en menos de 5 minutos a todas las campañas y journeys activos.</span>';
    }
    return '<span class="small muted grow">El log es inmutable y se retiene por 24 meses. Incluye accesos a datos personales.</span>' +
      '<button type="button" class="btn btn--sm" data-global-exp>' + ui.icon('download', 14) + 'Exportar log</button>';
  }

  private render(): string {
    var ui = this.ui;
    return this.resumen() +
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
          this.contenidoTab() + '</div>' +
        '<div class="card__foot">' + this.pie() + '</div>' +
      '</section>';
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }

  onInput(e: Event) {
    var t = e.target as HTMLElement;
    if (t.id === 'gobBuscar') this.buscarDeb();
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var t = target.closest('[data-tab]');
    if (t) { st.tab = t.getAttribute('data-tab'); st.busqueda = ''; this.repintar(); return; }
    if (target.closest('[data-global-exp]')) {
      this.ui.toast('Exportación solicitada', 'El archivo se genera con marca de auditoría y se envía a tu correo.', 'ok');
    }
  }

  onKeydown(e: KeyboardEvent) {
    var target = e.target as HTMLElement;
    var t = target.closest('[role="tab"]');
    if (!t) return;
    var idx = TABS.map((x) => x.id).indexOf(t.getAttribute('data-tab')!);
    var nuevo: number | null = null;
    if (e.key === 'ArrowRight') nuevo = (idx + 1) % TABS.length;
    if (e.key === 'ArrowLeft') nuevo = (idx - 1 + TABS.length) % TABS.length;
    if (nuevo === null) return;
    e.preventDefault();
    st.tab = TABS[nuevo].id;
    this.repintar();
    setTimeout(() => {
      var btn = this.elRef.nativeElement.querySelector('[data-tab="' + st.tab + '"]');
      if (btn) btn.focus();
    });
  }
}
