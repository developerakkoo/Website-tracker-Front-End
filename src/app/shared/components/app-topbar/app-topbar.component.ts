import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { ProjectContextService, ProjectSummary } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './app-topbar.component.html',
  styleUrls: ['./app-topbar.component.scss'],
  standalone: false,
})
export class AppTopbarComponent implements OnInit, OnDestroy {
  projects: ProjectSummary[] = [];
  selectedProjectId = '';
  searchOpen = false;
  searchQuery = '';
  mobileProjectOpen = false;

  private sub = new Subscription();

  constructor(
    private projectContext: ProjectContextService,
    private router: Router,
    private menuCtrl: MenuController
  ) {}

  ngOnInit(): void {
    void this.projectContext.initFromStorage();
    void this.projectContext.refreshProjects().then((list) => {
      this.projects = list;
    });

    this.sub.add(
      this.projectContext.activeProject$.subscribe((p) => {
        this.selectedProjectId = p?.id ?? '';
      })
    );

    this.sub.add(
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
        this.projects = this.projectContext.projects;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async openMenu(): Promise<void> {
    await this.menuCtrl.open();
  }

  async onProjectChange(projectId: string): Promise<void> {
    if (!projectId) return;
    const ok = await this.projectContext.setActiveProjectById(projectId);
    if (!ok) return;

    this.mobileProjectOpen = false;
    const url = this.router.url.split('?')[0];

    if (url.startsWith('/heatmaps/') && url !== '/heatmaps') {
      void this.router.navigate(['/heatmaps', projectId]);
      return;
    }
    if (url.startsWith('/projects/details/')) {
      void this.router.navigate(['/projects/details', projectId]);
      return;
    }
    void this.router.navigateByUrl(url, { onSameUrlNavigation: 'reload' });
  }

  onSearchSubmit(): void {
    if (!this.searchQuery.trim()) return;
    void this.router.navigate(['/projects']);
    this.searchOpen = false;
  }

  pageTitle(): string {
    const active = this.projectContext.activeProject;
    const u = this.router.url.split('?')[0];
    if (u.startsWith('/projects/details')) return active?.name || 'Project';
    if (u.startsWith('/projects/add')) return 'New project';
    if (u.startsWith('/projects')) return 'Projects';
    if (u.startsWith('/replay/')) return 'Replay';
    if (u.startsWith('/heatmaps/')) return active?.name ? `Heatmaps · ${active.name}` : 'Heatmaps';
    if (u.startsWith('/folder')) return active?.name ? `Dashboard · ${active.name}` : 'Dashboard';
    const seg = u.split('/').filter(Boolean)[0];
    if (seg) return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    return 'Website Tracker';
  }
}
