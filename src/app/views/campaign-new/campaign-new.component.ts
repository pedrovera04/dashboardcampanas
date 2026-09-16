/* ===========================================================
   MAF · Vista 3 · Crear campaña (asistente de 4 pasos)
   Puerto directo de legacy-static/js/views/campaign-new.js.
   =========================================================== */
import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiService } from '../../services/ui.service';
import { DataService } from '../../services/data.service';
import { PageChromeService } from '../../services/page-chrome.service';
import { WhatsappSendService } from '../../services/whatsapp-send.service';

const PASOS = [
  { n: 1, titulo: 'Audiencia', desc: 'A quién le hablamos' },
  { n: 2, titulo: 'Plantilla', desc: 'Qué mensaje enviamos' },
  { n: 3, titulo: 'Programación', desc: 'Cuándo y a qué ritmo' },
  { n: 4, titulo: 'Resumen', desc: 'Revisión y confirmación' }
];

function nuevoEstado(): any {
  return {
    paso: 1,
    nombre: '',
    segmentoId: '',
    plantillaId: '',
    mapeo: {} as any,
    excluirSinOptIn: true,
    excluirContactados: true,
    modo: 'programado',
    fecha: '2026-09-18',
    horaIni: '09:00',
    horaFin: '19:00',
    velocidad: '600',
    siLimite: 'omitir',
    errores: {} as any,
    // Número de prueba real (paso 4): envía de verdad un WhatsApp de texto
    // vía UltraMsg para comprobar cómo llegaría la campaña. Nunca toca a la
    // audiencia real, que sigue siendo simulada en esta maqueta.
    telefonoPrueba: '',
    pruebaEnviando: false,
    pruebaResultado: null as { ok: boolean; detalle: string } | null
  };
}

@Component({
  selector: 'app-campaign-new',
  standalone: true,
  template: '<div (click)="onClick($event)" (change)="onChange($event)" (input)="onInput($event)" [innerHTML]="html"></div>'
})
export class CampaignNewComponent implements OnInit {
  private ui = inject(UiService);
  private d = inject(DataService).d;
  private chrome = inject(PageChromeService);
  private sanitizer = inject(DomSanitizer);
  private elRef = inject(ElementRef);
  private whatsapp = inject(WhatsappSendService);

  html: SafeHtml = '';
  private st = nuevoEstado();

  ngOnInit() {
    this.chrome.set('Crear campaña', this.subtituloTxt(),
      '<a class="btn btn--sm" href="#/campanas">' + this.ui.icon('x', 14) + 'Salir del asistente</a>');
    this.repintar();
  }

  private subtituloTxt() { return PASOS[this.st.paso - 1].titulo + ' · ' + PASOS[this.st.paso - 1].desc; }

  private segmento() { return this.d.segmentos.filter((s: any) => s.id === this.st.segmentoId)[0]; }
  private plantilla() { return this.d.plantillas.filter((p: any) => p.id === this.st.plantillaId)[0]; }

  private audienciaFinal(): number {
    var s = this.segmento();
    if (!s) return 0;
    var base = this.st.excluirSinOptIn ? s.conOptIn : s.tamano;
    if (this.st.excluirContactados) base = Math.round(base * 0.91);
    return base;
  }

  private costoEstimado(): number {
    var p = this.plantilla();
    if (!p) return 0;
    return this.audienciaFinal() * this.d.precios[p.categoria];
  }

