import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { UiService } from './services/ui.service';
import { DataService } from './services/data.service';
import { PageChromeService } from './services/page-chrome.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  ui = inject(UiService);
  data = inject(DataService);
  chrome = inject(PageChromeService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  menuAbierto = false;

  NAV: any[] = [
    { grupo: 'General', items: [
      { ruta: 'dashboard', label: 'Dashboard', icono: 'dashboard' }
    ]},
    { grupo: 'Activación', items: [
      { ruta: 'campanas', label: 'Campañas', icono: 'send' },
      { ruta: 'audiencias', label: 'Audiencias', icono: 'users' },
      { ruta: 'plantillas', label: 'Plantillas', icono: 'template' },
      { ruta: 'journeys', label: 'Journeys', icono: 'flow' }
    ]},
    { grupo: 'Operación', items: [
      { ruta: 'conversaciones', label: 'Conversaciones', icono: 'inbox', contador: true },
      { ruta: 'agente', label: 'Agente IA', icono: 'bot' }
    ]},
    { grupo: 'Control', items: [
      { ruta: 'gobernanza', label: 'Gobernanza', icono: 'shield' },
      { ruta: 'reportes', label: 'Reportes', icono: 'chart' }
    ]}
  ];

  get sinLeer(): number {
    return this.data.d.conversaciones.reduce((a: number, c: any) => a + c.noLeidos, 0);
  }

  private trust(html: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(html); }

  get logoHtml(): SafeHtml { return this.trust(this.ui.logo(30, 'MAF')); }
  get iconMenuHtml(): SafeHtml { return this.trust(this.ui.icon('menu', 20)); }
  get iconXHtml(): SafeHtml { return this.trust(this.ui.icon('x', 18)); }
  icon(nombre: string, size?: number): SafeHtml { return this.trust(this.ui.icon(nombre, size)); }
  get accionesHtml(): SafeHtml { return this.trust(this.chrome.accionesHtml()); }

  ngOnInit() {
    this.router.events.subscribe((e) => {
      if (!(e instanceof NavigationEnd)) return;
      this.ui.cerrarModal();
      this.cerrarMenu();
      window.scrollTo(0, 0);
      var contenido = document.getElementById('contenido');
      if (contenido) contenido.focus({ preventScroll: true });
    });
  }

  abrirMenu() {
    this.menuAbierto = true;
    var primero = document.querySelector('#sidebar .nav-link') as HTMLElement | null;
    if (primero) primero.focus();
  }

  cerrarMenu(devolverFoco?: boolean) {
    this.menuAbierto = false;
    if (devolverFoco) {
      var burger = document.querySelector('.topbar__burger') as HTMLElement | null;
      if (burger) burger.focus();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.menuAbierto) this.cerrarMenu(true);
  }

  onTopbarClick(e: MouseEvent) {
    var target = e.target as HTMLElement;
    var b = target.closest('[data-global]') as HTMLElement | null;
    if (!b) return;
    var accion = b.getAttribute('data-global');
    if (accion === 'salud') { this.ui.mostrarSalud(); return; }
    if (accion === 'exportar') {
      this.ui.toast('Exportación solicitada', 'En el sistema real se genera un CSV y se envía por correo.', 'ok');
      return;
    }
    if (accion) this.chrome.onAccion(accion);
  }
}
