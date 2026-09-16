/* ===========================================================
   MAF · Vista 4 · Audiencias y segmentos
   Puerto directo de legacy-static/js/views/audiences.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';

let st: any = { id: 's1', nombre: '', descripcion: '', logica: 'and', reglas: [] };

@Component({
  selector: 'app-audiences',
  standalone: true,
  template: '<div (click)="onClick($event)" (change)="onChange($event)" (input)="onInput($event)" [innerHTML]="html"></div>'
})
export class AudiencesComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);

  html: SafeHtml = '';

  ngOnInit() {
    var ui = this.ui;
    this.chrome.set('Audiencias y segmentos', 'Condiciones sobre datos del negocio, con conteo en tiempo real',
      '<button type="button" class="btn btn--sm" data-global="exportar">' +
        ui.icon('download', 14) + '<span class="hide-sm">Exportar</span></button>');
    this.repintar();
  }

  private cargarSegmento(id: string) {
    var s = this.d.segmentos.filter((x: any) => x.id === id)[0];
    if (!s) return;
    st.id = s.id;
    st.nombre = s.nombre;
    st.descripcion = s.descripcion;
    st.logica = s.logica;
    st.reglas = s.reglas.map((r: any) => JSON.parse(JSON.stringify(r)));
  }

  private campo(id: string) { return this.d.campos.filter((c: any) => c.id === id)[0]; }
  private resultado(): any[] { return this.d.evaluarSegmento(st.reglas, st.logica); }

  private listado(): string {
    var ui = this.ui, d = this.d;
    return '<section class="card">' +
      '<div class="card__head"><h2>Segmentos guardados</h2>' +
        '<p>' + d.segmentos.length + ' segmentos sobre una base de ' + ui.fmtInt(d.contactos.length) + ' contactos sincronizados</p></div>' +
      '<div class="card__body card__body--flush">' +
        '<ul>' + d.segmentos.map(function (s: any) {
          return '<li><button type="button" class="conv-item" data-seg="' + s.id + '"' +
            (st.id === s.id ? ' aria-current="true"' : '') + '>' +
            '<span class="conv-item__txt">' +
              '<span class="conv-item__top"><strong>' + ui.esc(s.nombre) + '</strong></span>' +
              '<span class="conv-item__prev">' + ui.esc(s.descripcion) + '</span>' +
              '<span class="conv-item__tags">' +
                ui.badge(ui.fmtInt(s.tamano) + ' contactos', 'info', true) +
                ui.badge(ui.fmtInt(s.conOptIn) + ' con opt-in', 'ok', true) +
              '</span>' +
              '<span class="small dim" style="display:block;margin-top:var(--sp-2)">' +
                'Actualizado ' + ui.fmtRelativo(s.actualizado) + ' por ' + ui.esc(s.autor) + '</span>' +
            '</span></button></li>';
        }).join('') + '</ul>' +
      '</div>' +
    '</section>';
  }

  private controlValor(r: any, i: number): string {
    var ui = this.ui;
    var c = this.campo(r.campo);
    if (!c) return '';

    if (c.tipo === 'numero') {
      if (r.op === 'entre') {
        return '<span class="row gap-2">' +
          '<input class="input" type="number" data-valor="' + i + '" value="' + ui.esc(r.valor) + '" aria-label="Valor mínimo">' +
          '<input class="input" type="number" data-valor2="' + i + '" value="' + ui.esc(r.valor2) + '" aria-label="Valor máximo">' +
          '</span>';
      }
      return '<input class="input" type="number" data-valor="' + i + '" value="' + ui.esc(r.valor) + '" aria-label="Valor">';
    }

    if (r.op === 'en') {
      var sel = Array.isArray(r.valor) ? r.valor.map(String) : [String(r.valor)];
      return '<select class="select" multiple size="3" data-valor="' + i + '" aria-label="Valores">' +
        c.opciones.map(function (o: any) {
          return '<option value="' + ui.esc(o[0]) + '"' + (sel.indexOf(String(o[0])) !== -1 ? ' selected' : '') + '>' +
            ui.esc(o[1]) + '</option>';
        }).join('') + '</select>';
    }

    return '<select class="select" data-valor="' + i + '" aria-label="Valor">' +
      c.opciones.map(function (o: any) {
        return '<option value="' + ui.esc(o[0]) + '"' + (String(r.valor) === String(o[0]) ? ' selected' : '') + '>' +
          ui.esc(o[1]) + '</option>';
      }).join('') + '</select>';
  }

  private filaRegla(r: any, i: number): string {
    var d = this.d;
    var c = this.campo(r.campo);
    var ops = c ? d.operadores[c.tipo] : d.operadores.enum;
    return '<div class="rule" role="group" aria-label="Condición ' + (i + 1) + '">' +
      '<span class="rule__join">' + (i === 0 ? 'Donde' : (st.logica === 'and' ? 'Y' : 'O')) + '</span>' +
      '<select class="select" data-campo="' + i + '" aria-label="Campo">' +
        d.campos.map((cp: any) => {
          return '<option value="' + cp.id + '"' + (r.campo === cp.id ? ' selected' : '') + '>' + this.ui.esc(cp.label) + '</option>';
        }).join('') +
      '</select>' +
      '<select class="select" data-op="' + i + '" aria-label="Operador">' +
        ops.map(function (o: any) {
          return '<option value="' + o[0] + '"' + (r.op === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') +
      '</select>' +
      this.controlValor(r, i) +
      '<button type="button" class="icon-btn" data-quitar="' + i + '" aria-label="Quitar condición ' + (i + 1) + '">' +
        this.ui.icon('trash', 16) + '</button>' +
    '</div>';
  }

  private composicion(res: any[]): string {
    var ui = this.ui;
    var porModelo: any = {};
    res.forEach(function (c: any) { porModelo[c.modelo] = (porModelo[c.modelo] || 0) + 1; });
    var top = Object.keys(porModelo).map(function (k) { return { k: k, n: porModelo[k] }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 4);
    var max = top.length ? top[0].n : 1;

    return '<div class="funnel">' + top.map(function (t) {
      return '<div class="funnel__step"><div class="funnel__top">' +
        '<span>' + ui.esc(t.k) + '</span><span class="n">' + ui.fmtInt(t.n) + '</span>' +
        '<span class="p">' + ui.fmtPct(t.n / res.length, 0) + '</span></div>' +
        ui.barra(t.n / max) + '</div>';
    }).join('') + '</div>';
  }

  private constructor_(): string {
    var ui = this.ui;
    var res = this.resultado();
    var conOptIn = res.filter(function (c: any) { return c.consentimiento === 'vigente'; }).length;
    var muestra = res.slice(0, 5);

    return '<section class="card">' +
      '<div class="card__head">' +
        '<div class="grow"><h2>Constructor de segmento</h2>' +
        '<p>El conteo se recalcula sobre la base sincronizada cada vez que cambias una condición.</p></div>' +
        '<button type="button" class="btn btn--sm" data-nuevo>' + ui.icon('plus', 14) + 'Segmento nuevo</button>' +
      '</div>' +

      '<div class="card__body">' +
        '<div class="row gap-4 wrap" style="align-items:flex-start;margin-bottom:var(--sp-5)">' +
          '<div class="field grow" style="min-width:240px">' +
            '<label class="field__label" for="segNombre">Nombre del segmento</label>' +
            '<input class="input" id="segNombre" type="text" value="' + ui.esc(st.nombre) + '">' +
          '</div>' +
          '<div class="field grow" style="min-width:240px">' +
            '<label class="field__label" for="segDesc">Descripción <span class="opt">(opcional)</span></label>' +
            '<input class="input" id="segDesc" type="text" value="' + ui.esc(st.descripcion) + '">' +
          '</div>' +
        '</div>' +

        '<div class="row gap-3 wrap" style="margin-bottom:var(--sp-3)">' +
          '<h3>Condiciones</h3>' +
          '<div class="segmented" role="group" aria-label="Lógica entre condiciones">' +
            '<button type="button" data-logica="and" aria-pressed="' + (st.logica === 'and') + '">Cumplen todas</button>' +
            '<button type="button" data-logica="or" aria-pressed="' + (st.logica === 'or') + '">Cumplen alguna</button>' +
          '</div>' +
        '</div>' +

        (st.reglas.length
          ? '<div class="rule-list">' + st.reglas.map((r: any, i: number) => this.filaRegla(r, i)).join('') + '</div>'
          : '<div class="callout">' + ui.icon('filter') +
            '<span>Sin condiciones el segmento queda vacío. Agrega al menos una para empezar a acotar la base.</span></div>') +

        '<button type="button" class="btn btn--sm" style="margin-top:var(--sp-3)" data-agregar>' +
          ui.icon('plus', 14) + 'Agregar condición</button>' +

        '<div class="grid grid--2" style="margin-top:var(--sp-5)">' +
          '<div class="count-box">' +
            '<span class="n">' + ui.fmtInt(res.length) + '</span>' +
            '<span class="lbl">contactos cumplen las condiciones</span>' +
            '<span class="lbl" style="margin-top:var(--sp-2)">' + ui.fmtInt(conOptIn) +
              ' con consentimiento vigente · ' + ui.fmtInt(res.length - conOptIn) + ' no contactables</span>' +
          '</div>' +
          '<div>' +
            '<h3 style="margin-bottom:var(--sp-2)">Composición</h3>' +
            (res.length ? this.composicion(res) : '<p class="small dim">Sin resultados que analizar.</p>') +
          '</div>' +
        '</div>' +

        '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Muestra de contactos</h3>' +
        (muestra.length
          ? ui.tablaWrap('<table class="data" style="min-width:640px">' +
              '<caption class="sr-only">Primeros contactos del segmento</caption>' +
              '<thead><tr><th scope="col">Contacto</th><th scope="col">RUT</th><th scope="col">Modelo</th>' +
              '<th scope="col" class="num">Monto</th><th scope="col">Sucursal</th><th scope="col">Opt-in</th></tr></thead><tbody>' +
              muestra.map(function (c: any) {
                return '<tr><td><span class="cell-main">' + ui.esc(c.nombre) + '</span>' +
                  '<br><span class="cell-sub mono">' + ui.esc(c.telefono) + '</span></td>' +
                  '<td class="mono">' + ui.esc(c.rut) + '</td>' +
                  '<td>' + ui.esc(c.modelo) + '</td>' +
                  '<td class="num">' + ui.fmtCLP(c.montoCotizado) + '</td>' +
                  '<td>' + ui.esc(c.sucursal) + '</td>' +
                  '<td>' + ui.badgeConsent(c.consentimiento) + '</td></tr>';
              }).join('') + '</tbody></table>')
          : ui.estadoVacio({
              icono: 'search',
              titulo: 'Ninguna persona cumple estas condiciones',
              texto: 'El cruce de filtros dejó el segmento en cero. Prueba cambiando a «cumplen alguna» o ampliando los rangos.'
            })) +
      '</div>' +

      '<div class="card__foot">' +
        '<span class="small muted grow">Base sincronizada con el CRM comercial y el core de cartera · última carga hoy 06:00</span>' +
        '<button type="button" class="btn" data-exportar>' + ui.icon('download', 14) + 'Exportar CSV</button>' +
        '<button type="button" class="btn btn--primary" data-guardar>' + ui.icon('check', 14) + 'Guardar segmento</button>' +
      '</div>' +
    '</section>';
  }

  private render(): string {
    if (!st.reglas.length && st.id) this.cargarSegmento(st.id);
    return '<div class="grid grid--aside-main">' + this.listado() + this.constructor_() + '</div>';
  }

  private repintar() { this.html = this.sanitizer.bypassSecurityTrustHtml(this.render()); }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var ui = this.ui;

    var seg = target.closest('[data-seg]');
    if (seg) { this.cargarSegmento(seg.getAttribute('data-seg')!); this.repintar(); return; }

    var log = target.closest('[data-logica]');
    if (log) { st.logica = log.getAttribute('data-logica'); this.repintar(); return; }

    if (target.closest('[data-agregar]')) {
      st.reglas.push({ campo: 'tipo', op: 'es', valor: 'prospecto' });
      this.repintar();
      return;
    }

    var q = target.closest('[data-quitar]');
    if (q) { st.reglas.splice(parseInt(q.getAttribute('data-quitar')!, 10), 1); this.repintar(); return; }

    if (target.closest('[data-nuevo]')) {
      st = { id: null, nombre: 'Segmento sin título', descripcion: '', logica: 'and',
             reglas: [{ campo: 'tipo', op: 'es', valor: 'prospecto' }] };
      this.repintar();
      return;
    }

    if (target.closest('[data-guardar]')) {
      var n = this.resultado().length;
      ui.toast('Segmento guardado', '«' + st.nombre + '» quedó con ' + ui.fmtInt(n) + ' contactos. Se recalcula antes de cada envío.', 'ok');
      return;
    }

    if (target.closest('[data-exportar]')) {
      ui.toast('Exportación solicitada', ui.fmtInt(this.resultado().length) + ' filas. En producción el archivo se envía por correo con marca de auditoría.', 'ok');
    }
  }

  onChange(e: Event) {
    var t = e.target as any, i: number;
    var d = this.d;

    if (t.hasAttribute('data-campo')) {
      i = parseInt(t.getAttribute('data-campo'), 10);
      var c = this.campo(t.value);
      st.reglas[i].campo = t.value;
      st.reglas[i].op = d.operadores[c.tipo][0][0];
      st.reglas[i].valor = c.tipo === 'numero' ? 0 : c.opciones[0][0];
      delete st.reglas[i].valor2;
      this.repintar();
      return;
    }
    if (t.hasAttribute('data-op')) {
      i = parseInt(t.getAttribute('data-op'), 10);
      st.reglas[i].op = t.value;
      if (t.value === 'entre' && st.reglas[i].valor2 === undefined) st.reglas[i].valor2 = Number(st.reglas[i].valor) + 30;
      if (t.value === 'en' && !Array.isArray(st.reglas[i].valor)) st.reglas[i].valor = [st.reglas[i].valor];
      if (t.value !== 'en' && Array.isArray(st.reglas[i].valor)) st.reglas[i].valor = st.reglas[i].valor[0];
      this.repintar();
      return;
    }
    if (t.hasAttribute('data-valor')) {
      i = parseInt(t.getAttribute('data-valor'), 10);
      st.reglas[i].valor = t.multiple
        ? Array.prototype.slice.call(t.selectedOptions).map(function (o: any) { return o.value; })
        : t.value;
      this.repintar();
      return;
    }
    if (t.hasAttribute('data-valor2')) {
      i = parseInt(t.getAttribute('data-valor2'), 10);
      st.reglas[i].valor2 = t.value;
      this.repintar();
    }
  }

  onInput(e: Event) {
    var t = e.target as HTMLInputElement;
    if (t.id === 'segNombre') st.nombre = t.value;
    if (t.id === 'segDesc') st.descripcion = t.value;
  }
}
