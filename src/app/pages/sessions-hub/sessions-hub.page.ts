import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { ProjectSession, SessionService } from 'src/app/services/session';

@Component({
  selector: 'app-sessions-hub',
  templateUrl: './sessions-hub.page.html',
  styleUrls: ['./sessions-hub.page.scss'],
  standalone: false,
})
export class SessionsHubPage implements OnInit, OnDestroy {
  projectName = '';
  sessions: ProjectSession[] = [];
  loading = true;
  error = '';
  readonly skeletonSlots = [1, 2, 3, 4, 5];
  private sub = new Subscription();

  constructor(
    public projectContext: ProjectContextService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.projectContext.activeProject$.subscribe(() => {
        this.loadSessions();
      })
    );
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadSessions(): void {
    const projectId = this.projectContext.activeProjectId;
    this.projectName = this.projectContext.activeProject?.name ?? '';
    if (!projectId) {
      this.loading = false;
      this.sessions = [];
      return;
    }

    this.loading = true;
    this.error = '';
    this.sessionService.getProjectSessions(projectId).subscribe({
      next: (list) => {
        this.sessions = Array.isArray(list) ? list : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load recordings. Please try again.';
        this.sessions = [];
        this.loading = false;
      },
    });
  }

  trackBySessionId(_index: number, s: ProjectSession): string {
    return s.sessionId;
  }

  openReplay(session: ProjectSession): void {
    const id = session.sessionId || (session as { _id?: string })._id;
    if (id) {
      void this.router.navigate(['/replay', id]);
    }
  }
}
