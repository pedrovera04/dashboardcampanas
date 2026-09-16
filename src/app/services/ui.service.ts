/* ===========================================================
   MAF · Utilidades de interfaz compartidas
   Puerto directo de legacy-static/js/ui.js.
   =========================================================== */
import { Injectable } from '@angular/core';
import { DataService } from './data.service';

@Injectable({ providedIn: 'root' })
export class UiService {
  constructor(private data: DataService) {}

  /* ---------- Formateo (es-CL) ---------- */
  private nfInt = new Intl.NumberFormat('es-CL');
  private nfDec = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  private nfDec4 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  private MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  private MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  fmtInt = (n: any) => this.nfInt.format(Math.round(n || 0));
  fmtCLP = (n: any) => '$' + this.nfInt.format(Math.round(n || 0));
  fmtCLPCorto = (n: any) => {
    n = n || 0;
    // Montos de mil millones o más se siguen expresando en "MM" (millones),
    // solo que con el número completo: evita el "MM MM" confuso de duplicar
    // la unidad al cambiar de escala.
    if (n >= 1000000) return '$' + this.nfDec.format(n / 1000000) + ' MM';
    if (n >= 1000) return '$' + this.fmtInt(n / 1000) + ' M';
    return this.fmtCLP(n);
  };
  fmtUSD = (n: any) => 'US$ ' + this.nfDec.format(n || 0);
  fmtUSDUnit = (n: any) => 'US$ ' + this.nfDec4.format(n || 0);
  fmtPct = (n: any, dec?: any) => {
    if (dec === undefined) dec = 1;
    return (n * 100).toFixed(dec).replace('.', ',') + '%';
  };
  private dosDig = (n: any) => (n < 10 ? '0' + n : String(n));
  fmtFecha = (d: any) => { d = new Date(d); return d.getDate() + ' ' + this.MESES[d.getMonth()] + ' ' + d.getFullYear(); };
  fmtFechaLarga = (d: any) => { d = new Date(d); return d.getDate() + ' de ' + this.MESES_LARGO[d.getMonth()]; };
  fmtHora = (d: any) => { d = new Date(d); return this.dosDig(d.getHours()) + ':' + this.dosDig(d.getMinutes()); };
  fmtFechaHora = (d: any) => this.fmtFecha(d) + ', ' + this.fmtHora(d);
  fmtRelativo = (d: any) => {
    var hoy = this.data.d.HOY, t = new Date(d);
    var difMin = Math.round((hoy.getTime() - t.getTime()) / 60000);
    if (difMin < 1) return 'recién';
    if (difMin < 60) return 'hace ' + difMin + ' min';
    var mismoDia = t.toDateString() === hoy.toDateString();
    if (mismoDia) return this.fmtHora(t);
    var ayer = new Date(hoy.getTime()); ayer.setDate(ayer.getDate() - 1);
    if (t.toDateString() === ayer.toDateString()) return 'ayer';
    var difDias = Math.round((hoy.getTime() - t.getTime()) / 86400000);
    if (difDias < 7) return 'hace ' + difDias + ' días';
    return this.fmtFecha(t);
  };
  fmtDuracion = (min: any) => {
    if (min <= 0) return 'cerrada';
    var h = Math.floor(min / 60), m = min % 60;
    if (h >= 24) return Math.floor(h / 24) + ' d ' + (h % 24) + ' h';
    if (h === 0) return m + ' min';
    return h + ' h ' + m + ' min';
  };

