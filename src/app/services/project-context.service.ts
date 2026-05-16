import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Data } from './data';
import { Projects } from './projects';

export interface ProjectSummary {
  id: string;
  name: string;
}

export type PostLoginRoute = 'picker' | 'dashboard' | 'projects';

const STORAGE_KEY = 'active_project_id';

@Injectable({
  providedIn: 'root',
})
export class ProjectContextService {
  private readonly _activeProject = new BehaviorSubject<ProjectSummary | null>(null);
  readonly activeProject$ = this._activeProject.asObservable();

  private _projects: ProjectSummary[] = [];
  private _initialized = false;

  constructor(
    private data: Data,
    private projectsApi: Projects
  ) {}

  get activeProject(): ProjectSummary | null {
    return this._activeProject.value;
  }

  get activeProjectId(): string | null {
    return this._activeProject.value?.id ?? null;
  }

  get projects(): ProjectSummary[] {
    return this._projects;
  }

  async refreshProjects(): Promise<ProjectSummary[]> {
    try {
      const list = await firstValueFrom(this.projectsApi.getUserProjects());
      this._projects = (Array.isArray(list) ? list : []).map((p) => ({
        id: p._id,
        name: p.name || 'Untitled project',
      }));
    } catch {
      this._projects = [];
    }
    return this._projects;
  }

  async initFromStorage(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    await this.refreshProjects();
    const storedId = await this.data.get(STORAGE_KEY);
    if (!storedId || typeof storedId !== 'string') {
      this._activeProject.next(null);
      return;
    }
    const valid = this._projects.find((p) => p.id === storedId);
    if (valid) {
      this._activeProject.next(valid);
      return;
    }
    try {
      const project = await firstValueFrom(this.projectsApi.getProjectById(storedId));
      if (project?._id) {
        const summary: ProjectSummary = {
          id: project._id,
          name: project.name || 'Untitled project',
        };
        if (!this._projects.some((p) => p.id === summary.id)) {
          this._projects = [...this._projects, summary];
        }
        this._activeProject.next(summary);
        return;
      }
    } catch {
      // invalid stored project
    }
    await this.data.remove(STORAGE_KEY);
    this._activeProject.next(null);
  }

  async setActiveProject(project: ProjectSummary | { _id: string; name?: string }): Promise<void> {
    const summary: ProjectSummary = {
      id: '_id' in project ? project._id : project.id,
      name: project.name || 'Untitled project',
    };
    await this.data.add(STORAGE_KEY, summary.id);
    this._activeProject.next(summary);
    if (!this._projects.some((p) => p.id === summary.id)) {
      this._projects = [...this._projects, summary];
    }
  }

  async setActiveProjectById(projectId: string): Promise<boolean> {
    const fromList = this._projects.find((p) => p.id === projectId);
    if (fromList) {
      await this.setActiveProject(fromList);
      return true;
    }
    try {
      const project = await firstValueFrom(this.projectsApi.getProjectById(projectId));
      if (project?._id) {
        await this.setActiveProject(project);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  async clearActiveProject(): Promise<void> {
    await this.data.remove(STORAGE_KEY);
    this._activeProject.next(null);
    this._initialized = false;
  }

  /**
   * Call after login once projects are loaded.
   */
  resolveAfterLogin(): PostLoginRoute {
    if (this._projects.length === 0) {
      return 'projects';
    }
    if (this._projects.length === 1) {
      void this.setActiveProject(this._projects[0]);
      return 'dashboard';
    }
    if (this._activeProject.value) {
      return 'dashboard';
    }
    return 'picker';
  }

  hasActiveProject(): boolean {
    return !!this._activeProject.value?.id;
  }
}
