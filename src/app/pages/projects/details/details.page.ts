import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Projects, ProjectStatus } from 'src/app/services/projects';
import { SessionService, ProjectSession } from 'src/app/services/session';
import { GoalsService, TrackedGoal } from 'src/app/services/goals.service';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  standalone: false
})
export class DetailsPage implements OnInit {
  project: any = null;
  projectId: string = '';
  status: ProjectStatus | null = null;
  trackerDomain: string = '';
  installationSnippet: string = '';
  sessions: ProjectSession[] = [];
  sessionsLoading = false;
  goals: TrackedGoal[] = [];
  goalsLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: Projects,
    private sessionService: SessionService,
    private goalsService: GoalsService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private projectContext: ProjectContextService
  ) {}

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    
    // Extract domain from API_URL
    const apiUrl = environment.API_URL;
    this.trackerDomain = apiUrl.replace('/api', '');
    
    this.loadProject();
  }

  async loadProject() {
    const loading = await this.loadingController.create({
      message: 'Loading project...'
    });
    await loading.present();

    this.projectsService.getProjectById(this.projectId).subscribe({
      next: async (project: any) => {
        this.project = project;
        await this.projectContext.setActiveProject(project);
        this.generateInstallationSnippet();
        this.loadSessions();
        this.loadGoals();
        await loading.dismiss();
      },
      error: async (error: HttpErrorResponse) => {
        console.error('Error loading project:', error);
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Failed to load project',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  generateInstallationSnippet() {
    if (!this.project || !this.project.apiKey) {
      return;
    }

    this.installationSnippet = `<script>
(function(w,d,s,u,k,b){
  w.__trackerKey = k;
  w.__trackerBase = b;
  var js = d.createElement(s);
  js.async = true;
  js.src = u;
  var f = d.getElementsByTagName(s)[0];
  f.parentNode.insertBefore(js,f);
})(window, document, "script", 
   "${this.trackerDomain}/tracker.js", 
   "${this.project.apiKey}",
   "${this.trackerDomain}");
</script>`;
  }

  async copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      const toast = await this.toastController.create({
        message: `${label} copied to clipboard`,
        duration: 2000,
        color: 'success'
      });
      toast.present();
    } catch (error) {
      console.error('Failed to copy:', error);
      const toast = await this.toastController.create({
        message: 'Failed to copy to clipboard',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async checkInstallationStatus() {
    const loading = await this.loadingController.create({
      message: 'Checking status...'
    });
    await loading.present();

    this.projectsService.getProjectStatus(this.projectId).subscribe({
      next: async (status: ProjectStatus) => {
        this.status = status;
        await loading.dismiss();
      },
      error: async (error: HttpErrorResponse) => {
        console.error('Error checking status:', error);
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Failed to check installation status',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  getStatusBadge(): { color: string; text: string } {
    if (!this.status) {
      return { color: 'medium', text: 'Unknown' };
    }

    if (!this.status.installed) {
      return { color: 'danger', text: 'Not Installed' };
    }

    if (!this.status.lastSeen) {
      return { color: 'warning', text: 'Inactive' };
    }

    const now = new Date();
    const lastSeen = new Date(this.status.lastSeen);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < 5) {
      return { color: 'success', text: 'Connected' };
    } else if (diffMinutes > 24 * 60) {
      return { color: 'warning', text: 'Inactive' };
    } else {
      return { color: 'success', text: 'Connected' };
    }
  }

  loadSessions() {
    if (!this.projectId) return;
    this.sessionsLoading = true;
    this.sessionService.getProjectSessions(this.projectId).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.sessionsLoading = false;
      },
      error: () => {
        this.sessionsLoading = false;
      }
    });
  }

  get recentSessions(): ProjectSession[] {
    return this.sessions.slice(0, 5);
  }

  openReplay(sessionId: string) {
    this.router.navigate(['/replay', sessionId]);
  }

  openReplayFromCard(session: ProjectSession): void {
    if (session?.sessionId) {
      this.openReplay(session.sessionId);
    }
  }

  loadGoals(): void {
    if (!this.projectId) return;
    this.goalsLoading = true;
    this.goalsService.listGoals(this.projectId, 7).subscribe({
      next: (goals) => {
        this.goals = goals;
        this.goalsLoading = false;
      },
      error: () => {
        this.goalsLoading = false;
      },
    });
  }

  async presentAddGoal(template?: 'whatsapp'): Promise<void> {
    const alert = await this.alertController.create({
      header: template === 'whatsapp' ? 'Add WhatsApp goal' : 'Add conversion goal',
      message:
        'Track button clicks by adding data-wt-goal to your HTML, or use a CSS selector for auto-detection.',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Display name',
          value: template === 'whatsapp' ? 'WhatsApp button' : '',
        },
        {
          name: 'key',
          type: 'text',
          placeholder: 'Key (e.g. whatsapp)',
          value: template === 'whatsapp' ? 'whatsapp' : '',
        },
        {
          name: 'selector',
          type: 'text',
          placeholder: 'CSS selector (optional)',
          value:
            template === 'whatsapp'
              ? 'a[href*="wa.me"], a[href*="api.whatsapp.com"]'
              : '',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            void this.createGoal(data, template);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async createGoal(
    data: { name?: string; key?: string; selector?: string },
    template?: 'whatsapp'
  ): Promise<void> {
    const payload =
      template === 'whatsapp'
        ? { template: 'whatsapp' as const, name: data.name, key: data.key, selector: data.selector }
        : {
            name: data.name?.trim(),
            key: data.key?.trim(),
            selector: data.selector?.trim() || '',
          };

    this.goalsService.createGoal(this.projectId, payload).subscribe({
      next: async () => {
        this.loadGoals();
        const toast = await this.toastController.create({
          message: 'Goal created',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      },
      error: async (err: HttpErrorResponse) => {
        const toast = await this.toastController.create({
          message: err.error?.message || 'Could not create goal',
          duration: 3000,
          color: 'danger',
        });
        await toast.present();
      },
    });
  }

  async confirmDeleteGoal(goal: TrackedGoal): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete goal?',
      message: `"${goal.name}" will stop collecting new click data.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.goalsService.deleteGoal(this.projectId, goal.id).subscribe({
              next: () => this.loadGoals(),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  copyGoalSnippet(goal: TrackedGoal): void {
    void this.copyToClipboard(this.goalsService.goalSnippet(goal.key, goal.name), 'Goal snippet');
  }

  getLastSeenText(): string {
    if (!this.status || !this.status.lastSeen) {
      return 'Never';
    }

    const now = new Date();
    const lastSeen = new Date(this.status.lastSeen);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }
}