  /* ---------- HTML ---------- */
  esc = (s: any) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  nl2br = (s: any) => this.esc(s).replace(/\n/g, '<br>');
  el = (html: string) => {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild as HTMLElement;
  };
  qs = (sel: string, ctx?: any) => (ctx || document).querySelector(sel);
  qsa = (sel: string, ctx?: any) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  /* ---------- Íconos SVG ---------- */
  private PATHS: any = {
    dashboard: '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    send: '<path d="M21.4 3.6 2.9 10.2c-.8.3-.8 1.4 0 1.7l6.4 2.2 2.2 6.4c.3.8 1.4.8 1.7 0L20.4 2.6"/><path d="m9.3 14.1 4.5-4.5"/>',
    users: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-1.5a4 4 0 0 0-3-3.9"/><path d="M16.5 3.8a4 4 0 0 1 0 7.4"/>',
    template: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h4"/>',
    flow: '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 7.5v9"/><path d="M8.5 5.6c4 .7 5.7 3 6.6 5.6"/><path d="M8.5 18.4c4-.7 5.7-3 6.6-5.6"/>',
    inbox: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M12 8V4.5"/><circle cx="12" cy="3.2" r="1.3"/><path d="M9 13.5h.01M15 13.5h.01"/><path d="M9.5 17h5"/>',
    shield: '<path d="M12 22s8-3.5 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.5 12 22 12 22z"/><path d="m9 12 2 2 4-4"/>',
    chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="1"/><rect x="10.5" y="6" width="3.5" height="12" rx="1"/><rect x="16" y="14" width="3.5" height="4" rx="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    checks: '<path d="m1 12.5 4 4 8.5-9"/><path d="m9.5 16.5 1 1 9-10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17.2h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16.2h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11"/><path d="M14.8 9.4c-.4-.9-1.4-1.4-2.8-1.4-1.7 0-2.8.8-2.8 2s1 1.7 2.8 2 2.8.9 2.8 2-1.1 2-2.8 2c-1.5 0-2.5-.6-2.8-1.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
    edit: '<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6M14 11v6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
    play: '<path d="M6 4.5v15l13-7.5z"/>',
    pause: '<rect x="7" y="4.5" width="3.5" height="15" rx="1"/><rect x="13.5" y="4.5" width="3.5" height="15" rx="1"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m5.5 11.5 6.5-6.5 6.5 6.5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m5.5 12.5 6.5 6.5 6.5-6.5"/>',
    arrowRight: '<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    phone: '<path d="M6.6 3h3l1.5 4-2 1.5a12 12 0 0 0 5.4 5.4L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3z"/>',
    car: '<path d="M5 13 6.8 7.6A2 2 0 0 1 8.7 6.2h6.6a2 2 0 0 1 1.9 1.4L19 13"/><path d="M4 13h16a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/><circle cx="7.5" cy="18.5" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    archive: '<rect x="3" y="4" width="18" height="4.5" rx="1.5"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5"/><path d="M10 12.5h4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-13.7-5.2L3 9"/><path d="M4 13a8 8 0 0 0 13.7 5.2L21 15"/><path d="M3 4.5V9h4.5M21 19.5V15h-4.5"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    zap: '<path d="M13.5 2 4 14h6.5L10 22l9.5-12H13z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    split: '<path d="M6 3v6a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4"/><path d="M6 3v18"/><path d="m15 9 3-3-3-3"/>',
    handoff: '<path d="M8 8h9a3 3 0 0 1 0 6h-2"/><path d="m18 5 3 3-3 3"/><circle cx="5" cy="17" r="3"/><path d="M5 11V8"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4.5h11l-1.8 3.5L16 11.5H5z"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>'
  };

  icon = (name: string, size?: number) => {
    var p = this.PATHS[name] || this.PATHS.info;
    var s = size || 16;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + p + '</svg>';
  };