  private stepper(): string {
    var ui = this.ui, st = this.st;
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

  private paso1(): string {
    var ui = this.ui, d = this.d, st = this.st;
    var s = this.segmento();
    return '<fieldset>' +
      '<legend style="margin-bottom:var(--sp-3)">Selecciona un segmento guardado</legend>' +
      (st.errores.segmento ? '<p class="field__error" style="margin-bottom:var(--sp-3)">' +
        ui.icon('alertCircle', 13) + ui.esc(st.errores.segmento) + '</p>' : '') +
      '<div class="stack gap-2">' +
        d.segmentos.map(function (sg: any) {
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
        '<span class="n" id="conteoPaso1">' + ui.fmtInt(this.audienciaFinal()) + '</span>' +
        '<span class="lbl">contactos recibirán el mensaje, de ' + ui.fmtInt(s.tamano) +
        ' que tiene el segmento</span></div>' : '');
  }

  private contactoEjemplo(): any {
    var d = this.d;
    var s = this.segmento();
    if (!s) return d.contactos[0];
    var res = d.evaluarSegmento(s.reglas, s.logica);
    return res[0] || d.contactos[0];
  }

  private valorVariable(v: any): string {
    var ui = this.ui;
    var c = this.contactoEjemplo();
    var campo = this.st.mapeo[v.n];
    if (!campo) return '{{' + v.n + '}}';
    if (campo === '__fijo__') return v.ejemplo;
    var val = c[campo];
    if (val === null || val === undefined) return v.ejemplo;
    if (campo === 'nombre') return String(val).split(' ')[0];
    if (campo === 'cuotaMensual' || campo === 'montoCotizado' || campo === 'saldoInsoluto') return ui.fmtCLP(val);
    if (campo === 'proximoVencimiento' || campo === 'fechaCotizacion') return ui.fmtFechaLarga(val);
    return String(val);
  }

  private burbujaPreview(p: any, resaltarVars: boolean): string {
    var ui = this.ui;
    if (!p) return '';
    var cuerpo = ui.esc(p.body);
    cuerpo = cuerpo.replace(/\{\{(\d)\}\}/g, (m: string, n: string) => {
      var v = (p.variables || []).filter((x: any) => String(x.n) === n)[0];
      var txt = v ? this.valorVariable(v) : m;
      return resaltarVars ? '<span class="var-token">' + ui.esc(txt) + '</span>' : ui.esc(txt);
    }).replace(/\n/g, '<br>');

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
          }).join('') + '</div>'
        : '') +
      '</div>';
  }

  private telefono(p: any): string {
    var ui = this.ui;
    return '<div class="phone">' +
      '<div class="phone__bar"><span class="phone__avatar" aria-hidden="true">' + ui.logo(17) + '</span>' +
        '<span><strong>MAF Chile</strong><small>cuenta de empresa</small></span></div>' +
      '<div class="phone__screen">' +
        '<div class="day-sep" style="align-self:center">hoy</div>' +
        (p ? this.burbujaPreview(p, true) : '<p class="small" style="text-align:center;color:var(--wa-meta);padding:var(--sp-6) 0">Elige una plantilla para ver la vista previa</p>') +
      '</div></div>';
  }

  private camposDisponibles() {
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

  private paso2(): string {
    var ui = this.ui, d = this.d, st = this.st;
    var aprobadas = d.plantillas.filter(function (p: any) { return p.estado === 'aprobada'; });
    var p = this.plantilla();
    var c = this.contactoEjemplo();

    return '<div class="tpl-grid">' +
      '<div>' +
        '<div class="field">' +
          '<label class="field__label" for="selPlantilla">Plantilla aprobada por Meta</label>' +
          '<select class="select" id="selPlantilla"' + (st.errores.plantilla ? ' aria-invalid="true" aria-describedby="errPlantilla"' : '') + '>' +
            '<option value="">Selecciona una plantilla…</option>' +
            aprobadas.map(function (x: any) {
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
              p.variables.map((v: any) => {
                return '<div class="field">' +
                  '<label class="field__label" for="var' + v.n + '">' +
                    '<span class="var-token">{{' + v.n + '}}</span> ' + ui.esc(v.descripcion) + '</label>' +
                  '<select class="select" id="var' + v.n + '" data-var="' + v.n + '">' +
                    '<option value="">Sin asignar</option>' +
                    '<option value="__fijo__"' + (st.mapeo[v.n] === '__fijo__' ? ' selected' : '') + '>Texto fijo · «' + ui.esc(v.ejemplo) + '»</option>' +
                    this.camposDisponibles().map(function (cp) {
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
        this.telefono(p) +
        '<p class="small dim" style="margin-top:var(--sp-3);text-align:center">' +
          'Datos de ejemplo tomados de <strong>' + ui.esc(c.nombre) + '</strong>, un contacto real del segmento.</p>' +
      '</div>' +
    '</div>';
  }

  private paso3(): string {
    var st = this.st;
    var horas = Math.ceil(this.audienciaFinal() / parseInt(st.velocidad, 10));
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

        '<div class="callout callout--info" style="margin-top:var(--sp-5)">' + this.ui.icon('clock') +
          '<span>Con esta configuración el envío completo toma cerca de <strong>' + horas +
          (horas === 1 ? ' hora' : ' horas') + '</strong> de ventana activa.</span></div>' +
      '</div>' +
    '</div>';
  }

  private paso4(): string {
    var ui = this.ui, d = this.d, st = this.st;
    var s = this.segmento(), p = this.plantilla(), n = this.audienciaFinal(), costo = this.costoEstimado();
    var sinMapear = p ? p.variables.filter((v: any) => !st.mapeo[v.n]).length : 0;

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
          '<dt>Si hay límite</dt><dd>' + ({ omitir: 'Omitir el contacto', reintentar: 'Reintentar después', utility: 'Sustituir por utility' } as any)[st.siLimite] + '</dd>' +
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

        '<div class="field" style="margin-top:var(--sp-4)">' +
          '<label class="field__label" for="fTelefonoPrueba">Número de prueba <span class="opt">(opcional)</span></label>' +
          '<input class="input" id="fTelefonoPrueba" type="text" value="' + ui.esc(st.telefonoPrueba) + '" ' +
            'placeholder="+56912345678"' + (st.pruebaEnviando ? ' disabled' : '') + '>' +
          '<p class="field__hint">Si pones un número, al confirmar se manda de verdad un WhatsApp de texto a ese número (vía UltraMsg) con el contenido de la plantilla, para que veas cómo llega. La audiencia real de la campaña sigue siendo una simulación.</p>' +
        '</div>' +
        (st.pruebaResultado
          ? '<div class="callout callout--' + (st.pruebaResultado.ok ? 'ok' : 'danger') + '" style="margin-top:var(--sp-3)">' +
            ui.icon(st.pruebaResultado.ok ? 'check' : 'alertCircle') +
            '<span><strong>' + (st.pruebaResultado.ok ? 'Mensaje de prueba enviado. ' : 'No se pudo enviar la prueba. ') + '</strong>' +
            ui.esc(st.pruebaResultado.detalle) + '</span></div>'
          : '') +
      '</div>' +
    '</div>';
  }

  private textoFinalPlantilla(): string {
    var p = this.plantilla();
    if (!p) return '';
    return String(p.body).replace(/\{\{(\d)\}\}/g, (m: string, n: string) => {
      var v = (p.variables || []).filter((x: any) => String(x.n) === n)[0];
      return v ? this.valorVariable(v) : m;
    });
  }

  private validar(): boolean {
    var st = this.st;
    st.errores = {};
    if (st.paso === 1 && !st.segmentoId) st.errores.segmento = 'Elige un segmento para continuar.';
    if (st.paso === 2) {
      if (!st.plantillaId) st.errores.plantilla = 'Elige una plantilla aprobada.';
      else {
        var p = this.plantilla();
        var falta = p.variables.filter((v: any) => !st.mapeo[v.n]);
        if (falta.length) st.errores.mapeo = 'Falta asignar ' + falta.length + ' variable(s) de la plantilla.';
      }
    }
    if (st.paso === 4 && !st.nombre.trim()) st.errores.nombre = 'Ponle un nombre a la campaña.';
    return Object.keys(st.errores).length === 0;
  }

  private cuerpo(): string {
    var st = this.st;
    if (st.paso === 1) return this.paso1();
    if (st.paso === 2) return this.paso2();
    if (st.paso === 3) return this.paso3();
    return this.paso4();
  }

  private pie(): string {
    var ui = this.ui, st = this.st;
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

  private render(): string {
    return '<section class="card">' + this.stepper() +
      '<div class="wizard__body" id="wizCuerpo">' + this.cuerpo() + '</div>' +
      '<div class="wizard__foot" id="wizPie">' + this.pie() + '</div></section>';
  }

  private repintar() {
    this.html = this.sanitizer.bypassSecurityTrustHtml(this.render());
    this.chrome.set('Crear campaña', this.subtituloTxt(),
      '<a class="btn btn--sm" href="#/campanas">' + this.ui.icon('x', 14) + 'Salir del asistente</a>');
    setTimeout(() => {
      var cuerpoEl = this.elRef.nativeElement.querySelector('.wizard__body');
      if (cuerpoEl) cuerpoEl.scrollIntoView({ block: 'nearest' });
    });
  }

  private actualizarConteo() {
    var n = this.elRef.nativeElement.querySelector('#conteoPaso1');
    if (n) n.textContent = this.ui.fmtInt(this.audienciaFinal());
  }

  onChange(e: Event) {
    var t = e.target as any;
    var st = this.st;

    if (t.name === 'segmento') { st.segmentoId = t.value; st.errores = {}; this.repintar(); }
    if (t.id === 'excOptIn') { st.excluirSinOptIn = t.checked; this.actualizarConteo(); }
    if (t.id === 'excCont') { st.excluirContactados = t.checked; this.actualizarConteo(); }

    if (t.id === 'selPlantilla') {
      st.plantillaId = t.value;
      st.mapeo = {};
      var p = this.plantilla();
      if (p) p.variables.forEach((v: any) => { st.mapeo[v.n] = v.campo; });
      st.errores = {};
      this.repintar();
    }
    if (t.hasAttribute && t.hasAttribute('data-var')) {
      st.mapeo[t.getAttribute('data-var')] = t.value;
      this.repintar();
    }

    if (t.name === 'modo') { st.modo = t.value; this.repintar(); }
    if (t.id === 'fFecha') st.fecha = t.value;
    if (t.id === 'fHoraIni') st.horaIni = t.value;
    if (t.id === 'fHoraFin') st.horaFin = t.value;
    if (t.id === 'fVelocidad') { st.velocidad = t.value; this.repintar(); }
    if (t.id === 'fLimite') st.siLimite = t.value;
  }

  onInput(e: Event) {
    var t = e.target as HTMLInputElement;
    if (t.id === 'fNombre') this.st.nombre = t.value;
    if (t.id === 'fTelefonoPrueba') this.st.telefonoPrueba = t.value;
  }

  onClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var ir = target.closest('[data-ir]');
    if (ir) { this.st.paso = parseInt(ir.getAttribute('data-ir')!, 10); this.st.errores = {}; this.repintar(); return; }

    if (target.closest('[data-atras]')) { this.st.paso--; this.st.errores = {}; this.repintar(); return; }

    if (target.closest('[data-siguiente]')) {
      if (!this.validar()) { this.repintar(); return; }
      this.st.paso++;
      this.repintar();
      return;
    }

    if (target.closest('[data-confirmar]')) {
      if (!this.validar()) { this.repintar(); return; }
      this.confirmar();
    }
  }

  private confirmar() {
    var btn = this.elRef.nativeElement.querySelector('[data-confirmar]');
    var telefono = String(this.st.telefonoPrueba || '').trim();
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + (telefono ? 'Enviando prueba…' : 'Procesando…'); }

    var envioPrueba: Promise<any> = telefono
      ? this.whatsapp.enviarTexto(telefono, this.textoFinalPlantilla())
      : Promise.resolve(null);

    envioPrueba.then((resultado) => {
      if (resultado) {
        this.st.pruebaResultado = resultado;
        if (!resultado.ok) {
          // La prueba falló: nos quedamos en el paso para que se vea el motivo
          // y se pueda corregir el número o reintentar, en vez de simular un
          // éxito que no ocurrió.
          this.ui.toast('No se pudo enviar la prueba', resultado.detalle, 'danger');
          this.repintar();
          return;
        }
        this.ui.toast('Mensaje de prueba enviado', 'Revisa WhatsApp en ' + telefono + '. ' + resultado.detalle, 'ok');
      }

      var n = this.audienciaFinal(), costo = this.costoEstimado();
      setTimeout(() => {
        this.ui.toast(
          this.st.modo === 'ahora' ? 'Campaña en curso' : 'Campaña programada',
          '«' + this.st.nombre + '» · ' + this.ui.fmtInt(n) + ' contactos · ' + this.ui.fmtUSD(costo) + ' estimados.',
          'ok'
        );
        location.hash = '#/campanas';
      }, telefono ? 300 : 900);
    });
  }
}
