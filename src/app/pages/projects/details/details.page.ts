import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Projects, ProjectStatus } from 'src/app/services/projects';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';

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

  constructor(
    private route: ActivatedRoute,
    private projectsService: Projects,
    private toastController: ToastController,
    private loadingController: LoadingController
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
        this.generateInstallationSnippet();
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
