import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { ProjectContextService, ProjectSummary } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-select-project',
  templateUrl: './select-project.page.html',
  styleUrls: ['./select-project.page.scss'],
  standalone: false,
})
export class SelectProjectPage implements OnInit {
  projects: ProjectSummary[] = [];
  filtered: ProjectSummary[] = [];
  searchQuery = '';
  loading = true;
  error = '';

  constructor(
    private projectContext: ProjectContextService,
    private router: Router,
    private menuCtrl: MenuController
  ) {}

  ngOnInit(): void {
    void this.menuCtrl.enable(false);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.projects = await this.projectContext.refreshProjects();
      this.applyFilter();
      if (this.projects.length === 0) {
        void this.router.navigate(['/projects'], { replaceUrl: true });
        return;
      }
      if (this.projects.length === 1) {
        await this.openProject(this.projects[0]);
        return;
      }
    } catch {
      this.error = 'Could not load projects. Try again.';
      this.projects = [];
      this.filtered = [];
    } finally {
      this.loading = false;
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = q
      ? this.projects.filter((p) => p.name.toLowerCase().includes(q))
      : [...this.projects];
  }

  async openProject(project: ProjectSummary): Promise<void> {
    await this.projectContext.setActiveProject(project);
    void this.router.navigate(['/folder', 'Home'], { replaceUrl: true });
  }

  goToProjects(): void {
    void this.router.navigate(['/projects']);
  }
}