  /* ---------- Logotipo MAF ----------
     Fuente: assets/logo-maf.svg, incorporado al proyecto para que la maqueta
     funcione sin conexión. Se inyecta inline para poder escalarlo y darle
     nombre accesible sin una petición extra. Se omite el clipPath del export
     original: es un rect del tamaño del viewBox (no recorta nada) y su id se
     repetiría cada vez que el logotipo aparece dos veces en la misma página. */
  private LOGO_CUERPO = '<path d="M5.9522 38.5153C6.20505 38.5153 6.41162 38.3109 6.41162 38.0581V5.58683C6.41162 2.5842 4.00388 0.143722 1.01141 0.0940545C0.978676 0.0917969 0.949327 0.0917969 0.916591 0.0917969C0.883856 0.0917969 0.854507 0.0917969 0.821772 0.0940545H0.916591C0.409757 0.0940545 0 0.503811 0 1.00839V38.0581C0 38.3109 0.206572 38.5153 0.459425 38.5153H5.9522Z" fill="#E30521"/> <path d="M55.8635 7.60824C55.8635 3.82561 58.6437 0.694295 62.274 0.142308C62.274 0.142308 65.6299 -0.442414 66.6086 0.758637C66.7136 0.887321 66.8524 0.984399 66.8524 1.15033V5.27838C66.8524 5.6238 66.5251 5.9139 66.1966 5.80779C65.5667 5.60461 64.7178 5.38562 63.9435 5.76715C63.3475 6.06064 62.1453 6.76276 62.274 9.21679V13.7964H66.8524V14.713C66.8524 17.2415 64.8025 19.2914 62.274 19.2914V54.5429C62.274 54.7958 62.0674 55.0001 61.8168 55.0001H56.3218C56.0689 55.0001 55.8646 54.7958 55.8646 54.5429V19.2903H54.4909C54.238 19.2903 54.0337 19.086 54.0337 18.8331V14.2524C54.0337 13.9995 54.238 13.7952 54.4909 13.7952H55.8646V7.60824H55.8635Z" fill="#E30521"/> <path d="M18.3147 5.68405C18.3169 5.65131 18.3169 5.62196 18.3169 5.58923C18.3169 5.55649 18.3169 5.52714 18.3147 5.49441C18.265 2.50194 15.8234 0.0546875 12.8197 0.0546875C11.3951 0.0546875 9.50096 0.604417 8.24121 2.51097L8.27169 6.20104C8.27169 6.23829 8.27959 6.2778 8.29878 6.30941C8.48165 6.6108 8.95913 6.51146 9.24359 6.12428C9.42081 5.89401 9.73124 5.58923 10.4243 5.58923C11.2991 5.58923 11.9042 6.48212 11.9042 7.13118V38.0582C11.9042 38.3111 12.1108 38.5154 12.3614 38.5154H17.8564C18.1092 38.5154 18.3136 38.3111 18.3136 38.0582V5.49441" fill="#E30521"/> <path d="M30.2169 5.68405C30.2191 5.65131 30.2191 5.62196 30.2191 5.58923C30.2191 5.55649 30.2191 5.52714 30.2169 5.49441C30.1672 2.50194 27.7267 0.0546875 24.723 0.0546875C23.2984 0.0546875 21.4043 0.604417 20.1445 2.51097L20.175 6.20104C20.175 6.23829 20.1829 6.2778 20.2021 6.30941C20.385 6.6108 20.8625 6.51146 21.1469 6.12428C21.3241 5.89401 21.6346 5.58923 22.3276 5.58923C23.2025 5.58923 23.8075 6.48212 23.8075 7.13118V38.0582C23.8075 38.3111 24.0141 38.5154 24.2647 38.5154H29.7597C30.0126 38.5154 30.2169 38.3111 30.2169 38.0582V5.49441" fill="#E30521"/> <path d="M43.9565 37.2173V38.5165H49.9008C50.1536 38.5165 50.358 38.3122 50.358 38.0594V6.46518C50.358 3.71767 47.6206 0.0546875 43.4971 0.0546875L42.5805 0.0580739C38.4615 0.0580739 35.706 3.71767 35.706 6.46518V13.3396C35.706 13.5925 35.9104 13.7968 36.1632 13.7968H41.2203C41.4584 13.7968 41.6537 13.6162 41.6774 13.3848V7.36259C41.6774 6.82866 41.6752 5.56214 42.8164 5.56214C43.9576 5.56214 43.9565 6.92235 43.9565 7.40096V18.6811C43.9565 18.6992 43.9362 18.7094 43.9215 18.6981C42.9157 17.9203 41.6549 17.4575 40.2856 17.4575C37.695 17.4575 36.1768 18.373 35.7151 22.0382C35.3855 24.6559 35.5683 31.913 35.7151 33.0226C36.1948 36.6506 37.546 38.5256 40.2856 38.5256C42.2204 38.5256 43.7307 37.3697 43.9328 37.2071C43.9418 37.1992 43.9554 37.2071 43.9554 37.2184L43.9565 37.2173ZM42.8164 33.9381C42.5331 33.9381 41.7993 33.6886 41.6752 32.5643C41.3535 30.2751 41.262 25.6989 41.6752 23.4097C41.8061 22.4773 42.3965 22.0247 42.8164 22.0303C43.2363 22.036 43.9576 22.4006 43.9576 23.4097V32.5643C43.9576 33.7631 43.0997 33.9381 42.8164 33.9381Z" fill="#E30521"/>';

  logo = (alto?: number, etiqueta?: string) => {
    var h = alto || 30;
    var w = Math.round(h * 66.8525 / 55 * 10) / 10;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 67 55" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + this.esc(etiqueta || 'MAF') + '">' +
      this.LOGO_CUERPO + '</svg>';
  };

