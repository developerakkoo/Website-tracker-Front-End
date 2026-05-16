import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Subscription, take } from 'rxjs';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { Projects, ProjectStatus } from 'src/app/services/projects';
import { SessionService } from 'src/app/services/session';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit, OnDestroy {
  public folder = 'Dashboard';
  projectName = '';
  sessionsCount = 0;
  installStatus: ProjectStatus | null = null;
  loadingKpi = true;
  private sub = new Subscription();
  private activatedRoute = inject(ActivatedRoute);

  constructor(
    private menuController: MenuController,
    private projectContext: ProjectContextService,
    private projectsApi: Projects,
    private sessionService: SessionService
  ) {
    this.menuController.enable(true);
  }

  ngOnInit(): void {
    this.sub.add(
      this.activatedRoute.paramMap.subscribe((p) => {
        const id = p.get('id');
        this.folder = id === 'Home' || !id ? 'Dashboard' : id;
      })
    );
    this.sub.add(
      this.projectContext.activeProject$.subscribe(() => {
        this.loadProjectKpis();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private loadProjectKpis(): void {
    const projectId = this.projectContext.activeProjectId;
    const active = this.projectContext.activeProject;
    this.projectName = active?.name ?? '';
    if (!projectId) {
      this.loadingKpi = false;
      this.sessionsCount = 0;
      this.installStatus = null;
      return;
    }

    this.loadingKpi = true;
    this.sessionService
      .getProjectSessions(projectId)
      .pipe(take(1))
      .subscribe({
        next: (sessions) => {
          this.sessionsCount = Array.isArray(sessions) ? sessions.length : 0;
          this.loadingKpi = false;
        },
        error: () => {
          this.sessionsCount = 0;
          this.loadingKpi = false;
        },
      });

    this.projectsApi
      .getProjectStatus(projectId)
      .pipe(take(1))
      .subscribe({
        next: (status) => {
          this.installStatus = status;
        },
        error: () => {
          this.installStatus = null;
        },
      });
  }

  installLabel(): string {
    if (!this.installStatus) return 'Unknown';
    return this.installStatus.installed ? 'Installed' : 'Not installed';
  }
}
