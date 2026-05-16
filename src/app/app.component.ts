import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { Auth } from './services/auth';
import { ProjectContextService } from './services/project-context.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  showShell = false;
  activeProjectName = '';
  private sub = new Subscription();

  readonly appPages = [
    { title: 'Dashboard', url: '/folder/Home', icon: 'grid-outline', exact: true },
    { title: 'Projects', url: '/projects', icon: 'folder-outline', exact: true },
    { title: 'Sessions', url: '/sessions', icon: 'videocam-outline', exact: true },
    { title: 'Heatmaps', url: '/heatmaps', icon: 'flame-outline', exact: true },
    { title: 'Funnels', url: '/funnels', icon: 'filter-outline', exact: true },
    { title: 'User journeys', url: '/journeys', icon: 'git-network-outline', exact: true },
    { title: 'AI insights', url: '/ai-insights', icon: 'sparkles-outline', exact: true },
    { title: 'Alerts', url: '/alerts', icon: 'notifications-outline', exact: true },
    { title: 'Settings', url: '/settings', icon: 'settings-outline', exact: true },
  ];

  constructor(
    private router: Router,
    private menuCtrl: MenuController,
    private auth: Auth,
    private projectContext: ProjectContextService
  ) {
    this.applyShell(this.router.url);
  }

  ngOnInit(): void {
    void this.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        await this.projectContext.initFromStorage();
      }
    });
    this.sub.add(
      this.projectContext.activeProject$.subscribe((p) => {
        this.activeProjectName = p?.name ?? '';
      })
    );
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.applyShell(e.urlAfterRedirects))
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private applyShell(url: string): void {
    const path = (url.split('?')[0] || '/').replace(/\/$/, '') || '/';
    const guest = path === '/' || path === '/register' || path === '/select-project';
    this.showShell = !guest;
    void this.menuCtrl.enable(!guest, 'app-menu');
  }
}