  /* ---------- Badges ---------- */
  private TONO_CAMPANA: any = { borrador: 'muted', programada: 'info', en_curso: 'ok', finalizada: 'muted', pausada: 'warn' };
  private TONO_PLANTILLA: any = { aprobada: 'ok', en_revision: 'warn', rechazada: 'danger', pausada: 'muted' };
  private TONO_QUALITY: any = { alta: 'ok', media: 'warn', baja: 'danger' };
  private TONO_CONSENT: any = { vigente: 'ok', revocado: 'danger', sin_registro: 'warn' };

  badge = (texto: any, tono?: any, plano?: any) =>
    '<span class="badge badge--' + (tono || 'muted') + (plano ? ' badge--plain' : '') + '">' + this.esc(texto) + '</span>';
  badgeCampana = (e: any) => this.badge(this.data.d.labels.estadoCampana[e] || e, this.TONO_CAMPANA[e]);
  badgePlantilla = (e: any) => this.badge(this.data.d.labels.estadoPlantilla[e] || e, this.TONO_PLANTILLA[e]);
  badgeQuality = (q: any) => q ? this.badge(this.data.d.labels.quality[q], this.TONO_QUALITY[q]) : '<span class="dim small">—</span>';
  badgeConsent = (c: any) => this.badge(this.data.d.labels.consentimiento[c] || c, this.TONO_CONSENT[c]);
  catTag = (c: any) => '<span class="cat-tag cat-tag--' + c + '">' + (this.data.d.labels.categoria[c] || c) + '</span>';

  delta = (valor: any, textoExtra?: any) => {
    var dir = valor > 0 ? 'up' : valor < 0 ? 'down' : 'flat';
    var ic = valor > 0 ? this.icon('arrowUp', 12) : valor < 0 ? this.icon('arrowDown', 12) : '';
    var signo = valor > 0 ? '+' : '';
    return '<span class="delta delta--' + dir + '">' + ic + signo + this.fmtPct(valor, 1) + '</span>' +
      (textoExtra ? ' <span class="dim">' + this.esc(textoExtra) + '</span>' : '');
  };

  /* ---------- Estados ---------- */
  estadoVacio = (o: any) =>
    '<div class="state">' +
      '<div class="state__icon">' + this.icon(o.icono || 'archive', 24) + '</div>' +
      '<h3>' + this.esc(o.titulo) + '</h3>' +
      '<p>' + this.esc(o.texto) + '</p>' +
      (o.accion ? '<button type="button" class="btn btn--primary" data-accion="' + this.esc(o.accion) + '">' +
        this.icon('plus') + this.esc(o.accionTexto || 'Crear') + '</button>' : '') +
      '</div>';
  estadoError = (o: any) =>
    '<div class="state state--error">' +
      '<div class="state__icon">' + this.icon('alertCircle', 24) + '</div>' +
      '<h3>' + this.esc(o.titulo || 'No pudimos cargar la información') + '</h3>' +
      '<p>' + this.esc(o.texto) + '</p>' +
      (o.detalle ? '<p class="small dim mono">' + this.esc(o.detalle) + '</p>' : '') +
      '<button type="button" class="btn" data-accion="' + this.esc(o.accion || 'reintentar') + '">' +
        this.icon('refresh') + 'Reintentar</button>' +
      '</div>';
  skeletonTabla = (filas?: number, cols?: number) => {
    var out = '';
    for (var i = 0; i < (filas || 5); i++) {
      out += '<div class="sk-row">';
      for (var j = 0; j < (cols || 5); j++) {
        out += '<div class="skeleton sk-line grow" style="height:14px;max-width:' + (j === 0 ? '100%' : '80px') + '"></div>';
      }
      out += '</div>';
    }
    return '<div aria-busy="true" aria-live="polite"><span class="sr-only">Cargando datos…</span>' + out + '</div>';
  };
  skeletonKpis = (n?: number) => {
    var out = '';
    for (var i = 0; i < (n || 4); i++) {
      out += '<div class="kpi" aria-hidden="true">' +
        '<div class="skeleton sk-line" style="width:60%"></div>' +
        '<div class="skeleton sk-line" style="width:45%;height:28px"></div>' +
        '<div class="skeleton sk-line" style="width:70%"></div></div>';
    }
    return out;
  };

  /* ---------- Barras ---------- */
  COLORES_CAT: any = { marketing: '#8a3fb8', utility: '#1a4fd6', authentication: '#6e7885' };
  barra = (pct: any, tono?: any) =>
    '<div class="bar' + (tono ? ' bar--' + tono : '') + '"><span style="width:' +
      Math.max(0, Math.min(100, pct * 100)).toFixed(1) + '%"></span></div>';
  barraApilada = (partes: any[]) => { // [{valor, color, label}]
    var total = partes.reduce(function (a, p) { return a + p.valor; }, 0) || 1;
    return '<div class="stacked">' + partes.map((p: any) => {
      return '<span style="width:' + (p.valor / total * 100).toFixed(2) + '%;background:' + p.color +
        '" title="' + this.esc(p.label) + '"></span>';
    }).join('') + '</div>';
  };
  leyenda = (partes: any[]) =>
    '<ul class="legend">' + partes.map((p: any) => {
      return '<li><span class="dot" style="background:' + p.color + '"></span>' + this.esc(p.label) + '</li>';
    }).join('') + '</ul>';

  /* ---------- Toast ---------- */
  toast(titulo: any, detalle?: any, tono?: any) {
    var stack = document.getElementById('toastStack');
    if (!stack) return;
    var t = this.el('<div class="toast toast--' + (tono || 'ok') + '" role="status">' +
      '<span style="color:var(--' + (tono === 'danger' ? 'danger' : tono === 'warn' ? 'warn' : 'ok') + ')">' +
      this.icon(tono === 'danger' ? 'alertCircle' : tono === 'warn' ? 'alert' : 'check', 18) + '</span>' +
      '<span><strong>' + this.esc(titulo) + '</strong>' +
      (detalle ? '<small>' + this.esc(detalle) + '</small>' : '') + '</span></div>');
    stack.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
      t.style.opacity = '0'; t.style.transform = 'translateY(6px)';
      setTimeout(function () { t.remove(); }, 220);
    }, 4200);
  }

  /* ---------- Modal con foco atrapado ---------- */
  private modalPrevio: any = null;

  abrirModal(o: any) {
    var root = document.getElementById('modalRoot');
    if (!root) return;
    this.modalPrevio = document.activeElement;
    root.innerHTML =
      '<div class="modal' + (o.ancho === 'wide' ? ' modal--wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">' +
        '<div class="modal__head">' +
          '<div class="grow"><h2 id="modalTitulo">' + this.esc(o.titulo) + '</h2>' +
          (o.sub ? '<p>' + this.esc(o.sub) + '</p>' : '') + '</div>' +
          '<button type="button" class="icon-btn" data-cerrar aria-label="Cerrar">' + this.icon('x', 18) + '</button>' +
        '</div>' +
        '<div class="modal__body">' + o.cuerpo + '</div>' +
        (o.pie ? '<div class="modal__foot">' + o.pie + '</div>' : '') +
      '</div>';
    root.hidden = false;
    document.body.style.overflow = 'hidden';

    var modal = this.qs('.modal', root);
    var focusables = this.qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal);
    (focusables[0] || modal).focus();

    var self = this;
    root.addEventListener('click', function (e: any) {
      if (e.target === root || e.target.closest('[data-cerrar]')) self.cerrarModal();
    });
    root.addEventListener('keydown', function (e: any) {
      if (e.key === 'Escape') { e.preventDefault(); self.cerrarModal(); return; }
      if (e.key !== 'Tab') return;
      var f = self.qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal)
        .filter(function (x: any) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });
    if (o.alMontar) o.alMontar(modal);
    return modal;
  }

  cerrarModal() {
    var root = document.getElementById('modalRoot');
    if (!root) return;
    root.hidden = true;
    root.innerHTML = '';
    document.body.style.overflow = '';
    if (this.modalPrevio && this.modalPrevio.focus) this.modalPrevio.focus();
    this.modalPrevio = null;
  }

  /* ---------- Salud de la cuenta (modal compartido) ---------- */
  mostrarSalud() {
    var ui = this, c = this.data.d.cuenta;
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

  /* ---------- Varios ---------- */
  tablaWrap = (html: string) => '<div class="table-wrap">' + html + '</div>';
  iniciales = (nombre: string) => {
    var p = nombre.split(' ');
    return ((p[0] || '')[0] + (p[1] || '')[0]).toUpperCase();
  };
  deb = (fn: Function, ms?: number) => {
    var t: any;
    return function (this: any, ...args: any[]) {
      clearTimeout(t);
      var ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 220);
    };
  };
}
